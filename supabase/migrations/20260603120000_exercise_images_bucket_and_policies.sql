-- Übungen mit Bildern und Hinweisen ergänzen können.
-- Idempotent, damit es gefahrlos mehrfach laufen kann.

-- 1) Spalten sicherstellen
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS tips text,
  ADD COLUMN IF NOT EXISTS setup_notes text;

-- 2) Storage-Bucket für Übungsbilder (wurde bisher nie angelegt — nur Policies referenzierten ihn)
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-images', 'exercise-images', false)
ON CONFLICT (id) DO NOTHING;

-- 3) RLS: angemeldete Nutzer dürfen Hinweise/Bild öffentlicher Übungen ergänzen
DROP POLICY IF EXISTS "exercises update public notes" ON public.exercises;
CREATE POLICY "exercises update public notes"
ON public.exercises FOR UPDATE TO authenticated
USING (is_public = true)
WITH CHECK (is_public = true);

-- 4) Storage-Policies für den Bucket
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
