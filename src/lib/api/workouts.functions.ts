import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Get dashboard summary: recent workouts, PR count, streak, today's workouts
export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [profile, recentWorkouts, prs, achievements, totalVolume] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("workouts").select("id,name,started_at,finished_at,duration_seconds,total_volume,is_completed").eq("user_id", userId).order("started_at", { ascending: false }).limit(5),
      supabase.from("personal_records").select("id,record_type,value,achieved_at,exercise_id, exercises(name)").eq("user_id", userId).order("achieved_at", { ascending: false }).limit(3),
      supabase.from("user_achievements").select("achievement_id, achievements(name,icon,tier)").eq("user_id", userId).order("unlocked_at", { ascending: false }).limit(4),
      supabase.from("workouts").select("total_volume").eq("user_id", userId).eq("is_completed", true),
    ]);
    const totalVol = (totalVolume.data ?? []).reduce((s: number, w: any) => s + Number(w.total_volume ?? 0), 0);
    const workoutsThisWeek = (recentWorkouts.data ?? []).filter((w: any) => {
      const d = new Date(w.started_at);
      const week = Date.now() - 7 * 86400000;
      return d.getTime() > week && w.is_completed;
    }).length;
    return {
      profile: profile.data,
      recentWorkouts: recentWorkouts.data ?? [],
      prs: prs.data ?? [],
      achievements: achievements.data ?? [],
      totalVolume: totalVol,
      workoutsThisWeek,
    };
  });

// Start a new workout from template or empty
export const startWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { templateId?: string; name?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let name = data.name ?? "Quick Workout";
    let templateId = data.templateId ?? null;
    let templateExercises: any[] = [];
    if (templateId) {
      const { data: tmpl } = await supabase.from("workout_templates").select("name").eq("id", templateId).maybeSingle();
      if (tmpl) name = tmpl.name;
      const { data: te } = await supabase.from("template_exercises").select("*").eq("template_id", templateId).order("position");
      templateExercises = te ?? [];
    }
    const { data: w, error } = await supabase.from("workouts").insert({
      user_id: userId, name, template_id: templateId, started_at: new Date().toISOString(),
    }).select("id").single();
    if (error || !w) throw new Error(error?.message ?? "Konnte Workout nicht starten");
    // Seed empty sets from template
    if (templateExercises.length > 0) {
      const sets: any[] = [];
      let pos = 0;
      for (const te of templateExercises) {
        for (let s = 1; s <= (te.target_sets ?? 3); s++) {
          sets.push({
            workout_id: w.id, exercise_id: te.exercise_id, user_id: userId,
            position: pos, set_number: s, reps: te.target_reps, weight: te.target_weight,
          });
        }
        pos++;
      }
      await supabase.from("workout_sets").insert(sets);
    }
    return { workoutId: w.id };
  });

