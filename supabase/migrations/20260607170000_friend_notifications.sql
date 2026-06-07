-- Benachrichtigungen für Freundschaftsanfragen & -bestätigungen. Idempotent.
-- (Typ-Check inkl. 'friend_request'/'friend_accept' kommt aus der Migration
--  20260607160000_comment_threads_edited.sql.)

-- Neue Anfrage -> Mitteilung an den Empfänger.
CREATE OR REPLACE FUNCTION public.notify_on_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending' AND NEW.addressee_id <> NEW.requester_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (NEW.addressee_id, NEW.requester_id, 'friend_request');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_friend_request ON public.friendships;
CREATE TRIGGER trg_notify_friend_request AFTER INSERT ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_friend_request();

-- Anfrage angenommen -> Mitteilung an den ursprünglichen Anfragenden.
CREATE OR REPLACE FUNCTION public.notify_on_friend_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (NEW.requester_id, NEW.addressee_id, 'friend_accept');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_friend_accept ON public.friendships;
CREATE TRIGGER trg_notify_friend_accept AFTER UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_friend_accept();
