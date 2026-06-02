import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Plus, Users, Calendar, Target } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/challenges")({
  head: () => ({ meta: [{ title: "Challenges — FitForge" }] }),
  component: ChallengesPage,
});

function ChallengesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const { data: me } = useQuery({ queryKey: ["self-user"], queryFn: async () => (await supabase.auth.getUser()).data.user });
  const { data: challenges } = useQuery({
    queryKey: ["challenges-list"],
    queryFn: async () => {
      const { data } = await supabase.from("challenges")
        .select("*, challenge_participants(id,user_id,current_value,is_completed)")
        .gte("end_date", today).order("end_date");
      return data ?? [];
    },
  });

  async function join(challengeId: string) {
    if (!me) return;
    const { error } = await supabase.from("challenge_participants").insert({ challenge_id: challengeId, user_id: me.id });
    if (error) toast.error(error.message); else { toast.success("Beigetreten!"); qc.invalidateQueries(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Challenges</h1>
        <button onClick={() => setShowCreate(s => !s)} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4" /></button>
      </div>

      {showCreate && <CreateChallenge onDone={() => { setShowCreate(false); qc.invalidateQueries(); }} />}

      <div className="space-y-3">
        {(challenges ?? []).length === 0 && <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Keine aktiven Challenges.</div>}
        {(challenges ?? []).map((c: any) => {
          const joined = (c.challenge_participants ?? []).some((p: any) => p.user_id === me?.id);
          const myProgress = (c.challenge_participants ?? []).find((p: any) => p.user_id === me?.id);
          const pct = c.target_value && myProgress ? Math.min(100, (Number(myProgress.current_value) / Number(c.target_value)) * 100) : 0;
          return (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    <div className="font-bold">{c.name}</div>
                  </div>
                  {c.description && <div className="mt-1 text-xs text-muted-foreground">{c.description}</div>}
                  <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(c.start_date), "d.M.")} – {format(new Date(c.end_date), "d.M.")}</span>
                    <span className="flex items-center gap-1"><Target className="h-3 w-3" />{c.target_value} ({metricLabel(c.metric)})</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.challenge_participants?.length ?? 0}</span>
                  </div>
                </div>
                {!joined && (
                  <button onClick={() => join(c.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">Beitreten</button>
                )}
              </div>
              {joined && (
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>{Number(myProgress?.current_value ?? 0).toLocaleString("de-DE")} / {Number(c.target_value).toLocaleString("de-DE")}</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}
              <Leaderboard participants={c.challenge_participants ?? []} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function metricLabel(m: string) {
  return ({ workouts_count: "Workouts", total_volume: "kg Volumen", total_duration: "Sekunden", exercise_volume: "Volumen" } as any)[m] ?? m;
}

function Leaderboard({ participants }: any) {
  const { data: profiles } = useQuery({
    queryKey: ["lb-profiles", participants.map((p: any) => p.user_id).join(",")],
    enabled: participants.length > 0,
    queryFn: async () => {
      const ids = participants.map((p: any) => p.user_id);
      const { data } = await supabase.from("profiles").select("id,username,display_name").in("id", ids);
      return Object.fromEntries((data ?? []).map((p: any) => [p.id, p]));
    },
  });
  const top = [...participants].sort((a, b) => Number(b.current_value) - Number(a.current_value)).slice(0, 5);
  if (top.length === 0) return null;
  return (
    <div className="mt-3 space-y-1 border-t border-border pt-3">
      {top.map((p, i) => (
        <div key={p.id} className="flex items-center justify-between text-xs">
          <span><span className="mr-2 inline-block w-4 text-muted-foreground">{i + 1}.</span> @{profiles?.[p.user_id]?.username ?? "…"}</span>
          <span className="font-medium">{Number(p.current_value).toLocaleString("de-DE")}</span>
        </div>
      ))}
    </div>
  );
}

function CreateChallenge({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metric, setMetric] = useState("workouts_count");
  const [target, setTarget] = useState(30);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("challenges").insert({
      name, description, metric, target_value: target,
      start_date: new Date().toISOString().slice(0, 10), end_date: endDate,
      created_by: user!.id, is_public: true,
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    await supabase.from("challenge_participants").insert({ challenge_id: data!.id, user_id: user!.id });
    toast.success("Challenge erstellt!");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Challenge-Name" className="w-full rounded-lg border border-border bg-input px-3 py-2" />
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Beschreibung" className="w-full rounded-lg border border-border bg-input px-3 py-2" />
      <div className="grid grid-cols-2 gap-2">
        <select value={metric} onChange={e => setMetric(e.target.value)} className="rounded-lg border border-border bg-input px-3 py-2">
          <option value="workouts_count">Anzahl Workouts</option>
          <option value="total_volume">Gesamt-Volumen (kg)</option>
          <option value="total_duration">Gesamt-Dauer (Sek)</option>
        </select>
        <input type="number" required value={target} onChange={e => setTarget(Number(e.target.value))} placeholder="Ziel" className="rounded-lg border border-border bg-input px-3 py-2" />
      </div>
      <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full rounded-lg border border-border bg-input px-3 py-2" />
      <button type="submit" className="w-full rounded-xl bg-gradient-primary px-4 py-2.5 font-bold text-primary-foreground">Erstellen</button>
    </form>
  );
}
