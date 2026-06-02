import { createFileRoute, Link } from "@tanstack/react-router";
import { Dumbbell, TrendingUp, Users, Trophy, Sparkles, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FitForge — Track. Progress. Compete." },
      { name: "description", content: "Die Fitness-App für ernsthafte Lifter: Workout-Tracking, KI-Pläne, automatische Progressions-Vorschläge und Community." },
      { property: "og:title", content: "FitForge — Track. Progress. Compete." },
      { property: "og:description", content: "Workout-Tracking, KI-Pläne und Community für Gym-Enthusiasten." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Dumbbell className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">FitForge</span>
        </div>
        <Link to="/auth" className="rounded-lg border border-border bg-card/40 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-card">
          Anmelden
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24">
        <section className="pt-12 sm:pt-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> KI-gestütztes Training
          </span>
          <h1 className="mt-6 text-balance text-5xl font-extrabold tracking-tight sm:text-7xl">
            Track. Progress.<br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">Compete.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
            Logge jeden Satz, bekomm intelligente Progressions-Vorschläge und mess' dich mit Freunden in Challenges.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/auth" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-3.5 text-base font-bold text-primary-foreground shadow-glow sm:w-auto">
              Kostenlos starten <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon={Dumbbell} title="Smartes Tracking" text="Sätze, Wdh, Gewicht, RPE — alles in Sekunden geloggt." />
          <Feature icon={TrendingUp} title="Auto-Progression" text="Wir berechnen, wann du mehr Gewicht oder Wdh schaffen kannst." />
          <Feature icon={Sparkles} title="KI-Coach" text="Generiert maßgeschneiderte Pläne aus deinen Zielen." />
          <Feature icon={Users} title="Community" text="Freunde, Feed, Leaderboards und Achievements." />
        </section>

        <section className="mt-20 rounded-3xl border border-border bg-card/40 p-8 backdrop-blur sm:p-12">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Trophy className="mb-3 h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold sm:text-3xl">Bereit für den nächsten PR?</h2>
              <p className="mt-2 max-w-md text-muted-foreground">Erstelle dein Profil in unter einer Minute.</p>
            </div>
            <Link to="/auth" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">
              Los geht's <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function Feature({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5 backdrop-blur">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
