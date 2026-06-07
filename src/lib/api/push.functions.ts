import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Senden einer Push-Notification an alle Subscriptions eines bestimmten Nutzers.
// Wird intern genutzt (sendTestPush und zukünftige Trigger).
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body?: string; url?: string; tag?: string; icon?: string },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const webpush = (await import("web-push")).default;

  const subject = process.env.VAPID_SUBJECT || "mailto:noreply@example.com";
  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY || "BGAhb_BbMynC3j_MKsKzHMbAphsKe0SXagUCBA9lwxmvdwKYJAMteL7RTj6f8EAuYnLiQ9WRSfryEZrLM51xVng";
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) throw new Error("VAPID_PRIVATE_KEY fehlt");

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", userId);
  if (error) throw error;

  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    (subs ?? []).map((s: any) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
      ),
    ),
  );

  // Abgelaufene Subscriptions (404/410) aufräumen.
  const toDelete: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const code = (r.reason && (r.reason.statusCode || r.reason.status)) as number | undefined;
      if (code === 404 || code === 410) toDelete.push((subs ?? [])[i].id);
    }
  });
  if (toDelete.length) {
    await supabaseAdmin.from("push_subscriptions").delete().in("id", toDelete);
  }

  return {
    sent: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
    cleaned: toDelete.length,
  };
}

// Test-Push an den aktuell angemeldeten Nutzer.
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        title: z.string().trim().min(1).max(120).optional(),
        body: z.string().trim().max(500).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    return await sendPushToUser(context.userId, {
      title: data.title ?? "FitForge",
      body: data.body ?? "Push funktioniert! 🎉",
      url: "/notifications",
      tag: "test",
    });
  });
