import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/exercises")({
  head: () => ({ meta: [{ title: "Übungen — FitForge" }] }),
  component: ExercisesPage,
});

const MUSCLES = ["all","chest","back","shoulders","biceps","triceps","quads","hamstrings","glutes","calves","core","full_body","cardio"];

function ExercisesPage() {
  const [muscle, setMuscle] = useState("all");
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["exercises", muscle],
    queryFn: async () => {
      let qry = supabase.from("exercises").select("*").order("name");
      if (muscle !== "all") qry = qry.eq("primary_muscle", muscle as any);
      const { data } = await qry;
      return data ?? [];
    },
  });

  const filtered = (data ?? []).filter(e => e.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold tracking-tight">Übungen</h1>
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
          <div key={e.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{e.name}</div>
                <div className="text-[10px] uppercase text-muted-foreground">{e.primary_muscle} · {e.equipment} {e.is_compound && "· compound"}</div>
              </div>
            </div>
            {e.instructions && <p className="mt-1 text-xs text-muted-foreground">{e.instructions}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
