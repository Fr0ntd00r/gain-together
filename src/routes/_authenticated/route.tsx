import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Home, Dumbbell, BarChart3, Users, Trophy, User, LogOut, BookOpen, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-64">
      <Sidebar />
      <main className="mx-auto max-w-5xl px-4 pt-6 pb-8 md:px-8 md:pt-10">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

const navItems = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/workouts/new", icon: Dumbbell, label: "Train" },
  { to: "/feed", icon: Activity, label: "Feed" },
  { to: "/progress", icon: BarChart3, label: "Progress" },
  { to: "/profile", icon: User, label: "Profil" },
] as const;

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {navItems.map(({ to, icon: Icon, label }) => (
          <Link
            key={to} to={to}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function Sidebar() {
  const router = useRouter();
  const { data: profile } = useQuery({
    queryKey: ["self-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("username,display_name,avatar_url").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  async function logout() {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  }

  const desktopItems = [
    { to: "/dashboard", icon: Home, label: "Dashboard" },
    { to: "/workouts/new", icon: Dumbbell, label: "Workout starten" },
    { to: "/templates", icon: BookOpen, label: "Trainingspläne" },
    { to: "/history", icon: Activity, label: "Verlauf" },
    { to: "/progress", icon: BarChart3, label: "Fortschritt" },
    { to: "/exercises", icon: Dumbbell, label: "Übungen" },
    { to: "/feed", icon: Activity, label: "Feed" },
    { to: "/friends", icon: Users, label: "Freunde" },
    { to: "/challenges", icon: Trophy, label: "Challenges" },
    { to: "/profile", icon: User, label: "Profil" },
  ] as const;

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-sidebar p-4 md:flex md:flex-col">
      <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary"><Dumbbell className="h-5 w-5 text-primary-foreground" /></div>
        <span className="text-lg font-bold tracking-tight">FitForge</span>
      </Link>
      <nav className="mt-6 flex-1 space-y-1">
        {desktopItems.map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" }}>
            <Icon className="h-4 w-4" />{label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-border pt-3">
        <div className="px-3 py-2 text-xs text-muted-foreground">@{profile?.username ?? "…"}</div>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-sidebar-accent">
          <LogOut className="h-4 w-4" /> Abmelden
        </button>
      </div>
    </aside>
  );
}
