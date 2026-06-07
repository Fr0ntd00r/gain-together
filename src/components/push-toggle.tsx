import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { enablePush, disablePush, getCurrentSubscription, pushSupported } from "@/lib/push";
import { sendTestPush } from "@/lib/api/push.functions";

export function PushToggle() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);
  const sendTest = useServerFn(sendTestPush);

  useEffect(() => {
    setSupported(pushSupported());
    getCurrentSubscription().then((s) => setEnabled(!!s));
  }, []);

  async function toggle(next: boolean) {
    setBusy(true);
    try {
      if (next) {
        const r = await enablePush();
        if (!r.ok) {
          toast.error(r.reason ?? "Aktivierung fehlgeschlagen");
          setEnabled(false);
        } else {
          toast.success("Push-Benachrichtigungen aktiviert");
          setEnabled(true);
        }
      } else {
        await disablePush();
        toast.success("Push-Benachrichtigungen deaktiviert");
        setEnabled(false);
      }
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    try {
      const r = await sendTest({ data: {} });
      if (r.sent > 0) toast.success(`Test-Push gesendet (${r.sent})`);
      else toast.error("Keine aktive Subscription gefunden");
    } catch (e: any) {
      toast.error(e?.message ?? "Fehler beim Senden");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Dein Browser unterstützt keine Push-Benachrichtigungen.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <Bell className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">Push-Benachrichtigungen</div>
          <div className="text-xs text-muted-foreground">Erhalte Likes, Kommentare und Freundschaftsanfragen direkt auf dein Gerät.</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {enabled && (
          <button onClick={test} disabled={busy} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50">
            Test
          </button>
        )}
        <Switch checked={enabled} disabled={busy} onCheckedChange={toggle} />
      </div>
    </div>
  );
}
