# send-push (Edge Function)

Sendet Web-Push, wenn eine Zeile in `public.notifications` angelegt wird
(Likes, Kommentare, Antworten, Comment-Likes, Freundschaftsanfragen/-zusagen).

## Einrichtung in Lovable Cloud / Supabase

1. **Funktion deployen** (Ordner `supabase/functions/send-push`). In Lovable
   Cloud wird sie mit dem Projekt deployt; alternativ `supabase functions deploy send-push`.

2. **Secrets der Funktion setzen** (Edge Functions → Secrets):
   - `VAPID_PUBLIC_KEY` – derselbe Public Key wie im Client (`VITE_VAPID_PUBLIC_KEY`)
   - `VAPID_PRIVATE_KEY` – der private VAPID-Key
   - `VAPID_SUBJECT` – z. B. `mailto:du@example.com`
   - `PUSH_WEBHOOK_SECRET` – frei wählbares Geheimnis (für den Webhook-Header)

   `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` stellt Supabase automatisch bereit.

3. **Database Webhook anlegen** (Database → Webhooks → Create):
   - Tabelle: `public.notifications`
   - Events: **Insert**
   - Typ: **HTTP Request** (oder „Supabase Edge Function" → `send-push`)
   - URL (bei HTTP Request): `https://<PROJECT-REF>.functions.supabase.co/send-push`
   - Header hinzufügen: `x-webhook-secret: <PUSH_WEBHOOK_SECRET>`

Die JWT-Prüfung ist für diese Funktion deaktiviert (`config.toml`,
`verify_jwt = false`) – geschützt wird stattdessen über das Shared Secret.

## Test

In der App „Test"-Button nutzt weiterhin den App-Server-Pfad. Für den
automatischen Weg: mit einem zweiten Account etwas liken/kommentieren – die
neue `notifications`-Zeile löst den Webhook → diese Funktion → Push aus.
