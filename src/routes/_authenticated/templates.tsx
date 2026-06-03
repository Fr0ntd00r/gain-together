import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startWorkout } from "@/lib/api/workouts.functions";
import { Plus, Pencil, Trash2, X, Play, Dumbbell, GripVertical, ChevronUp, ChevronDown, Info } from "lucide-react";
import { toast } from "sonner";
import { ExerciseDetail, type Exercise } from "@/components/exercise-detail";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({ meta: [{ title: "Trainingspläne — FitForge" }] }),
  component: Templates,
});

type PlanRow = {
  position: number; exercise_id: string;
  target_sets: number; target_reps: number; target_weight: number | null;
  notes: string | null;
};

function Templates() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const start = useServerFn(startWorkout);
  const [userId, setUserId] = useState<string | null>(null);
  const [editorId, setEditorId] = useState<string | null | undefined>(undefined); // undefined=closed, null=new, string=edit
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => { supabase.auth.getUser().then(r => setUserId(r.data.user?.id ?? null)); }, []);

  const { data: templates } = useQuery({
    queryKey: ["templates-page"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from("workout_templates")
        .select("id,name,description,category,difficulty,is_official,created_by, template_exercises(id)")
        .or(`is_official.eq.true,is_public.eq.true,created_by.eq.${user?.id}`)
        .order("is_official", { ascending: false });
      return data ?? [];
    },
  });

  async function startPlan(templateId?: string) {
    setStarting(templateId ?? "empty");
    try {
      const r = await start({ data: { templateId } });
      navigate({ to: "/workouts/$id", params: { id: r.workoutId } });
    } catch (e: any) { toast.error(e.message); setStarting(null); }
  }

  async function removePlan(id: string) {
    if (!confirm("Diesen Plan löschen?")) return;
    const { error } = await supabase.from("workout_templates").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Plan gelöscht");
    qc.invalidateQueries({ queryKey: ["templates-page"] });
    qc.invalidateQueries({ queryKey: ["all-templates"] });
  }

  const grouped = (templates ?? []).reduce((acc: any, t: any) => {
    const key = t.is_official ? "Offiziell" : t.category || "Eigene Pläne";
    (acc[key] ??= []).push(t); return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Trainingspläne</h1>
        <button onClick={() => setEditorId(null)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">
          <Plus className="h-4 w-4" /> Neuer Plan
        </button>
      </div>

      <p className="text-sm text-muted-foreground">
        Plane deine Trainings in Ruhe. Der Timer startet erst, wenn du auf „Starten" tippst.
      </p>

      {(templates ?? []).length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Noch keine Pläne. Erstelle deinen ersten Trainingsplan.
        </div>
      )}

      {Object.entries(grouped).map(([cat, ts]: [string, any]) => (
        <section key={cat}>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{cat}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {ts.map((t: any) => {
              const isOwner = t.created_by && t.created_by === userId;
              return (
                <div key={t.id} className="flex flex-col rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold">{t.name}</div>
                      {t.description && <div className="mt-1 text-xs text-muted-foreground">{t.description}</div>}
                    </div>
                    {t.is_official && <span className="shrink-0 rounded bg-primary/15 px-2 py-0.5 text-[10px] text-primary">OFFIZIELL</span>}
                  </div>
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    {t.template_exercises?.length ?? 0} Übungen{t.difficulty ? ` · ${t.difficulty}` : ""}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => startPlan(t.id)} disabled={starting !== null}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
                      <Play className="h-3.5 w-3.5" /> Starten
                    </button>
                    {isOwner && (
                      <>
                        <button onClick={() => setEditorId(t.id)} className="rounded-lg border border-border px-3 text-muted-foreground" title="Bearbeiten">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => removePlan(t.id)} className="rounded-lg border border-border px-3 text-muted-foreground" title="Löschen">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {editorId !== undefined && userId && (
        <PlanEditor
          templateId={editorId}
          userId={userId}
          onClose={() => setEditorId(undefined)}
          onSaved={() => {
            setEditorId(undefined);
            qc.invalidateQueries({ queryKey: ["templates-page"] });
            qc.invalidateQueries({ queryKey: ["all-templates"] });
          }}
        />
      )}
    </div>
  );
}

function PlanEditor({ templateId, userId, onClose, onSaved }: {
  templateId: string | null; userId: string; onClose: () => void; onSaved: () => void;
}) {
  const isNew = templateId === null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [detail, setDetail] = useState<{ exercise: Exercise; editing: boolean } | null>(null);

  const { data: allExercises } = useQuery({
    queryKey: ["all-exercises-plan"],
    queryFn: async () => {
      const { data } = await supabase.from("exercises")
        .select("id,name,primary_muscle,equipment,is_compound,instructions,tips,setup_notes,image_url,created_by")
        .order("name");
      return (data ?? []) as Exercise[];
    },
  });
  const exById = useMemo(() => Object.fromEntries((allExercises ?? []).map(e => [e.id, e])), [allExercises]);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data: t } = await supabase.from("workout_templates").select("*").eq("id", templateId).maybeSingle();
      if (t) {
        setName(t.name ?? ""); setDescription(t.description ?? "");
        setCategory(t.category ?? ""); setDifficulty((t.difficulty as any) ?? "beginner");
      }
      const { data: te } = await supabase.from("template_exercises")
        .select("exercise_id,position,target_sets,target_reps,target_weight,notes").eq("template_id", templateId).order("position");
      setRows((te ?? []).map((r: any) => ({
        position: r.position, exercise_id: r.exercise_id,
        target_sets: r.target_sets ?? 3, target_reps: r.target_reps ?? 10, target_weight: r.target_weight,
        notes: r.notes ?? null,
      })));
      setLoading(false);
    })();
  }, [templateId, isNew]);

  function addExercise(exerciseId: string) {
    setRows(r => [...r, { position: r.length, exercise_id: exerciseId, target_sets: 3, target_reps: 10, target_weight: null, notes: null }]);
    setPickerOpen(false); setSearch("");
  }
  function patchRow(i: number, patch: Partial<PlanRow>) {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, ...patch } : row));
  }
  function removeRow(i: number) { setRows(r => r.filter((_, idx) => idx !== i).map((row, idx) => ({ ...row, position: idx }))); }
  function move(i: number, dir: -1 | 1) {
    setRows(r => {
      const j = i + dir;
      if (j < 0 || j >= r.length) return r;
      const copy = [...r];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy.map((row, idx) => ({ ...row, position: idx }));
    });
  }

  async function save() {
    if (!name.trim()) { toast.error("Bitte gib dem Plan einen Namen."); return; }
    setSaving(true);
    try {
      let id = templateId;
      const payload = {
        name: name.trim(), description: description.trim() || null,
        category: category.trim() || null, difficulty,
      };
      if (isNew) {
        const { data, error } = await supabase.from("workout_templates")
          .insert({ ...payload, created_by: userId, is_public: false, is_official: false })
          .select("id").single();
        if (error || !data) throw new Error(error?.message ?? "Konnte Plan nicht erstellen");
        id = data.id;
      } else {
        const { error } = await supabase.from("workout_templates").update(payload).eq("id", id!);
        if (error) throw error;
        await supabase.from("template_exercises").delete().eq("template_id", id!);
      }
      if (rows.length > 0) {
        const { error } = await supabase.from("template_exercises").insert(
          rows.map((r, idx) => ({
            template_id: id!, exercise_id: r.exercise_id, position: idx,
            target_sets: r.target_sets, target_reps: r.target_reps, target_weight: r.target_weight,
            notes: r.notes?.trim() || null,
          }))
        );
        if (error) throw error;
      }
      toast.success(isNew ? "Plan erstellt" : "Plan gespeichert");
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-card sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-bold">{isNew ? "Neuer Trainingsplan" : "Plan bearbeiten"}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Lädt…</div>
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Name</span>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Push Day"
                className="w-full rounded-lg border border-border bg-input px-3 py-2" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Beschreibung (optional)</span>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Kategorie (optional)</span>
                <input value={category} onChange={e => setCategory(e.target.value)} placeholder="z.B. Oberkörper"
                  className="w-full rounded-lg border border-border bg-input px-3 py-2" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Schwierigkeit</span>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value as any)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2">
                  <option value="beginner">Anfänger</option>
                  <option value="intermediate">Fortgeschritten</option>
                  <option value="advanced">Profi</option>
                </select>
              </label>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">Übungen</span>
                <span className="text-xs text-muted-foreground">{rows.length}</span>
              </div>
              {rows.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Noch keine Übungen. Füge unten welche hinzu.
                </div>
              )}
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div key={i} className="rounded-xl border border-border bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{exById[row.exercise_id]?.name ?? "Übung"}</div>
                          <div className="text-[10px] uppercase text-muted-foreground">{exById[row.exercise_id]?.primary_muscle}</div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button onClick={() => move(i, -1)} className="rounded p-1 text-muted-foreground hover:bg-muted"><ChevronUp className="h-3.5 w-3.5" /></button>
                        <button onClick={() => move(i, 1)} className="rounded p-1 text-muted-foreground hover:bg-muted"><ChevronDown className="h-3.5 w-3.5" /></button>
                        <button onClick={() => removeRow(i)} className="rounded p-1 text-muted-foreground hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <NumField label="Sätze" value={row.target_sets} onChange={v => patchRow(i, { target_sets: v })} />
                      <NumField label="Wdh" value={row.target_reps} onChange={v => patchRow(i, { target_reps: v })} />
                      <NumField label="kg" value={row.target_weight} onChange={v => patchRow(i, { target_weight: v })} allowEmpty />
                    </div>
                    <input
                      value={row.notes ?? ""}
                      onChange={e => patchRow(i, { notes: e.target.value })}
                      placeholder="Notiz für diesen Plan (optional, z.B. langsam senken)"
                      className="mt-2 w-full rounded-lg border border-border bg-input px-3 py-2 text-xs" />
                    <button onClick={() => { const ex = exById[row.exercise_id]; if (ex) setDetail({ exercise: ex, editing: false }); }}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-xs text-muted-foreground hover:bg-muted">
                      <Info className="h-3.5 w-3.5" /> Bild & Hinweise zur Übung
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => setPickerOpen(true)}
                className="mt-2 w-full rounded-xl border-2 border-dashed border-border py-3 text-sm font-medium text-muted-foreground">
                + Übung hinzufügen
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-border p-4">
          <button onClick={save} disabled={saving || loading}
            className="w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
            {saving ? "Speichert…" : isNew ? "Plan erstellen" : "Speichern"}
          </button>
        </div>

        {pickerOpen && (
          <div className="absolute inset-0 z-10 flex flex-col bg-card" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-border p-3">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Übung suchen…" autoFocus
                className="w-full rounded-lg border border-border bg-input px-3 py-2" />
              <button onClick={() => setPickerOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {(allExercises ?? []).filter(e => e.name.toLowerCase().includes(search.toLowerCase())).slice(0, 80).map(e => (
                <div key={e.id} className="flex items-center gap-1 rounded-lg hover:bg-muted">
                  <button onClick={() => addExercise(e.id)} className="flex min-w-0 flex-1 items-center gap-2 p-3 text-left">
                    {e.image_url ? (
                      <img src={e.image_url} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
                    ) : (
                      <Dumbbell className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-medium">{e.name}</div>
                      <div className="text-[10px] uppercase text-muted-foreground">{e.primary_muscle} · {e.equipment}</div>
                    </div>
                  </button>
                  <button onClick={() => setDetail({ exercise: e, editing: false })} title="Bild & Hinweise"
                    className="mr-1 shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-background"><Info className="h-4 w-4" /></button>
                  <button onClick={() => addExercise(e.id)} title="Hinzufügen"
                    className="mr-2 shrink-0 rounded-lg p-2 text-primary hover:bg-background"><Plus className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

    {detail && (
      <ExerciseDetail
        key={detail.exercise.id}
        exercise={detail.exercise}
        userId={userId}
        editing={detail.editing}
        onEdit={() => setDetail(d => d && { ...d, editing: true })}
        onClose={() => setDetail(null)}
        onSaved={() => setDetail(d => d && { ...d, editing: false })}
      />
    )}
    </>
  );
}

function NumField({ label, value, onChange, allowEmpty }: {
  label: string; value: number | null; onChange: (v: any) => void; allowEmpty?: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <input type="number" inputMode="decimal" value={value ?? ""}
        onChange={e => onChange(e.target.value === "" ? (allowEmpty ? null : 0) : Number(e.target.value))}
        className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-sm" placeholder={allowEmpty ? "-" : "0"} />
    </label>
  );
}
