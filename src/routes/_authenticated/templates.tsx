import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({ meta: [{ title: "Vorlagen — FitForge" }] }),
  component: Templates,
});

function Templates() {
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

  const grouped = (templates ?? []).reduce((acc: any, t: any) => {
    const key = t.is_official ? "Offiziell" : t.category || "Eigene";
    (acc[key] ??= []).push(t); return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Vorlagen</h1>
      {Object.entries(grouped).map(([cat, ts]: [string, any]) => (
        <section key={cat}>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{cat}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {ts.map((t: any) => (
              <Link key={t.id} to="/workouts/new" className="rounded-2xl border border-border bg-card p-4 hover:border-primary">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{t.name}</div>
                  {t.is_official && <span className="rounded bg-primary/15 px-2 py-0.5 text-[10px] text-primary">OFFIZIELL</span>}
                </div>
                {t.description && <div className="mt-1 text-xs text-muted-foreground">{t.description}</div>}
                <div className="mt-2 text-[10px] text-muted-foreground">{t.template_exercises?.length ?? 0} Übungen · {t.difficulty}</div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
