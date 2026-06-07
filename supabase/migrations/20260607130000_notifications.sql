-- In-App-Benachrichtigungen für Likes & Kommentare auf eigene Feed-Aktivitäten.
-- Erzeugt automatisch per Trigger (SECURITY DEFINER) beim Like/Kommentar.
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,    -- Empfänger
  actor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,            -- wer es ausgelöst hat
  type TEXT NOT NULL CHECK (type IN ('like','comment')),
  feed_id UUID REFERENCES public.activity_feed(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.feed_comments(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON public.notifications(user_id) WHERE read_at IS NULL;

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Empfänger darf nur seine eigenen Mitteilungen lesen/abhaken/löschen. Insert nur via Trigger.
DROP POLICY IF EXISTS "notifications select own" ON public.notifications;
CREATE POLICY "notifications select own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications update own" ON public.notifications;
CREATE POLICY "notifications update own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications delete own" ON public.notifications;
CREATE POLICY "notifications delete own" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger: bei Like eine Mitteilung für den Eigentümer der Aktivität anlegen (nicht für sich selbst).
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE owner_id uuid;
BEGIN
  SELECT user_id INTO owner_id FROM public.activity_feed WHERE id = NEW.feed_id;
  IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, feed_id)
    VALUES (owner_id, NEW.user_id, 'like', NEW.feed_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_like ON public.feed_likes;
CREATE TRIGGER trg_notify_like AFTER INSERT ON public.feed_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- Trigger: bei Kommentar eine Mitteilung für den Eigentümer der Aktivität anlegen.
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE owner_id uuid;
BEGIN
  SELECT user_id INTO owner_id FROM public.activity_feed WHERE id = NEW.feed_id;
  IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, feed_id, comment_id)
    VALUES (owner_id, NEW.user_id, 'comment', NEW.feed_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_comment ON public.feed_comments;
CREATE TRIGGER trg_notify_comment AFTER INSERT ON public.feed_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();
