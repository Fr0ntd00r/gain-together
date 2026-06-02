import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Verlauf — FitForge" }] }),
  component: History,
});

function History() {
  const { data: workouts } = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from("workouts")
        .select("id,name,started_at,duration_seconds,total_volume,is_completed, workout_sets(id)")
        .eq("user_id", user!.id).eq("is_completed", true).order("started_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold tracking-tight">Verlauf</h1>
      <div className="space-y-2">
        {(workouts ?? []).map((w: any) => (
          <div key={w.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{w.name}</div>
                <div className="text-xs text-muted-foreground">{format(new Date(w.started_at), "EEEE, d. MMM yyyy · HH:mm", { locale: de })}</div>
              </div>
              <div className="text-right text-xs">
                <div className="font-bold text-primary">{Number(w.total_volume).toLocaleString("de-DE")} kg</div>
                <div className="text-muted-foreground">{Math.round((w.duration_seconds ?? 0) / 60)} min · {w.workout_sets?.length ?? 0} Sätze</div>
              </div>
            </div>
          </div>
        ))}
        {(!workouts || workouts.length === 0) && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Noch keine abgeschlossenen Workouts.
          </div>
        )}
      </div>
    </div>
  );
}
