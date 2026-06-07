-- Pro-Nutzer-Override für den Gewichtsschritt je Übung (Progressionsempfehlung).
-- NULL  => Standard nach Equipment wird verwendet.
-- 0     => Fortschritt nur über Wiederholungen (z. B. Maschine ohne kleine Sprünge).
-- Idempotent.
ALTER TABLE public.exercise_user_notes
  ADD COLUMN IF NOT EXISTS weight_increment NUMERIC;
