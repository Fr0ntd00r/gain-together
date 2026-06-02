import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [{ title: "Fortschritt — FitForge" }] }),
  component: ProgressPage,
});

function ProgressPage() {
  const [exerciseId, setExerciseId] = useState<string | null>(null);

  const { data: prs } = useQuery({
    queryKey: ["progress-prs"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from("personal_records")
        .select("*, exercises(name,primary_muscle)")
        .eq("user_id", user!.id).order("achieved_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: history } = useQuery({
    queryKey: ["progress-history", exerciseId],
    enabled: !!exerciseId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from("workout_sets").select("weight,reps,created_at")
        .eq("user_id", user!.id).eq("exercise_id", exerciseId!).eq("is_completed", true)
        .order("created_at");
      // group by day, max weight
      const map = new Map<string, number>();
      for (const s of data ?? []) {
        const d = (s.created_at as string).slice(0, 10);
        map.set(d, Math.max(map.get(d) ?? 0, Number(s.weight ?? 0)));
      }
      return Array.from(map.entries()).map(([date, weight]) => ({ date, weight }));
    },
  });

  const uniqueExercises = Array.from(new Map((prs ?? []).map((p: any) => [p.exercise_id, p.exercises])).entries());

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Fortschritt</h1>

      <section>
        <h2 className="mb-3 font-bold">Personal Records</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {(prs ?? []).filter((p: any) => p.record_type === "max_weight").map((pr: any) => (
            <button key={pr.id} onClick={() => setExerciseId(pr.exercise_id)}
              className={`rounded-xl border bg-card p-3 text-left ${exerciseId === pr.exercise_id ? "border-primary" : "border-border"}`}>
              <div className="text-sm font-medium">{pr.exercises?.name}</div>
              <div className="text-xs text-muted-foreground">{pr.exercises?.primary_muscle}</div>
              <div className="mt-1 text-lg font-bold text-primary">{Number(pr.value).toFixed(1)} kg</div>
            </button>
          ))}
          {(!prs || prs.length === 0) && (
            <div className="col-span-full rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Schließe Workouts ab, um PRs zu sehen.
            </div>
          )}
        </div>
      </section>

      {exerciseId && (
        <section>
          <h2 className="mb-3 font-bold">Verlauf</h2>
          <div className="h-64 rounded-2xl border border-border bg-card p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.018 270)" />
                <XAxis dataKey="date" tickFormatter={d => format(new Date(d), "d.M.")} stroke="oklch(0.68 0.02 270)" fontSize={11} />
                <YAxis stroke="oklch(0.68 0.02 270)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.21 0.015 270)", border: "1px solid oklch(0.3 0.018 270)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="weight" stroke="oklch(0.86 0.22 130)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}
