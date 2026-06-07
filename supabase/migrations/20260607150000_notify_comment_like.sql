-- Benachrichtigung, wenn jemand deinen Kommentar liked (Typ 'comment_like').
-- Setzt die Tabellen public.notifications und public.comment_likes voraus.
-- Idempotent.

-- Typ-Check um 'comment_like' erweitern.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like','comment','comment_like'));

-- Trigger: Like auf Kommentar -> Mitteilung an den Kommentar-Autor (nicht für sich selbst).
CREATE OR REPLACE FUNCTION public.notify_on_comment_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE owner_id uuid; fid uuid;
BEGIN
  SELECT user_id, feed_id INTO owner_id, fid FROM public.feed_comments WHERE id = NEW.comment_id;
  IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, feed_id, comment_id)
    VALUES (owner_id, NEW.user_id, 'comment_like', fid, NEW.comment_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_comment_like ON public.comment_likes;
CREATE TRIGGER trg_notify_comment_like AFTER INSERT ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment_like();
