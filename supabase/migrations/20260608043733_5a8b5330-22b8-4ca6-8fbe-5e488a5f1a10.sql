-- Private schema for server-only config (no Data API access)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.app_secrets (
  name  text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON private.app_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.app_secrets TO service_role;

-- Seed a random secret once (kept stable across re-runs)
INSERT INTO private.app_secrets(name, value)
VALUES ('push_webhook_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

-- Update trigger function to attach x-webhook-secret header
CREATE OR REPLACE FUNCTION public.notifications_send_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private
AS $function$
DECLARE
  secret text;
BEGIN
  SELECT value INTO secret FROM private.app_secrets WHERE name = 'push_webhook_secret';
  PERFORM net.http_post(
    url := 'https://rndyojkkeklscbjrstou.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', COALESCE(secret, '')
    ),
    body := jsonb_build_object('type','INSERT','table','notifications','record', to_jsonb(NEW))
  );
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.notifications_send_push() FROM PUBLIC, anon, authenticated;