import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Flame, Trophy, Dumbbell, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profil — FitForge" }] }),
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const { data: profile, refetch } = useQuery({
    queryKey: ["self-profile-full"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });
  const { data: stats } = useQuery({
    queryKey: ["profile-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [{ count: workouts }, { count: prs }, { data: vol }, { data: ach }] = await Promise.all([
        supabase.from("workouts").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("is_completed", true),
        supabase.from("personal_records").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("workouts").select("total_volume").eq("user_id", user!.id).eq("is_completed", true),
        supabase.from("user_achievements").select("achievements(name,tier,icon)").eq("user_id", user!.id),
      ]);
      return {
        workouts: workouts ?? 0,
        prs: prs ?? 0,
        volume: (vol ?? []).reduce((s: number, w: any) => s + Number(w.total_volume ?? 0), 0),
        achievements: ach ?? [],
      };
    },
  });

  const [display, setDisplay] = useState("");
  const [bio, setBio] = useState("");
  const [goal, setGoal] = useState("general_fitness");
  const [experience, setExperience] = useState("beginner");

  useEffect(() => {
    if (profile) {
      setDisplay(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setGoal(profile.goal ?? "general_fitness");
      setExperience(profile.experience ?? "beginner");
    }
  }, [profile]);

  async function save() {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").update({
      display_name: display, bio, goal: goal as any, experience: experience as any,
    }).eq("id", user!.id);
    if (error) toast.error(error.message); else { toast.success("Profil gespeichert"); refetch(); }
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Profil</h1>
        <div className="flex shrink-0 gap-2">
          <Link to="/friends" className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium">
            <Users className="h-3.5 w-3.5" /> Freunde
          </Link>
          <button onClick={logout} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
            <LogOut className="h-3.5 w-3.5" /> Abmelden
          </button>
        </div>
      </header>

      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-primary text-2xl font-bold text-primary-foreground">
          {(profile?.display_name ?? profile?.username ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div className="text-xl font-bold">{profile?.display_name ?? profile?.username}</div>
          <div className="text-sm text-muted-foreground">@{profile?.username}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat icon={Dumbbell} label="Workouts" value={stats?.workouts ?? 0} />
        <Stat icon={Trophy} label="PRs" value={stats?.prs ?? 0} />
        <Stat icon={Flame} label="Streak" value={`${profile?.current_streak ?? 0}🔥`} />
      </div>

      <section className="space-y-2">
        <h2 className="font-bold">Achievements ({stats?.achievements.length ?? 0})</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {(stats?.achievements ?? []).map((a: any, i: number) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3 text-center">
              <div className="text-2xl">🏅</div>
              <div className="mt-1 text-xs font-medium leading-tight">{a.achievements?.name}</div>
              <div className="text-[10px] uppercase text-muted-foreground">{a.achievements?.tier}</div>
            </div>
          ))}
          {(stats?.achievements ?? []).length === 0 && (
            <div className="col-span-full text-center text-sm text-muted-foreground">Schließe Workouts ab, um Achievements zu verdienen.</div>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-bold">Einstellungen</h2>
        <label className="block">
          <span className="text-xs text-muted-foreground">Anzeigename</span>
          <input value={display} onChange={e => setDisplay(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">Bio</span>
          <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={300} className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs text-muted-foreground">Ziel</span>
            <select value={goal} onChange={e => setGoal(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2">
              <option value="strength">Kraft</option><option value="hypertrophy">Muskelaufbau</option>
              <option value="endurance">Ausdauer</option><option value="weight_loss">Abnehmen</option><option value="general_fitness">Fitness</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Level</span>
            <select value={experience} onChange={e => setExperience(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2">
              <option value="beginner">Anfänger</option><option value="intermediate">Fortgeschritten</option><option value="advanced">Profi</option>
            </select>
          </label>
        </div>
        <button onClick={save} className="w-full rounded-xl bg-primary px-4 py-2.5 font-bold text-primary-foreground">Speichern</button>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <div className="mt-1 text-lg font-bold">{value}</div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    </div>
  );
}
