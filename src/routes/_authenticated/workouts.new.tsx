import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startWorkout } from "@/lib/api/workouts.functions";
import { generateAIPlan } from "@/lib/api/ai.functions";
import { Sparkles, Zap, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workouts/new")({
  head: () => ({ meta: [{ title: "Workout starten — FitForge" }] }),
  component: NewWorkout,
});

function NewWorkout() {
  const navigate = useNavigate();
  const start = useServerFn(startWorkout);
  const aiGen = useServerFn(generateAIPlan);

  const { data: templates } = useQuery({
    queryKey: ["all-templates"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from("workout_templates")
        .select("id,name,description,category,difficulty,is_official,created_by")
        .or(`is_official.eq.true,created_by.eq.${user?.id}`)
        .order("is_official", { ascending: false }).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const [starting, setStarting] = useState<string | null>(null);

  async function go(templateId?: string) {
    setStarting(templateId ?? "empty");
    try {
      const r = await start({ data: { templateId } });
      navigate({ to: "/workouts/$id", params: { id: r.workoutId } });
    } catch (e: any) {
      toast.error(e.message); setStarting(null);
    }
  }

  // AI form
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [goal, setGoal] = useState("hypertrophy");
  const [level, setLevel] = useState("intermediate");
  const [days, setDays] = useState(4);
  const [equipment, setEquipment] = useState<string[]>(["barbell", "dumbbell", "machine", "cable", "bodyweight"]);

  async function runAi() {
    setAiLoading(true);
    try {
      const r = await aiGen({ data: { goal, level, daysPerWeek: days, equipment } });
      toast.success(`Plan "${r.planName}" mit ${r.templateIds.length} Tagen erstellt!`);
      setAiOpen(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setAiLoading(false); }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Workout starten</h1>

      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={() => go()} disabled={starting !== null}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left hover:border-primary disabled:opacity-50">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15"><Zap className="h-5 w-5 text-primary" /></div>
          <div>
            <div className="font-bold">Leeres Workout</div>
            <div className="text-xs text-muted-foreground">Übungen unterwegs hinzufügen</div>
          </div>
        </button>
        <button onClick={() => setAiOpen(v => !v)}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left hover:border-accent">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent/15"><Sparkles className="h-5 w-5 text-accent" /></div>
          <div>
            <div className="font-bold">KI-Coach</div>
            <div className="text-xs text-muted-foreground">Plan generieren lassen</div>
          </div>
        </button>
      </div>

      {aiOpen && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Ziel</span>
              <select value={goal} onChange={e => setGoal(e.target.value)} className="w-full rounded-lg border border-border bg-input px-3 py-2">
                <option value="strength">Kraft</option><option value="hypertrophy">Muskelaufbau</option>
                <option value="endurance">Ausdauer</option><option value="weight_loss">Abnehmen</option><option value="general_fitness">Fitness</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Level</span>
              <select value={level} onChange={e => setLevel(e.target.value)} className="w-full rounded-lg border border-border bg-input px-3 py-2">
                <option value="beginner">Anfänger</option><option value="intermediate">Fortgeschritten</option><option value="advanced">Profi</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Tage/Woche</span>
              <input type="number" min={1} max={7} value={days} onChange={e => setDays(Number(e.target.value))} className="w-full rounded-lg border border-border bg-input px-3 py-2" />
            </label>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Equipment</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {["barbell","dumbbell","machine","cable","bodyweight","kettlebell","bands","cardio_machine"].map(eq => (
                <button type="button" key={eq}
                  onClick={() => setEquipment(s => s.includes(eq) ? s.filter(x=>x!==eq) : [...s, eq])}
                  className={`rounded-full border px-3 py-1 text-xs ${equipment.includes(eq) ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>
                  {eq}
                </button>
              ))}
            </div>
          </div>
          <button onClick={runAi} disabled={aiLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-50">
            {aiLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Plan generieren
          </button>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2"><BookOpen className="h-4 w-4" /> Vorlagen</h2>
          <Link to="/templates" className="text-xs text-muted-foreground">Alle</Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {(templates ?? []).map(t => (
            <button key={t.id} onClick={() => go(t.id)} disabled={starting !== null}
              className="rounded-2xl border border-border bg-card p-4 text-left hover:border-primary disabled:opacity-50">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{t.name}</div>
                {t.is_official && <span className="rounded bg-primary/15 px-2 py-0.5 text-[10px] text-primary">OFFIZIELL</span>}
              </div>
              {t.description && <div className="mt-1 text-xs text-muted-foreground">{t.description}</div>}
              <div className="mt-2 flex gap-2 text-[10px] text-muted-foreground">
                {t.category && <span className="rounded bg-muted px-2 py-0.5">{t.category}</span>}
                {t.difficulty && <span className="rounded bg-muted px-2 py-0.5">{t.difficulty}</span>}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
