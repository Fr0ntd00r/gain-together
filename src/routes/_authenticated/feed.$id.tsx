import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Trophy, Dumbbell, Award, Flame, Clock, Weight, ListChecks } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { formatDuration } from "@/lib/workout-timer";
import { LikeButton, Comments } from "@/components/feed-social";

export const Route = createFileRoute("/_authenticated/feed/$id")({
  head: () => ({ meta: [{ title: "Aktivität — FitForge" }] }),
  component: FeedDetail,
});

function FeedDetail() {
  const { id } = Route.useParams();

  const { data: item, isLoading } = useQuery({
    queryKey: ["feed-item", id],
    queryFn: async () => {
      const { data: row } = await supabase.from("activity_feed").select("*").eq("id", id).maybeSingle();
      if (!row) return null;
      const { data: prof } = await supabase.from("profiles")
        .select("id,username,display_name,avatar_url").eq("id", row.user_id).maybeSingle();
      return { ...row, profiles: prof } as any;
    },
  });

  const name = item?.profiles?.display_name ?? item?.profiles?.username ?? "Jemand";

  return (
    <div className="space-y-4">
      <Link to="/feed" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="h-4 w-4" /> Feed
      </Link>

      {isLoading && <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Lädt…</div>}
      {!isLoading && !item && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Diese Aktivität ist nicht (mehr) verfügbar.
        </div>
      )}

      {item && (
        <>
          <Header item={item} name={name} />

          {item.event_type === "workout_completed" && <WorkoutDetail workoutId={item.ref_id} data={item.data} />}
          {item.event_type === "personal_record" && <PrDetail data={item.data} />}
          {item.event_type === "achievement_unlocked" && <AchievementDetail achievementId={item.ref_id} data={item.data} />}
          {item.event_type === "challenge_completed" && <ChallengeDetail challengeId={item.ref_id} data={item.data} />}

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex gap-4 text-sm">
              <LikeButton feedId={item.id} />
            </div>
            <Comments feedId={item.id} />
          </div>
        </>
      )}
    </div>
  );
}

