-- =====================================================================
--  AUFRÄUMEN: entfernt den Trainings-Seed aus
--  supabase/seed/fitness_guide_training_seed.sql wieder.
--  Im Supabase SQL-Editor ausführen (service_role/postgres).
--  Reihenfolge wegen FK (template_exercises.exercise_id ON DELETE RESTRICT):
--  erst template_exercises, dann templates, dann exercises.
-- =====================================================================

-- 1) Template-Übungen der vier Seed-Templates
DELETE FROM public.template_exercises
 WHERE template_id IN (
   'fc100000-0000-4000-8000-000000000001',
   'fc100000-0000-4000-8000-000000000002',
   'fc100000-0000-4000-8000-000000000003',
   'fc100000-0000-4000-8000-000000000004'
 );

-- 2) Templates
DELETE FROM public.workout_templates
 WHERE id IN (
   'fc100000-0000-4000-8000-000000000001',
   'fc100000-0000-4000-8000-000000000002',
   'fc100000-0000-4000-8000-000000000003',
   'fc100000-0000-4000-8000-000000000004'
 );

-- 3) Übungen (fce…0001 .. 0019)
DELETE FROM public.exercises
 WHERE id >= 'fce00000-0000-4000-8000-000000000001'
   AND id <= 'fce00000-0000-4000-8000-000000000019';
