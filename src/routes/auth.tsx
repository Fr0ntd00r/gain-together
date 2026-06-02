import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Dumbbell, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Anmelden — FitForge" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: username ? { username } : undefined,
          },
        });
        if (error) throw error;
        toast.success("Account erstellt! Du bist jetzt eingeloggt.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message ?? "Fehler beim Anmelden");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setOauthLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) {
        toast.error(result.error.message ?? "Google-Login fehlgeschlagen");
        setOauthLoading(false);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Fehler");
      setOauthLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
            <Dumbbell className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">{mode === "signin" ? "Willkommen zurück" : "Account erstellen"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tracke deine Workouts mit FitForge.</p>
        </div>

        <button
          onClick={onGoogle}
          disabled={oauthLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 font-medium hover:bg-muted disabled:opacity-50"
        >
          {oauthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
          Mit Google fortfahren
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">oder</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" && (
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username (optional)"
              className="w-full rounded-xl border border-border bg-input px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
            />
          )}
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="E-Mail"
            className="w-full rounded-xl border border-border bg-input px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort"
            className="w-full rounded-xl border border-border bg-input px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit" disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 font-bold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Anmelden" : "Account erstellen"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "Noch kein Account? Registrieren" : "Schon einen Account? Anmelden"}
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0 1 16.42 7.4l3.27-3.27A11.95 11.95 0 0 0 12 0a12 12 0 0 0-10.73 6.62l4 3.14Z"/><path fill="#34A853" d="M16.04 18.01A7.36 7.36 0 0 1 12 19.16a7.08 7.08 0 0 1-6.69-4.83l-4 3.07A12 12 0 0 0 12 24a11.5 11.5 0 0 0 8-2.98l-3.96-3Z"/><path fill="#4A90E2" d="M19.99 21.02C22.27 18.91 24 15.96 24 12c0-.78-.13-1.65-.32-2.43H12v4.97h6.74c-.34 1.6-1.23 2.84-2.7 3.7l3.96 2.78Z"/><path fill="#FBBC05" d="M5.31 14.34a7.16 7.16 0 0 1-.04-4.62l-4-3.14A11.83 11.83 0 0 0 0 12c0 1.94.45 3.78 1.27 5.41l4.04-3.07Z"/></svg>
  );
}
