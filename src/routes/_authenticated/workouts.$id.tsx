import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { completeWorkout, getProgressionSuggestion } from "@/lib/api/workouts.functions";
import { elapsedSeconds, formatDuration } from "@/lib/workout-timer";
import { Check, Plus, Trash2, Timer, Sparkles, X, Pause, Play, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workouts/$id")({
  head: () => ({ meta: [{ title: "Workout — FitForge" }] }),
  component: WorkoutLive,
});

type Set = {
  id: string; workout_id: string; exercise_id: string; user_id: string;
  position: number; set_number: number; reps: number | null; weight: number | null;
  rpe: number | null; is_warmup: boolean; is_completed: boolean;
};
type Exercise = { id: string; name: string; primary_muscle: string; equipment: string; is_compound: boolean };

function WorkoutLive() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const complete = useServerFn(completeWorkout);
  const getSuggestion = useServerFn(getProgressionSuggestion);
  const [elapsed, setElapsed] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Record<string, any>>({});

  const { data: workout, refetch: refetchWorkout } = useQuery({
    queryKey: ["workout", id],
    queryFn: async () => {
      const { data } = await supabase.from("workouts").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: sets, refetch: refetchSets } = useQuery({
    queryKey: ["workout-sets", id],
    queryFn: async () => {
      const { data } = await supabase.from("workout_sets").select("*").eq("workout_id", id).order("position").order("set_number");
      return (data ?? []) as Set[];
    },
  });

  const { data: allExercises } = useQuery({
    queryKey: ["all-exercises"],
    queryFn: async () => {
      const { data } = await supabase.from("exercises").select("id,name,primary_muscle,equipment,is_compound").order("name");
      return (data ?? []) as Exercise[];
    },
  });

  const isPaused = !!workout?.is_paused;
  const isCompleted = !!workout?.is_completed;

  useEffect(() => {
    if (!workout) return;
    const tick = () => setElapsed(elapsedSeconds(workout));
    tick();
    if (isPaused || isCompleted) return; // frozen clock while paused/finished
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [workout, isPaused, isCompleted]);

  async function pause() {
    if (!workout) return;
    const banked = elapsedSeconds(workout); // freeze the current elapsed into the bank
    const { error } = await supabase.from("workouts")
      .update({ is_paused: true, accumulated_seconds: banked })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    await refetchWorkout();
  }
  async function resume() {
    const { error } = await supabase.from("workouts")
      .update({ is_paused: false, last_resumed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    await refetchWorkout();
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Set[]>();
    for (const s of sets ?? []) {
      const arr = map.get(s.exercise_id) ?? [];
      arr.push(s); map.set(s.exercise_id, arr);
    }
    return Array.from(map.entries()).sort((a, b) => (a[1][0]?.position ?? 0) - (b[1][0]?.position ?? 0));
  }, [sets]);

  const exById = useMemo(() => Object.fromEntries((allExercises ?? []).map(e => [e.id, e])), [allExercises]);

  async function updateSet(s: Set, patch: Partial<Set>) {
    await supabase.from("workout_sets").update(patch).eq("id", s.id);
    refetchSets();
  }
  async function toggleComplete(s: Set) { await updateSet(s, { is_completed: !s.is_completed }); }
  async function deleteSet(s: Set) { await supabase.from("workout_sets").delete().eq("id", s.id); refetchSets(); }
  async function addSet(exerciseId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const exSets = (sets ?? []).filter(x => x.exercise_id === exerciseId);
    const last = exSets[exSets.length - 1];
    const pos = exSets[0]?.position ?? (sets?.length ?? 0);
    await supabase.from("workout_sets").insert({
      workout_id: id, exercise_id: exerciseId, user_id: user!.id,
      position: pos, set_number: exSets.length + 1,
      reps: last?.reps ?? null, weight: last?.weight ?? null,
    });
    refetchSets();
  }
  async function addExercise(exerciseId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const maxPos = Math.max(-1, ...(sets ?? []).map(s => s.position));
    await supabase.from("workout_sets").insert({
      workout_id: id, exercise_id: exerciseId, user_id: user!.id,
      position: maxPos + 1, set_number: 1,
    });
    setShowAdd(false); setSearch("");
    refetchSets();
    // load progression suggestion
    try {
      const r = await getSuggestion({ data: { exerciseId } });
      if (r.suggestion) setSuggestions(s => ({ ...s, [exerciseId]: r }));
    } catch {}
  }

  async function loadSuggestionsForExisting() {
    for (const [exId] of grouped) {
      if (suggestions[exId]) continue;
      try {
        const r = await getSuggestion({ data: { exerciseId: exId } });
        if (r.suggestion) setSuggestions(s => ({ ...s, [exId]: r }));
      } catch {}
    }
  }
  useEffect(() => { if (grouped.length > 0) loadSuggestionsForExisting(); /* eslint-disable-next-line */ }, [grouped.length]);

  async function finish() {
    try {
      const r = await complete({ data: { workoutId: id } });
      toast.success(`Workout fertig! ${r.prs > 0 ? `${r.prs} neue PRs! ` : ""}Streak: ${r.streak}🔥`);
      qc.invalidateQueries();
      navigate({ to: "/dashboard" });
    } catch (e: any) { toast.error(e.message); }
  }
  async function cancel() {
    if (!confirm("Workout verwerfen?")) return;
    await supabase.from("workouts").delete().eq("id", id);
    navigate({ to: "/dashboard" });
  }

  const completedSets = (sets ?? []).filter(s => s.is_completed).length;
  const totalSets = sets?.length ?? 0;
  const volume = (sets ?? []).filter(s => s.is_completed).reduce((sum, s) => sum + Number(s.weight ?? 0) * Number(s.reps ?? 0), 0);

  return (
    <div className="space-y-4 pb-32">
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <button onClick={() => navigate({ to: "/dashboard" })} title="Zurück (Training läuft weiter)"
              className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted"><ChevronLeft className="h-5 w-5" /></button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="truncate text-lg font-bold">{workout?.name}</div>
                {isPaused && <span className="shrink-0 rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-500">Pausiert</span>}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Timer className="h-3 w-3" />{formatDuration(elapsed)}</span>
                <span>{completedSets}/{totalSets} Sätze</span>
                <span>{Math.round(volume)} kg</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button onClick={cancel} title="Verwerfen" className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
            {isPaused ? (
              <button onClick={resume} className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium">
                <Play className="h-4 w-4" /> Fortsetzen
              </button>
            ) : (
              <button onClick={pause} className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium">
                <Pause className="h-4 w-4" /> Pause
              </button>
            )}
            <button onClick={finish} className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground">Fertig</button>
          </div>
        </div>
      </div>

      {grouped.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Noch keine Übungen. Tippe unten auf "Übung hinzufügen".
        </div>
      )}

      {grouped.map(([exerciseId, exSets]) => {
        const ex = exById[exerciseId];
        const sug = suggestions[exerciseId];
        return (
          <div key={exerciseId} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="font-bold">{ex?.name ?? "Übung"}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{ex?.primary_muscle}</div>
              </div>
            </div>
            {sug?.suggestion && (
              <div className="mb-2 flex items-start gap-2 rounded-lg bg-primary/10 p-2 text-xs">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                <span className="text-primary">{sug.suggestion.text}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <div className="grid grid-cols-[28px_1fr_1fr_44px_36px] gap-2 px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <div>Set</div><div>kg</div><div>Wdh</div><div>RPE</div><div></div>
              </div>
              {exSets.map(s => (
                <div key={s.id} className={`grid grid-cols-[28px_1fr_1fr_44px_36px] items-center gap-2 rounded-lg px-1 py-1 ${s.is_completed ? "bg-success/10" : ""}`}>
                  <div className="text-sm font-bold">{s.set_number}</div>
                  <input type="number" inputMode="decimal" defaultValue={s.weight ?? ""}
                    onBlur={(e) => updateSet(s, { weight: e.target.value ? Number(e.target.value) : null })}
                    className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-sm" placeholder="0" />
                  <input type="number" inputMode="numeric" defaultValue={s.reps ?? ""}
                    onBlur={(e) => updateSet(s, { reps: e.target.value ? Number(e.target.value) : null })}
                    className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-sm" placeholder="0" />
                  <input type="number" step="0.5" inputMode="decimal" defaultValue={s.rpe ?? ""}
                    onBlur={(e) => updateSet(s, { rpe: e.target.value ? Number(e.target.value) : null })}
                    className="w-full rounded-md border border-border bg-input px-1.5 py-1.5 text-xs" placeholder="-" />
                  <button onClick={() => toggleComplete(s)}
                    className={`grid h-8 w-8 place-items-center rounded-md ${s.is_completed ? "bg-success text-success-foreground" : "bg-muted"}`}>
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => addSet(exerciseId)} className="flex-1 rounded-lg border border-border bg-muted py-2 text-xs font-medium">+ Satz</button>
              <button onClick={() => exSets.forEach(deleteSet)} className="rounded-lg border border-border px-3 py-2 text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        );
      })}

      <button onClick={() => setShowAdd(true)} className="w-full rounded-2xl border-2 border-dashed border-border py-4 text-sm font-medium text-muted-foreground">
        + Übung hinzufügen
      </button>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 sm:items-center sm:p-4" onClick={() => setShowAdd(false)}>
          <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-t-3xl border border-border bg-card sm:rounded-3xl" onClick={e => e.stopPropagation()}>
            <div className="border-b border-border p-3">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Übung suchen…"
                className="w-full rounded-lg border border-border bg-input px-3 py-2" autoFocus />
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {(allExercises ?? []).filter(e => e.name.toLowerCase().includes(search.toLowerCase())).slice(0, 50).map(e => (
                <button key={e.id} onClick={() => addExercise(e.id)} className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-muted">
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-[10px] uppercase text-muted-foreground">{e.primary_muscle} · {e.equipment}</div>
                  </div>
                  <Plus className="h-4 w-4 text-primary" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
