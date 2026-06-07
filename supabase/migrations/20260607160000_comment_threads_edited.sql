-- Kommentar-Threads (Antworten) + "bearbeitet"-Kennzeichnung + erweiterte
-- Benachrichtigungs-Typen (reply, friend_request, friend_accept). Idempotent.

ALTER TABLE public.feed_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.feed_comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS feed_comments_parent_idx ON public.feed_comments(parent_id);

-- Typ-Check der Benachrichtigungen um alle aktuellen Typen erweitern.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like','comment','comment_like','reply','friend_request','friend_accept'));

-- Kommentar-Trigger: Antworten benachrichtigen den Autor des Eltern-Kommentars
-- ('reply'), normale Kommentare den Eigentümer der Aktivität ('comment').
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE owner_id uuid; parent_author uuid;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_author FROM public.feed_comments WHERE id = NEW.parent_id;
    IF parent_author IS NOT NULL AND parent_author <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, actor_id, type, feed_id, comment_id)
      VALUES (parent_author, NEW.user_id, 'reply', NEW.feed_id, NEW.id);
    END IF;
  ELSE
    SELECT user_id INTO owner_id FROM public.activity_feed WHERE id = NEW.feed_id;
    IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, actor_id, type, feed_id, comment_id)
      VALUES (owner_id, NEW.user_id, 'comment', NEW.feed_id, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
-- Trigger existiert bereits (aus früherer Migration); Funktion wurde nur ersetzt.
