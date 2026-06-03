import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImagePlus, Pencil, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type Exercise = {
  id: string; name: string; primary_muscle: string; equipment: string;
  is_compound: boolean; instructions: string | null; tips: string | null;
  setup_notes: string | null; image_url: string | null; created_by: string | null;
};

type UserNote = {
  instructions: string | null; setup_notes: string | null; tips: string | null; image_url: string | null;
};

// Übungs-Detail mit PERSÖNLICHEN Notizen/Bildern: Die offizielle Übung bleibt unangetastet,
// jeder Nutzer überlagert sie mit eigenen Hinweisen/Bild (Tabelle exercise_user_notes).
// Mit stabilem `key` (=exercise.id) mounten, damit der Zustand beim Wechsel zurückgesetzt wird.
export function ExerciseDetail({ exercise, userId, editing, onEdit, onClose, onSaved }: {
  exercise: Exercise; userId: string | null; editing: boolean;
  onEdit: () => void; onClose: () => void; onSaved: () => void;
}) {
  const canEdit = !!userId; // jeder angemeldete Nutzer darf eigene Notizen pflegen
  const [note, setNote] = useState<UserNote | null>(null);
  const [instructions, setInstructions] = useState("");
  const [setupNotes, setSetupNotes] = useState("");
  const [tips, setTips] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null); // persönliches Bild (überschreibt offiziell)
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      const { data } = await supabase.from("exercise_user_notes")
        .select("instructions,setup_notes,tips,image_url")
        .eq("user_id", userId).eq("exercise_id", exercise.id).maybeSingle();
      if (!active) return;
      const n = (data ?? null) as UserNote | null;
      setNote(n);
      setInstructions(n?.instructions ?? "");
      setSetupNotes(n?.setup_notes ?? "");
      setTips(n?.tips ?? "");
      setImageUrl(n?.image_url ?? null);
    })();
    return () => { active = false; };
  }, [userId, exercise.id]);

  // Effektive Anzeige: persönlicher Wert, sonst offizieller.
  const effImage = imageUrl || exercise.image_url;
  const effInstr = (note?.instructions ?? null) || exercise.instructions;
  const effSetup = (note?.setup_notes ?? null) || exercise.setup_notes;
  const effTips = (note?.tips ?? null) || exercise.tips;

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
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("exercise_user_notes").upsert({
        user_id: userId, exercise_id: exercise.id,
        instructions: instructions || null,
        setup_notes: setupNotes || null,
        tips: tips || null,
        image_url: imageUrl,
      }, { onConflict: "user_id,exercise_id" });
      if (error) throw error;
      setNote({ instructions: instructions || null, setup_notes: setupNotes || null, tips: tips || null, image_url: imageUrl });
      toast.success("Gespeichert");
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-background/80 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="relative">
          {effImage ? (
            <img src={effImage} alt={exercise.name} className="h-56 w-full object-cover" />
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
              <p className="rounded-lg bg-muted px-3 py-2 text-[11px] text-muted-foreground">
                Deine persönlichen Notizen. Sie überlagern die offizielle Übung — leer lassen = offizielle Angabe nutzen.
              </p>
              <Field label="Ausführung" value={instructions} onChange={setInstructions} placeholder={exercise.instructions ?? "Wie wird die Übung korrekt ausgeführt?"} />
              <Field label="Maschinen-Einstellung / Setup" value={setupNotes} onChange={setSetupNotes} placeholder={exercise.setup_notes ?? "z.B. Sitzhöhe Loch 4, Polster auf Schienbeinhöhe…"} />
              <Field label="Tipps & Hinweise" value={tips} onChange={setTips} placeholder={exercise.tips ?? "z.B. Ellbogen eng am Körper, langsam senken…"} />
              <div className="flex gap-2 pt-1">
                <button onClick={save} disabled={saving || uploading} className="flex-1 rounded-xl bg-primary py-2.5 font-medium text-primary-foreground disabled:opacity-60">
                  {saving ? "Speichert…" : "Speichern"}
                </button>
                <button onClick={onClose} className="rounded-xl border border-border px-4">Abbrechen</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Section title="Ausführung" content={effInstr} />
              <Section title="Maschinen-Einstellung / Setup" content={effSetup} />
              <Section title="Tipps & Hinweise" content={effTips} />
              {!effInstr && !effSetup && !effTips && (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Noch keine Hinweise. Klicke auf „Bearbeiten" um eigene hinzuzufügen.
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