// Complete workout: aggregate volume, detect PRs, write feed entry, update streak, check achievements
export const completeWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workoutId: string }) => z.object({ workoutId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: workout } = await supabase.from("workouts").select("*").eq("id", data.workoutId).eq("user_id", userId).maybeSingle();
    if (!workout) throw new Error("Workout nicht gefunden");
    const { data: sets } = await supabase.from("workout_sets").select("*").eq("workout_id", data.workoutId).eq("is_completed", true);
    const completedSets = sets ?? [];
    const totalVolume = completedSets.reduce((s, x: any) => s + Number(x.weight ?? 0) * Number(x.reps ?? 0), 0);
    const startedAt = new Date(workout.started_at);
    const finishedAt = new Date();
    const duration = Math.floor((finishedAt.getTime() - startedAt.getTime()) / 1000);

    await supabase.from("workouts").update({
      finished_at: finishedAt.toISOString(),
      duration_seconds: duration,
      total_volume: totalVolume,
      is_completed: true,
    }).eq("id", data.workoutId);

    // PR detection per exercise
    const byExercise = new Map<string, any[]>();
    for (const s of completedSets) {
      const arr = byExercise.get(s.exercise_id) ?? [];
      arr.push(s); byExercise.set(s.exercise_id, arr);
    }
    const newPRs: any[] = [];
    for (const [exerciseId, exSets] of byExercise) {
      const maxWeight = Math.max(...exSets.map((s: any) => Number(s.weight ?? 0)));
      const maxVolume = exSets.reduce((s, x: any) => s + Number(x.weight ?? 0) * Number(x.reps ?? 0), 0);
      const best1RM = Math.max(...exSets.map((s: any) => {
        const w = Number(s.weight ?? 0); const r = Number(s.reps ?? 0);
        return r > 0 ? w * (1 + r / 30) : 0; // Epley
      }));
      const checks: Array<[string, number]> = [
        ["max_weight", maxWeight],
        ["max_volume", maxVolume],
        ["1rm", best1RM],
      ];
      for (const [type, val] of checks) {
        if (val <= 0) continue;
        const { data: existing } = await supabase.from("personal_records")
          .select("value").eq("user_id", userId).eq("exercise_id", exerciseId).eq("record_type", type).maybeSingle();
        if (!existing || Number(existing.value) < val) {
          await supabase.from("personal_records").upsert({
            user_id: userId, exercise_id: exerciseId, record_type: type, value: val,
            workout_id: data.workoutId, achieved_at: finishedAt.toISOString(),
          }, { onConflict: "user_id,exercise_id,record_type" });
          if (type === "max_weight") newPRs.push({ exerciseId, value: val });
        }
      }
    }

    // Streak update
    const today = finishedAt.toISOString().slice(0, 10);
    const { data: prof } = await supabase.from("profiles").select("current_streak,longest_streak,last_workout_date").eq("id", userId).maybeSingle();
    let cs = prof?.current_streak ?? 0;
    if (prof?.last_workout_date) {
      const last = prof.last_workout_date as unknown as string;
      const diffDays = Math.floor((Date.parse(today) - Date.parse(last)) / 86400000);
      cs = diffDays === 0 ? cs : diffDays === 1 ? cs + 1 : 1;
    } else cs = 1;
    const ls = Math.max(prof?.longest_streak ?? 0, cs);
    await supabase.from("profiles").update({ current_streak: cs, longest_streak: ls, last_workout_date: today }).eq("id", userId);

    // Feed entry
    await supabase.from("activity_feed").insert({
      user_id: userId, event_type: "workout_completed", ref_id: data.workoutId,
      data: { name: workout.name, volume: totalVolume, duration, sets: completedSets.length, prs: newPRs.length },
    });
    for (const pr of newPRs) {
      await supabase.from("activity_feed").insert({
        user_id: userId, event_type: "personal_record", ref_id: data.workoutId, data: { exercise_id: pr.exerciseId, value: pr.value },
      });
    }

    // Achievement check
    await checkAndAwardAchievements(supabase, userId);
    // Update challenge progress
    await updateChallengeProgress(supabase, userId);

    return { ok: true, volume: totalVolume, prs: newPRs.length, streak: cs };
  });

async function checkAndAwardAchievements(supabase: any, userId: string) {
  const [{ data: achievements }, { count: workoutCount }, { count: prCount }, { count: friendsCount }, { data: profile }] = await Promise.all([
    supabase.from("achievements").select("*"),
    supabase.from("workouts").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_completed", true),
    supabase.from("personal_records").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("friendships").select("id", { count: "exact", head: true }).or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).eq("status", "accepted"),
    supabase.from("profiles").select("current_streak").eq("id", userId).maybeSingle(),
  ]);
  const { data: volSum } = await supabase.from("workouts").select("total_volume").eq("user_id", userId).eq("is_completed", true);
  const totalVol = (volSum ?? []).reduce((s: number, w: any) => s + Number(w.total_volume ?? 0), 0);
  const { data: already } = await supabase.from("user_achievements").select("achievement_id").eq("user_id", userId);
  const have = new Set((already ?? []).map((a: any) => a.achievement_id));

  for (const a of achievements ?? []) {
    if (have.has(a.id)) continue;
    const c = a.criteria ?? {};
    let unlock = false;
    if (c.type === "workout_count") unlock = (workoutCount ?? 0) >= c.value;
    else if (c.type === "pr_count") unlock = (prCount ?? 0) >= c.value;
    else if (c.type === "friends_count") unlock = (friendsCount ?? 0) >= c.value;
    else if (c.type === "streak") unlock = (profile?.current_streak ?? 0) >= c.value;
    else if (c.type === "volume") unlock = totalVol >= c.value;
    if (unlock) {
      await supabase.from("user_achievements").insert({ user_id: userId, achievement_id: a.id });
      await supabase.from("activity_feed").insert({
        user_id: userId, event_type: "achievement_unlocked", ref_id: a.id,
        data: { name: a.name, tier: a.tier, icon: a.icon },
      });
    }
  }
}

