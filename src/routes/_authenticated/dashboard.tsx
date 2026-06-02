import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard } from "@/lib/api/workouts.functions";
import { Flame, Trophy, TrendingUp, Plus, Calendar, Award } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — FitForge" }] }),
  component: Dashboard,
});

function Dashboard() {
  const fetchDashboard = useServerFn(getDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDashboard() });
  const qc = useQueryClient();

  if (isLoading) return <div className="grid gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-card" />)}</div>;
  if (!data) return null;

  const p = data.profile;
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Hi, {p?.display_name ?? p?.username}</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Bereit zum Training?</h1>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Flame} label="Streak" value={`${p?.current_streak ?? 0}🔥`} sub={`Best ${p?.longest_streak ?? 0}`} />
        <Stat icon={Calendar} label="Diese Woche" value={`${data.workoutsThisWeek}`} sub="Workouts" />
        <Stat icon={TrendingUp} label="Volumen" value={`${formatVolume(data.totalVolume)}`} sub="gesamt" />
      </div>

      <Link to="/workouts/new" className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-primary p-5 shadow-glow">
        <div>
          <div className="text-sm font-medium text-primary-foreground/80">Heute</div>
          <div className="text-xl font-bold text-primary-foreground">Workout starten</div>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary-foreground/15">
          <Plus className="h-6 w-6 text-primary-foreground" />
        </div>
      </Link>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Letzte Workouts</h2>
          <Link to="/history" className="text-xs text-muted-foreground">Alle ansehen</Link>
        </div>
        <div className="space-y-2">
          {data.recentWorkouts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Noch keine Workouts. Starte dein erstes!
            </div>
          )}
          {data.recentWorkouts.map((w: any) => (
            <div key={w.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{w.name}</div>
                  <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(w.started_at), { addSuffix: true, locale: de })}</div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {w.duration_seconds ? `${Math.round(w.duration_seconds / 60)} min` : "läuft…"}<br />
                  {Number(w.total_volume).toLocaleString("de-DE")} kg
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {data.prs.length > 0 && (
        <section>
          <h2 className="mb-3 font-bold flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /> Letzte PRs</h2>
          <div className="space-y-2">
            {data.prs.map((pr: any) => (
              <div key={pr.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div>
                  <div className="text-sm font-medium">{pr.exercises?.name}</div>
                  <div className="text-xs text-muted-foreground">{pr.record_type === "1rm" ? "Est. 1RM" : pr.record_type}</div>
                </div>
                <div className="font-bold text-primary">{Number(pr.value).toFixed(1)} kg</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.achievements.length > 0 && (
        <section>
          <h2 className="mb-3 font-bold flex items-center gap-2"><Award className="h-4 w-4 text-accent" /> Achievements</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {data.achievements.map((a: any) => (
              <div key={a.achievement_id} className="rounded-xl border border-border bg-card p-3 text-center">
                <div className="text-2xl">🏅</div>
                <div className="mt-1 text-xs font-medium">{a.achievements?.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function formatVolume(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return `${Math.round(v)}`;
}

function Stat({ icon: Icon, label, value, sub }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <Icon className="h-4 w-4 text-primary" />
      <div className="mt-2 text-lg font-bold leading-tight">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}