function Header({ item, name }: { item: any; name: string }) {
  const Icon = item.event_type === "personal_record" ? Trophy
    : item.event_type === "achievement_unlocked" ? Award
    : item.event_type === "challenge_completed" ? Flame
    : Dumbbell;
  const label = item.event_type === "workout_completed" ? "hat trainiert"
    : item.event_type === "personal_record" ? "hat einen Bestwert aufgestellt"
    : item.event_type === "achievement_unlocked" ? "hat ein Achievement freigeschaltet"
    : item.event_type === "challenge_completed" ? "hat eine Challenge abgeschlossen"
    : "";
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/15">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <div className="text-sm font-semibold">{name} {label}</div>
        <div className="text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: de })}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex-1 rounded-xl border border-border bg-card p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <div className="mt-1 text-sm font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function WorkoutDetail({ workoutId, data }: { workoutId: string | null; data: any }) {
  const { data: detail } = useQuery({
    enabled: !!workoutId,
    queryKey: ["feed-workout", workoutId],
    queryFn: async () => {
      const { data: workout } = await supabase.from("workouts")
        .select("name,started_at,finished_at,duration_seconds,total_volume").eq("id", workoutId!).maybeSingle();
      const { data: sets } = await supabase.from("workout_sets")
        .select("exercise_id,position,set_number,reps,weight,rpe,is_completed")
        .eq("workout_id", workoutId!).order("position").order("set_number");
      const list = (sets ?? []) as any[];
      const exIds = Array.from(new Set(list.map(s => s.exercise_id)));
      let exById: Record<string, any> = {};
      if (exIds.length) {
        const { data: exs } = await supabase.from("exercises").select("id,name,primary_muscle,equipment").in("id", exIds);
        exById = Object.fromEntries((exs ?? []).map((e: any) => [e.id, e]));
      }
      // Gruppieren je Übung in Reihenfolge der Position.
      const groups = new Map<string, any[]>();
      for (const s of list) {
        const arr = groups.get(s.exercise_id) ?? [];
        arr.push(s); groups.set(s.exercise_id, arr);
      }
      const grouped = Array.from(groups.entries())
        .sort((a, b) => (a[1][0]?.position ?? 0) - (b[1][0]?.position ?? 0))
        .map(([exId, exSets]) => ({ exercise: exById[exId], sets: exSets }));
      return { workout, grouped };
    },
  });

  const vol = Math.round(Number(detail?.workout?.total_volume ?? data?.volume ?? 0));
  const dur = detail?.workout?.duration_seconds ?? data?.duration ?? 0;
  const setCount = detail?.grouped?.reduce((n, g) => n + g.sets.length, 0) ?? data?.sets ?? 0;

  return (
    <div className="space-y-3">
      <div className="text-lg font-bold">{detail?.workout?.name ?? data?.name ?? "Workout"}</div>
      <div className="flex gap-2">
        <Stat icon={Weight} label="Volumen" value={`${vol} kg`} />
        <Stat icon={Clock} label="Dauer" value={dur ? formatDuration(dur) : "—"} />
        <Stat icon={ListChecks} label="Sätze" value={String(setCount)} />
      </div>

      {(detail?.grouped ?? []).map(({ exercise, sets }, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-baseline justify-between">
            <div className="font-semibold">{exercise?.name ?? "Übung"}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {exercise?.primary_muscle}{exercise?.equipment ? ` · ${exercise.equipment}` : ""}
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="grid grid-cols-[32px_1fr_1fr_44px] gap-2 px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              <div>Satz</div><div>kg</div><div>Wdh</div><div>RPE</div>
            </div>
            {sets.map((s: any) => (
              <div key={s.set_number} className={`grid grid-cols-[32px_1fr_1fr_44px] gap-2 rounded-lg px-1 py-1 text-sm ${s.is_completed ? "bg-success/10" : "opacity-60"}`}>
                <div className="font-bold">{s.set_number}</div>
                <div>{s.weight ?? "—"}</div>
                <div>{s.reps ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{s.rpe ?? "—"}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PrDetail({ data }: { data: any }) {
  const { data: ex } = useQuery({
    enabled: !!data?.exercise_id,
    queryKey: ["feed-pr-ex", data?.exercise_id],
    queryFn: async () => {
      const { data: e } = await supabase.from("exercises").select("name,primary_muscle,equipment").eq("id", data.exercise_id).maybeSingle();
      return e;
    },
  });
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center">
      <Trophy className="mx-auto h-8 w-8 text-primary" />
      <div className="mt-2 text-3xl font-extrabold">{Number(data?.value ?? 0).toFixed(1)} kg</div>
      <div className="mt-1 text-sm font-medium">{ex?.name ?? "Übung"}</div>
      {ex?.primary_muscle && <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{ex.primary_muscle} · neuer Bestwert</div>}
    </div>
  );
}

function AchievementDetail({ achievementId, data }: { achievementId: string | null; data: any }) {
  const { data: ach } = useQuery({
    enabled: !!achievementId,
    queryKey: ["feed-achievement", achievementId],
    queryFn: async () => {
      const { data: a } = await supabase.from("achievements").select("name,description,tier,icon").eq("id", achievementId!).maybeSingle();
      return a;
    },
  });
  const tier = ach?.tier ?? data?.tier;
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center">
      <div className="text-4xl">{ach?.icon ?? data?.icon ?? "🏅"}</div>
      <div className="mt-2 text-lg font-bold">{ach?.name ?? data?.name ?? "Achievement"}</div>
      {tier && <div className="mt-1 inline-block rounded-full bg-primary/15 px-3 py-0.5 text-[11px] font-medium uppercase tracking-wide text-primary">{tier}</div>}
      {ach?.description && <p className="mt-3 text-sm text-muted-foreground">{ach.description}</p>}
    </div>
  );
}

function ChallengeDetail({ challengeId, data }: { challengeId: string | null; data: any }) {
  const { data: ch } = useQuery({
    enabled: !!challengeId,
    queryKey: ["feed-challenge", challengeId],
    queryFn: async () => {
      const { data: c } = await supabase.from("challenges").select("name,description,metric,target_value,start_date,end_date").eq("id", challengeId!).maybeSingle();
      return c;
    },
  });
  const metricLabel: Record<string, string> = {
    workouts_count: "Workouts", total_volume: "Gesamtvolumen (kg)",
    total_duration: "Gesamtdauer (s)", exercise_volume: "Übungs-Volumen (kg)",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center">
      <Flame className="mx-auto h-8 w-8 text-primary" />
      <div className="mt-2 text-lg font-bold">{ch?.name ?? data?.name ?? "Challenge"}</div>
      {ch?.description && <p className="mt-2 text-sm text-muted-foreground">{ch.description}</p>}
      {ch?.metric && (
        <div className="mt-3 text-[12px] text-muted-foreground">
          Ziel: {ch.target_value ?? "—"} {metricLabel[ch.metric] ?? ch.metric}
        </div>
      )}
    </div>
  );
}
