import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-4 text-muted-foreground">Diese Seite gibt's nicht.</p>
        <a href="/" className="mt-6 inline-flex rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground">Zurück</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Ups — etwas ist schiefgelaufen</h1>
        <p className="mt-2 text-sm text-muted-foreground">Bitte versuch's gleich nochmal.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground"
        >
          Nochmal versuchen
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1f2126" },
      { title: "FitForge — Track. Progress. Compete." },
      { name: "description", content: "Tracke deine Workouts, sieh deinen Fortschritt, hol' dir KI-Pläne und mess' dich mit Freunden." },
      { property: "og:title", content: "FitForge — Track. Progress. Compete." },
      { name: "twitter:title", content: "FitForge — Track. Progress. Compete." },
      { property: "og:description", content: "Tracke deine Workouts, sieh deinen Fortschritt, hol' dir KI-Pläne und mess' dich mit Freunden." },
      { name: "twitter:description", content: "Tracke deine Workouts, sieh deinen Fortschritt, hol' dir KI-Pläne und mess' dich mit Freunden." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b4f5df32-df26-4c7f-ae2c-95ff0edbd65e/id-preview-7ba6c9b2--fd4e2a4e-6027-4dde-a0f6-8690e7b6a00a.lovable.app-1780490095060.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b4f5df32-df26-4c7f-ae2c-95ff0edbd65e/id-preview-7ba6c9b2--fd4e2a4e-6027-4dde-a0f6-8690e7b6a00a.lovable.app-1780490095060.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync />
      <Outlet />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}

function AuthSync() {
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      qc.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, qc]);
  return null;
}
