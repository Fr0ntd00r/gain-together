-- Pro-Nutzer-Notizen & Bilder zu Übungen.
-- Überlagern die geteilte (offizielle) Übung, ohne sie zu verändern — dadurch kein
-- Konflikt mit dem Security-Modell (öffentliche Übungen nur durch Admins änderbar).
-- Idempotent, damit es gefahrlos mehrfach laufen kann.

CREATE TABLE IF NOT EXISTS public.exercise_user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  instructions TEXT,
  setup_notes TEXT,
  tips TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercise_id)
);
CREATE INDEX IF NOT EXISTS eun_user_idx ON public.exercise_user_notes(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_user_notes TO authenticated;
GRANT ALL ON public.exercise_user_notes TO service_role;
ALTER TABLE public.exercise_user_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eun select own" ON public.exercise_user_notes;
CREATE POLICY "eun select own" ON public.exercise_user_notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "eun insert own" ON public.exercise_user_notes;
CREATE POLICY "eun insert own" ON public.exercise_user_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "eun update own" ON public.exercise_user_notes;
CREATE POLICY "eun update own" ON public.exercise_user_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "eun delete own" ON public.exercise_user_notes;
CREATE POLICY "eun delete own" ON public.exercise_user_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_eun_updated ON public.exercise_user_notes;
CREATE TRIGGER trg_eun_updated BEFORE UPDATE ON public.exercise_user_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage-Bucket für (auch persönliche) Übungsbilder sicherstellen + Policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-images', 'exercise-images', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "exercise images viewable by authenticated" ON storage.objects;
CREATE POLICY "exercise images viewable by authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'exercise-images');

DROP POLICY IF EXISTS "authenticated can upload exercise images" ON storage.objects;
CREATE POLICY "authenticated can upload exercise images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'exercise-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "users update own exercise images" ON storage.objects;
CREATE POLICY "users update own exercise images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'exercise-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "users delete own exercise images" ON storage.objects;
CREATE POLICY "users delete own exercise images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'exercise-images' AND auth.uid()::text = (storage.foldername(name))[1]);
