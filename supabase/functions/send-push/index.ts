// Supabase Edge Function: send-push
// Wird per Database Webhook bei INSERT auf public.notifications aufgerufen und
// sendet eine Web-Push-Nachricht an alle Geräte des Empfängers.
//
// Benötigte Secrets (Edge Function): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
//   VAPID_SUBJECT, optional PUSH_WEBHOOK_SECRET.
// SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY werden von Supabase automatisch bereitgestellt.

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

// Fallback auf den im Client/.env hinterlegten Public Key, falls das Edge-Secret fehlt.
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")
  || "BGAhb_BbMynC3j_MKsKzHMbAphsKe0SXagUCBA9lwxmvdwKYJAMteL7RTj6f8EAuYnLiQ9WRSfryEZrLM51xVng";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:noreply@fitforge.app";
const WEBHOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET"); // optional, aber empfohlen

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  console.log("[send-push] VAPID configured");
} else {
  console.error("[send-push] VAPID missing", { hasPublic: !!VAPID_PUBLIC, hasPrivate: !!VAPID_PRIVATE });
}

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const TITLE = "FitForge";
function bodyFor(type: string, name: string): string {
  switch (type) {
    case "like": return `${name} gefällt deine Aktivität`;
    case "comment": return `${name} hat deine Aktivität kommentiert`;
    case "comment_like": return `${name} gefällt dein Kommentar`;
    case "reply": return `${name} hat auf deinen Kommentar geantwortet`;
    case "friend_request": return `${name} möchte dich als Freund hinzufügen`;
    case "friend_accept": return `${name} hat deine Freundschaftsanfrage angenommen`;
    default: return `${name} hat reagiert`;
  }
}

Deno.serve(async (req) => {
  // Optionaler Shared-Secret-Schutz (Header aus dem Webhook).
  if (WEBHOOK_SECRET) {
    const got = req.headers.get("x-webhook-secret")
      ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (got !== WEBHOOK_SECRET) return new Response("unauthorized", { status: 401 });
  }
  if (!VAPID_PRIVATE) return new Response("VAPID not configured", { status: 500 });

  let payload: any;
  try { payload = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
  const record = payload?.record ?? payload; // Supabase-Webhook: { type, table, record, ... }
  if (!record?.user_id || !record?.type) {
    return new Response(JSON.stringify({ ignored: true }), { headers: { "content-type": "application/json" } });
  }

  // Akteur-Name für einen schöneren Text.
  let name = "Jemand";
  if (record.actor_id) {
    const { data: actor } = await admin.from("profiles")
      .select("display_name,username").eq("id", record.actor_id).maybeSingle();
    name = actor?.display_name ?? actor?.username ?? name;
  }

  const isFriend = record.type === "friend_request" || record.type === "friend_accept";
  const url = record.feed_id ? `/feed/${record.feed_id}` : isFriend ? "/friends" : "/notifications";
  const msg = JSON.stringify({ title: TITLE, body: bodyFor(record.type, name), url, tag: record.id });

  const { data: subs } = await admin.from("push_subscriptions")
    .select("id,endpoint,p256dh,auth").eq("user_id", record.user_id);

  let sent = 0;
  const expired: string[] = [];
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        msg,
      );
      sent++;
    } catch (e) {
      const code = (e?.statusCode ?? e?.status) as number | undefined;
      if (code === 404 || code === 410) expired.push(s.id);
    }
  }
  if (expired.length) await admin.from("push_subscriptions").delete().in("id", expired);

  return new Response(JSON.stringify({ sent, cleaned: expired.length }), {
    headers: { "content-type": "application/json" },
  });
});
