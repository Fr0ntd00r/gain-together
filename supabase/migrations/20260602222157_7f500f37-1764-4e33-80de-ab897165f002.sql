-- Add image_url and tips/setup columns to exercises
ALTER TABLE public.exercises 
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS tips text,
  ADD COLUMN IF NOT EXISTS setup_notes text;
