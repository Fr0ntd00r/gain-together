import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImagePlus, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { ExerciseDetail, type Exercise } from "@/components/exercise-detail";

export const Route = createFileRoute("/_authenticated/exercises")({
  head: () => ({ meta: [{ title: "Übungen — FitForge" }] }),
  component: ExercisesPage,
});

const MUSCLES = ["all","chest","back","shoulders","biceps","triceps","quads","hamstrings","glutes","calves","core","full_body","cardio"];
const MUSCLE_OPTIONS = ["chest","back","shoulders","biceps","triceps","forearms","quads","hamstrings","glutes","calves","core","full_body","cardio"];
const EQUIPMENT_OPTIONS = ["barbell","dumbbell","machine","cable","bodyweight","kettlebell","bands","cardio_machine","other"];

function ExercisesPage() {
  const qc = useQueryClient();
  const [muscle, setMuscle] = useState("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => { supabase.auth.getUser().then(r => setUserId(r.data.user?.id ?? null)); }, []);

  const { data } = useQuery({
    queryKey: ["exercises", muscle],
    queryFn: async () => {
      let qry = supabase.from("exercises").select("*").order("name");
      if (muscle !== "all") qry = qry.eq("primary_muscle", muscle as any);
      const { data } = await qry;
      return (data ?? []) as Exercise[];
    },
  });

  // Persönliche Notizen/Bilder des Nutzers, um sie in der Liste über die offizielle Übung zu legen.
  const { data: notes } = useQuery({
    queryKey: ["exercise-notes", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("exercise_user_notes")
        .select("exercise_id,image_url,instructions").eq("user_id", userId!);
      return Object.fromEntries((data ?? []).map((n: any) => [n.exercise_id, n])) as Record<string, any>;
    },
  });

  const filtered = (data ?? []).filter(e => e.name.toLowerCase().includes(q.toLowerCase()));
  const noteFor = (id: string) => notes?.[id];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Übungen</h1>
        <button onClick={() => setCreating(true)} disabled={!userId}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
          <Plus className="h-4 w-4" /> Neue Übung
        </button>
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Suchen…" className="w-full rounded-xl border border-border bg-input px-4 py-2.5" />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {MUSCLES.map(m => (
          <button key={m} onClick={() => setMuscle(m)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs capitalize ${muscle === m ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>
            {m === "all" ? "Alle" : m}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(e => {
          const n = noteFor(e.id);
          const img = (n?.image_url ?? null) || e.image_url;
          const instr = (n?.instructions ?? null) || e.instructions;
          return (
            <button key={e.id} onClick={() => { setSelected(e); setEditing(false); }}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-primary">
              {img ? (
                <img src={img} alt={e.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <ImagePlus className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{e.name}</div>
                <div className="text-[10px] uppercase text-muted-foreground">{e.primary_muscle} · {e.equipment} {e.is_compound && "· compound"}</div>
                {instr && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{instr}</p>}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <ExerciseDetail
          key={selected.id}
          exercise={selected}
          userId={userId}
          editing={editing}
          onEdit={() => setEditing(true)}
          onClose={() => { setSelected(null); setEditing(false); }}
          onSaved={async () => { setEditing(false); await qc.invalidateQueries({ queryKey: ["exercise-notes"] }); }}
        />
      )}

      {creating && userId && (
        <CreateExercise
          userId={userId}
          onClose={() => setCreating(false)}
          onCreated={async (ex) => {
            setCreating(false);
            await qc.invalidateQueries({ queryKey: ["exercises"] });
            setSelected(ex); setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function CreateExercise({ userId, onClose, onCreated }: {
  userId: string; onClose: () => void; onCreated: (ex: Exercise) => void;
}) {
  const [name, setName] = useState("");
  const [primaryMuscle, setPrimaryMuscle] = useState("chest");
  const [equipment, setEquipment] = useState("barbell");
  const [isCompound, setIsCompound] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) { toast.error("Bitte gib einen Namen ein."); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.from("exercises").insert({
        name: name.trim(),
        primary_muscle: primaryMuscle as any,
        equipment: equipment as any,
        is_compound: isCompound,
        instructions: instructions.trim() || null,
        created_by: userId,
        is_public: true,
      }).select("*").single();
      if (error || !data) throw new Error(error?.message ?? "Konnte Übung nicht erstellen");
      toast.success("Übung erstellt");
      onCreated(data as Exercise);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border bg-card sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-bold">Neue Übung</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Name</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Bankdrücken eng"
              className="w-full rounded-lg border border-border bg-input px-3 py-2" autoFocus />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Muskelgruppe</span>
              <select value={primaryMuscle} onChange={e => setPrimaryMuscle(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 capitalize">
                {MUSCLE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Equipment</span>
              <select value={equipment} onChange={e => setEquipment(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 capitalize">
                {EQUIPMENT_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isCompound} onChange={e => setIsCompound(e.target.checked)} className="h-4 w-4" />
            Grundübung (compound)
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Ausführung (optional)</span>
            <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={3}
              placeholder="Wie wird die Übung ausgeführt?" className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="border-t border-border p-4">
          <button onClick={save} disabled={saving}
            className="w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
            {saving ? "Speichert…" : "Übung erstellen"}
          </button>
        </div>
      </div>
    </div>
  );
}
