import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { completeWorkout, getProgressionSuggestion } from "@/lib/api/workouts.functions";
import { elapsedSeconds, formatDuration } from "@/lib/workout-timer";
import { Check, Plus, Trash2, Timer, Sparkles, X, Pause, Play, ChevronLeft, SkipForward, Minus, Hourglass, Info, StickyNote, ImagePlus } from "lucide-react";
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
type Exercise = {
  id: string; name: string; primary_muscle: string; equipment: string; is_compound: boolean;
  instructions: string | null; setup_notes: string | null; tips: string | null; image_url: string | null;
};

function WorkoutLive() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const complete = useServerFn(completeWorkout);
  const getSuggestion = useServerFn(getProgressionSuggestion);
  const [elapsed, setElapsed] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Record<string, any>>({});
  const [rest, setRest] = useState<{ id: number; seconds: number; label: string } | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

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
      const { data } = await supabase.from("exercises")
        .select("id,name,primary_muscle,equipment,is_compound,instructions,setup_notes,tips,image_url").order("name");
      return (data ?? []) as Exercise[];
    },
  });

  // Geplante Pausenzeiten + Plan-Notizen aus der Vorlage (falls dieses Workout aus einer Vorlage gestartet wurde).
  const { data: templateMeta } = useQuery({
    queryKey: ["template-meta", workout?.template_id],
    enabled: !!workout?.template_id,
    queryFn: async () => {
      const { data } = await supabase.from("template_exercises")
        .select("exercise_id,rest_seconds,notes").eq("template_id", workout!.template_id!);
      return (data ?? []) as { exercise_id: string; rest_seconds: number | null; notes: string | null }[];
    },
  });
  const restByExercise = useMemo(
    () => Object.fromEntries((templateMeta ?? []).map(r => [r.exercise_id, r.rest_seconds])) as Record<string, number | null>,
    [templateMeta],
  );
  const planNoteByExercise = useMemo(
    () => Object.fromEntries((templateMeta ?? []).map(r => [r.exercise_id, r.notes])) as Record<string, string | null>,
    [templateMeta],
  );

  // Persönliche Notizen/Bilder des Nutzers (überlagern die offiziellen Übungsangaben).
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(r => setUserId(r.data.user?.id ?? null)); }, []);
  const { data: userNotes } = useQuery({
    queryKey: ["exercise-notes", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("exercise_user_notes")
        .select("exercise_id,instructions,setup_notes,tips,image_url").eq("user_id", userId!);
      return Object.fromEntries((data ?? []).map((n: any) => [n.exercise_id, n])) as Record<string, any>;
    },
  });
  const [openInfo, setOpenInfo] = useState<Record<string, boolean>>({});

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

  // Zusammengeführte Infos je Übung: persönliche Notiz/Bild, sonst offizielle Angabe.
  function infoFor(exId: string) {
    const ex = exById[exId]; const n = userNotes?.[exId];
    return {
      image: (n?.image_url ?? null) || ex?.image_url || null,
      instructions: (n?.instructions ?? null) || ex?.instructions || null,
      setup: (n?.setup_notes ?? null) || ex?.setup_notes || null,
      tips: (n?.tips ?? null) || ex?.tips || null,
    };
  }

  async function updateSet(s: Set, patch: Partial<Set>) {
    await supabase.from("workout_sets").update(patch).eq("id", s.id);
    refetchSets();
  }
  // Ändert einen Satz und übernimmt den geänderten Wert für die noch offenen
  // (späteren, nicht abgehakten) Sätze derselben Übung. Feldweise: Gewicht ändern
  // überträgt nur Gewicht, Wdh ändern nur Wdh.
  async function updateSetForward(s: Set, patch: Partial<Set>) {
    await supabase.from("workout_sets").update(patch).eq("id", s.id);
    const laterIds = (sets ?? [])
      .filter(x => x.exercise_id === s.exercise_id && x.id !== s.id
        && !x.is_completed && x.set_number > s.set_number)
      .map(x => x.id);
    if (laterIds.length) await supabase.from("workout_sets").update(patch).in("id", laterIds);
    refetchSets();
  }
  // Schlägt eine Pausenlänge vor: bevorzugt die in der Vorlage hinterlegte rest_seconds,
  // sonst nach Übungstyp (Grundübung = länger). Zwischen Übungen etwas mehr als zwischen Sätzen.
  function suggestRest(exerciseId: string, betweenSets: boolean): { seconds: number; label: string } {
    const ex = exById[exerciseId];
    const planned = restByExercise?.[exerciseId] ?? null;
    if (betweenSets) {
      const seconds = planned ?? (ex?.is_compound ? 150 : 90);
      return { seconds, label: "Pause bis zum nächsten Satz" };
    }
    const seconds = planned ? planned + 30 : ex?.is_compound ? 210 : 120;
    return { seconds, label: "Pause bis zur nächsten Übung" };
  }

  function ensureAudio() {
    if (audioRef.current) return audioRef.current;
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!Ctx) return null;
    audioRef.current = new Ctx();
    return audioRef.current;
  }
  function startRest(seconds: number, label: string) {
    ensureAudio()?.resume?.(); // im Klick-Kontext freigeben, damit der Ton später spielt
    setRest({ id: Date.now(), seconds: Math.max(5, Math.round(seconds)), label });
  }
  function playRestCue() {
    try { navigator.vibrate?.([200, 100, 200]); } catch {}
    const ctx = ensureAudio();
    if (!ctx) return;
    const beep = (at: number, freq: number) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + at;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.start(t); o.stop(t + 0.2);
    };
    ctx.resume?.(); beep(0, 880); beep(0.22, 1175);
  }

  async function toggleComplete(s: Set) {
    const nowCompleted = !s.is_completed;
    await updateSet(s, { is_completed: nowCompleted });
    if (!nowCompleted) return;
    // Pause vorschlagen: noch offene Sätze derselben Übung? -> Satzpause, sonst Übungspause.
    const exSets = (sets ?? []).filter(x => x.exercise_id === s.exercise_id);
    const moreSetsPending = exSets.some(x => x.id !== s.id && !x.is_completed);
    const { seconds, label } = suggestRest(s.exercise_id, moreSetsPending);
    startRest(seconds, label);
  }
  async function deleteSet(s: Set) { await supabase.from("workout_sets").delete().eq("id", s.id); refetchSets(); }
  async function removeLastSet(exerciseId: string) {
    const exSets = (sets ?? []).filter(x => x.exercise_id === exerciseId);
    if (exSets.length <= 1) return; // mind. 1 Satz behalten – ganze Übung via Papierkorb entfernen
    const last = exSets[exSets.length - 1];
    await supabase.from("workout_sets").delete().eq("id", last.id);
    refetchSets();
  }
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
    // Vorschlag + letzte Werte vorab holen, um den ersten Satz vorzubefüllen.
    let r: any = null;
    try { r = await getSuggestion({ data: { exerciseId } }); } catch {}
    const last = r?.lastSession;
    await supabase.from("workout_sets").insert({
      workout_id: id, exercise_id: exerciseId, user_id: user!.id,
      position: maxPos + 1, set_number: 1,
      reps: last?.reps ?? null, weight: last?.weight ?? null,
    });
    setShowAdd(false); setSearch("");
    if (r?.suggestion) setSuggestions(s => ({ ...s, [exerciseId]: r }));
    refetchSets();
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
    try {
      // Verknüpften Kalendertag wieder auf "geplant" zurücksetzen (workout_id wird per FK auf NULL gesetzt).
      await supabase.from("scheduled_workouts").update({ status: "planned" }).eq("workout_id", id);
      // Workout verwerfen: Sätze werden per ON DELETE CASCADE entfernt; zählt damit in keiner Wertung.
      const { error } = await supabase.from("workouts").delete().eq("id", id);
      if (error) throw error;
      toast.success("Training abgebrochen – nicht gewertet");
      navigate({ to: "/dashboard" });
    } catch (e: any) { toast.error(e.message); }
  }

  const completedSets = (sets ?? []).filter(s => s.is_completed).length;
  const totalSets = sets?.length ?? 0;
  const volume = (sets ?? []).filter(s => s.is_completed).reduce((sum, s) => sum + Number(s.weight ?? 0) * Number(s.reps ?? 0), 0);

  return (
    <div className="space-y-4 pb-32">
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <button onClick={() => navigate({ to: "/dashboard" })} title="Zurück (Training läuft weiter)"
                className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted"><ChevronLeft className="h-5 w-5" /></button>
              <div className="truncate text-lg font-bold">{workout?.name}</div>
              {isPaused && <span className="shrink-0 rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-500">Pausiert</span>}
            </div>
            <div className="flex shrink-0 gap-2">
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
          <div className="flex items-center justify-between gap-2 pl-1">
            <div className="flex min-w-0 gap-4 text-xs text-muted-foreground">
              <span className="flex shrink-0 items-center gap-1"><Timer className="h-3 w-3" />{formatDuration(elapsed)}</span>
              <span className="shrink-0">{completedSets}/{totalSets} Sätze</span>
              <span className="shrink-0">{Math.round(volume)} kg</span>
            </div>
            <button onClick={() => setConfirmCancel(true)}
              className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10">
              <X className="h-3.5 w-3.5" /> Abbrechen
            </button>
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
        const info = infoFor(exerciseId);
        const planNote = planNoteByExercise[exerciseId];
        const hasInfo = !!(info.instructions || info.setup || info.tips || info.image);
        const infoOpen = !!openInfo[exerciseId];
        return (
          <div key={exerciseId} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                {info.image && (
                  <img src={info.image} alt="" onClick={() => setOpenInfo(o => ({ ...o, [exerciseId]: !o[exerciseId] }))}
                    className="h-12 w-12 shrink-0 cursor-pointer rounded-lg object-cover" />
                )}
                <div className="min-w-0">
                  <div className="truncate font-bold">{ex?.name ?? "Übung"}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{ex?.primary_muscle}</div>
                </div>
              </div>
              {hasInfo && (
                <button onClick={() => setOpenInfo(o => ({ ...o, [exerciseId]: !o[exerciseId] }))}
                  className={`flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-xs ${infoOpen ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
                  <Info className="h-3.5 w-3.5" /> Info
                </button>
              )}
            </div>

            {planNote && (
              <div className="mb-2 flex items-start gap-2 rounded-lg border border-border bg-muted/60 p-2 text-xs">
                <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span><span className="font-semibold">Plan-Notiz:</span> {planNote}</span>
              </div>
            )}

            {infoOpen && hasInfo && (
              <div className="mb-2 space-y-2 rounded-lg border border-border bg-background p-3">
                {info.image ? (
                  <img src={info.image} alt={ex?.name ?? ""} className="max-h-56 w-full rounded-lg object-cover" />
                ) : (
                  <div className="grid h-24 w-full place-items-center rounded-lg bg-muted text-muted-foreground"><ImagePlus className="h-6 w-6" /></div>
                )}
                <InfoSection title="Ausführung" content={info.instructions} />
                <InfoSection title="Maschinen-Einstellung / Setup" content={info.setup} />
                <InfoSection title="Tipps & Hinweise" content={info.tips} />
              </div>
            )}

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
                  <input key={`w-${s.id}-${s.weight ?? ""}`} type="number" inputMode="decimal" defaultValue={s.weight ?? ""}
                    onBlur={(e) => updateSetForward(s, { weight: e.target.value ? Number(e.target.value) : null })}
                    className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-sm" placeholder="0" />
                  <input key={`r-${s.id}-${s.reps ?? ""}`} type="number" inputMode="numeric" defaultValue={s.reps ?? ""}
                    onBlur={(e) => updateSetForward(s, { reps: e.target.value ? Number(e.target.value) : null })}
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
              <button onClick={() => removeLastSet(exerciseId)} disabled={exSets.length <= 1}
                className="flex-1 rounded-lg border border-border bg-muted py-2 text-xs font-medium disabled:opacity-40">− Satz</button>
              <button onClick={() => exSets.forEach(deleteSet)} title="Übung entfernen"
                className="rounded-lg border border-border px-3 py-2 text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        );
      })}

      <div className="flex gap-2">
        <button onClick={() => setShowAdd(true)} className="flex-1 rounded-2xl border-2 border-dashed border-border py-4 text-sm font-medium text-muted-foreground">
          + Übung hinzufügen
        </button>
        <button onClick={() => startRest(90, "Pause")} title="Pause starten"
          className="flex items-center gap-1.5 rounded-2xl border-2 border-dashed border-border px-4 text-sm font-medium text-muted-foreground">
          <Hourglass className="h-4 w-4" /> Pause
        </button>
      </div>

      {rest && (
        <RestTimerBar
          key={rest.id}
          seconds={rest.seconds}
          label={rest.label}
          onDone={playRestCue}
          onClose={() => setRest(null)}
        />
      )}

      {confirmCancel && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-background/80 p-0 sm:items-center sm:p-4" onClick={() => setConfirmCancel(false)}>
          <div className="w-full max-w-sm rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Training abbrechen?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Das Training wird verworfen und geht in <span className="font-medium text-foreground">keine Wertung</span> ein (kein Volumen, keine PRs, kein Streak). Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirmCancel(false)} className="flex-1 rounded-xl border border-border py-2.5 font-medium">Weiter trainieren</button>
              <button onClick={() => { setConfirmCancel(false); cancel(); }} className="flex-1 rounded-xl bg-destructive py-2.5 font-bold text-destructive-foreground">Abbrechen & verwerfen</button>
            </div>
          </div>
        </div>
      )}

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

function InfoSection({ title, content }: { title: string; content: string | null }) {
  if (!content) return null;
  return (
    <div>
      <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <p className="whitespace-pre-wrap text-xs leading-relaxed">{content}</p>
    </div>
  );
}

// Schwebende Pausenuhr: zählt die vorgeschlagene Pause runter, mit Pause/Weiter,
// ±15 s und Überspringen. Beim Ablauf wird onDone (Ton/Vibration) ausgelöst.
function RestTimerBar({ seconds, label, onDone, onClose }: {
  seconds: number; label: string; onDone: () => void; onClose: () => void;
}) {
  const [total, setTotal] = useState(seconds);
  const [endsAt, setEndsAt] = useState(() => Date.now() + seconds * 1000);
  const [paused, setPaused] = useState(false);
  const [pausedRemaining, setPausedRemaining] = useState(seconds * 1000);
  const [remaining, setRemaining] = useState(seconds * 1000);
  const firedRef = useRef(false);

  useEffect(() => {
    if (paused) return;
    const tick = () => {
      const left = endsAt - Date.now();
      setRemaining(left);
      if (left <= 0 && !firedRef.current) { firedRef.current = true; onDone(); }
    };
    tick();
    const i = setInterval(tick, 250);
    return () => clearInterval(i);
  }, [endsAt, paused, onDone]);

  function adjust(deltaSec: number) {
    firedRef.current = false;
    setTotal(t => Math.max(5, t + deltaSec));
    if (paused) {
      setPausedRemaining(r => Math.max(0, r + deltaSec * 1000));
      setRemaining(r => Math.max(0, r + deltaSec * 1000));
    } else {
      setEndsAt(e => Math.max(Date.now(), e + deltaSec * 1000));
    }
  }
  function togglePause() {
    if (paused) { setEndsAt(Date.now() + pausedRemaining); setPaused(false); }
    else { setPausedRemaining(Math.max(0, remaining)); setPaused(true); }
  }

  const done = remaining <= 0;
  const secsLeft = Math.max(0, Math.ceil(remaining / 1000));
  const pct = Math.max(0, Math.min(100, (remaining / (total * 1000)) * 100));

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 px-4 md:bottom-6">
      <div className={`mx-auto max-w-md rounded-2xl border p-3 shadow-glow backdrop-blur ${done ? "border-success bg-success/15" : "border-primary/40 bg-card/95"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Timer className="h-3.5 w-3.5" />
            {done ? "Pause vorbei – los geht's! 💪" : label}
          </div>
          <button onClick={onClose} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
            <SkipForward className="h-3.5 w-3.5" /> {done ? "Schließen" : "Überspringen"}
          </button>
        </div>

        {!done && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-200 ease-linear" style={{ width: `${pct}%` }} />
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-3">
          <div className={`text-3xl font-extrabold tabular-nums ${done ? "text-success" : ""}`}>{formatDuration(secsLeft)}</div>
          {!done && (
            <div className="flex items-center gap-2">
              <button onClick={() => adjust(-15)} className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground"><Minus className="h-4 w-4" /></button>
              <button onClick={togglePause} className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground">
                {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
              <button onClick={() => adjust(15)} className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground"><Plus className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
