import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImagePlus, Pencil, X, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/exercises")({
  head: () => ({ meta: [{ title: "Übungen — FitForge" }] }),
  component: ExercisesPage,
});

const MUSCLES = ["all","chest","back","shoulders","biceps","triceps","quads","hamstrings","glutes","calves","core","full_body","cardio"];
const MUSCLE_OPTIONS = ["chest","back","shoulders","biceps","triceps","forearms","quads","hamstrings","glutes","calves","core","full_body","cardio"];
const EQUIPMENT_OPTIONS = ["barbell","dumbbell","machine","cable","bodyweight","kettlebell","bands","cardio_machine","other"];

type Exercise = {
  id: string; name: string; primary_muscle: string; equipment: string;
  is_compound: boolean; instructions: string | null; tips: string | null;
  setup_notes: string | null; image_url: string | null; created_by: string | null;
};

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

  const filtered = (data ?? []).filter(e => e.name.toLowerCase().includes(q.toLowerCase()));

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
        {filtered.map(e => (
          <button key={e.id} onClick={() => { setSelected(e); setEditing(false); }}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-primary">
            {e.image_url ? (
              <img src={e.image_url} alt={e.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <ImagePlus className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{e.name}</div>
              <div className="text-[10px] uppercase text-muted-foreground">{e.primary_muscle} · {e.equipment} {e.is_compound && "· compound"}</div>
              {e.instructions && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{e.instructions}</p>}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <ExerciseDetail
          exercise={selected}
          userId={userId}
          editing={editing}
          onEdit={() => setEditing(true)}
          onClose={() => { setSelected(null); setEditing(false); }}
          onSaved={async () => { await qc.invalidateQueries({ queryKey: ["exercises"] }); setEditing(false); const { data } = await supabase.from("exercises").select("*").eq("id", selected.id).maybeSingle(); if (data) setSelected(data as Exercise); }}
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

function ExerciseDetail({ exercise, userId, editing, onEdit, onClose, onSaved }: {
  exercise: Exercise; userId: string | null; editing: boolean;
  onEdit: () => void; onClose: () => void; onSaved: () => void;
}) {
  const canEdit = !!userId && exercise.created_by === userId; // only owner can edit
  const [instructions, setInstructions] = useState(exercise.instructions ?? "");
  const [setupNotes, setSetupNotes] = useState(exercise.setup_notes ?? "");
  const [tips, setTips] = useState(exercise.tips ?? "");
  const [imageUrl, setImageUrl] = useState(exercise.image_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleUpload(file: File) {
    if (!userId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${exercise.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("exercise-images").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage.from("exercise-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr) throw sErr;
      setImageUrl(signed.signedUrl);
      toast.success("Bild hochgeladen");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setUploading(false); }
  }

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase.from("exercises").update({
        instructions: instructions || null,
        setup_notes: setupNotes || null,
        tips: tips || null,
        image_url: imageUrl,
      }).eq("id", exercise.id);
      if (error) throw error;
      toast.success("Gespeichert");
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="relative">
          {imageUrl ? (
            <img src={imageUrl} alt={exercise.name} className="h-56 w-full object-cover" />
          ) : (
            <div className="grid h-40 w-full place-items-center bg-muted text-muted-foreground">
              <div className="text-center">
                <ImagePlus className="mx-auto h-8 w-8" />
                <div className="mt-1 text-xs">Kein Bild</div>
              </div>
            </div>
          )}
          <button onClick={onClose} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/80 backdrop-blur">
            <X className="h-4 w-4" />
          </button>
          {editing && canEdit && (
            <label className="absolute bottom-3 right-3 flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
              {uploading ? "Lädt…" : "Bild ändern"}
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            </label>
          )}
        </div>

        <div className="space-y-4 p-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{exercise.name}</h2>
                <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {exercise.primary_muscle} · {exercise.equipment} {exercise.is_compound && "· compound"}
                </div>
              </div>
              {!editing && canEdit && (
                <button onClick={onEdit} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs">
                  <Pencil className="h-3 w-3" /> Bearbeiten
                </button>
              )}
            </div>
          </div>

          {editing ? (
            <div className="space-y-3">
              <Field label="Ausführung" value={instructions} onChange={setInstructions} placeholder="Wie wird die Übung korrekt ausgeführt?" />
              <Field label="Maschinen-Einstellung / Setup" value={setupNotes} onChange={setSetupNotes} placeholder="z.B. Sitzhöhe Loch 4, Polster auf Schienbeinhöhe…" />
              <Field label="Tipps & Hinweise" value={tips} onChange={setTips} placeholder="z.B. Ellbogen eng am Körper, langsam senken…" />
              <div className="flex gap-2 pt-1">
                <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-primary py-2.5 font-medium text-primary-foreground disabled:opacity-60">
                  {saving ? "Speichert…" : "Speichern"}
                </button>
                <button onClick={onClose} className="rounded-xl border border-border px-4">Abbrechen</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Section title="Ausführung" content={exercise.instructions} />
              <Section title="Maschinen-Einstellung / Setup" content={exercise.setup_notes} />
              <Section title="Tipps & Hinweise" content={exercise.tips} />
              {!exercise.instructions && !exercise.setup_notes && !exercise.tips && (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Noch keine Hinweise. Klicke auf „Bearbeiten" um welche hinzuzufügen.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
        className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm" />
    </div>
  );
}

function Section({ title, content }: { title: string; content: string | null }) {
  if (!content) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
    </div>
  );
}