async function updateChallengeProgress(supabase: any, userId: string) {
  const { data: parts } = await supabase.from("challenge_participants").select("*, challenges(*)").eq("user_id", userId).eq("is_completed", false);
  for (const p of parts ?? []) {
    const ch = p.challenges;
    if (!ch) continue;
    let value = 0;
    const { data: ws } = await supabase.from("workouts").select("total_volume,duration_seconds,started_at").eq("user_id", userId).eq("is_completed", true)
      .gte("started_at", ch.start_date).lte("started_at", `${ch.end_date}T23:59:59`);
    if (ch.metric === "workouts_count") value = (ws ?? []).length;
    else if (ch.metric === "total_volume") value = (ws ?? []).reduce((s: number, w: any) => s + Number(w.total_volume ?? 0), 0);
    else if (ch.metric === "total_duration") value = (ws ?? []).reduce((s: number, w: any) => s + Number(w.duration_seconds ?? 0), 0);
    const completed = ch.target_value ? value >= Number(ch.target_value) : false;
    await supabase.from("challenge_participants").update({ current_value: value, is_completed: completed }).eq("id", p.id);
    if (completed) {
      await supabase.from("activity_feed").insert({
        user_id: userId, event_type: "challenge_completed", ref_id: ch.id, data: { name: ch.name },
      });
    }
  }
}

// Progression suggestions for an exercise based on last sessions
export const getProgressionSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { exerciseId: string }) => z.object({ exerciseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ex } = await supabase.from("exercises").select("is_compound").eq("id", data.exerciseId).maybeSingle();
    const { data: sets } = await supabase.from("workout_sets").select("weight,reps,is_completed,created_at")
      .eq("user_id", userId).eq("exercise_id", data.exerciseId).eq("is_completed", true)
      .order("created_at", { ascending: false }).limit(20);
    const recent = sets ?? [];
    if (recent.length === 0) return { suggestion: null };
    // Last session = sets within most recent date
    const lastDay = new Date(recent[0].created_at).toISOString().slice(0, 10);
    const lastSession = recent.filter(s => new Date(s.created_at).toISOString().slice(0, 10) === lastDay);
    const topWeight = Math.max(...lastSession.map((s: any) => Number(s.weight ?? 0)));
    const targetReps = Math.max(...lastSession.map((s: any) => Number(s.reps ?? 0)));
    const allHitTarget = lastSession.every((s: any) => Number(s.reps ?? 0) >= targetReps);
    const inc = ex?.is_compound ? 2.5 : 1;
    let recommendation: { action: string; weight: number; reps: number; text: string };
    if (allHitTarget && lastSession.length >= 3) {
      recommendation = { action: "increase_weight", weight: topWeight + inc, reps: targetReps,
        text: `Top! Probier' ${topWeight + inc} kg × ${targetReps} Wdh beim nächsten Mal.` };
    } else {
      recommendation = { action: "same_weight", weight: topWeight, reps: targetReps + 1,
        text: `Bleib bei ${topWeight} kg, ziel auf ${targetReps + 1} Wdh.` };
    }
    return { suggestion: recommendation, lastSession: { weight: topWeight, reps: targetReps, sets: lastSession.length } };
  });
