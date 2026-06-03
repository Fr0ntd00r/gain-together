-- Entfernt alle Dummy-/Testdaten wieder.
-- Das Löschen der Auth-User räumt per ON DELETE CASCADE Profile, Workouts,
-- Sätze, Feed, Freundschaften, PRs und Challenge-Teilnahmen mit auf.

DELETE FROM public.challenges WHERE id = 'dc000000-0000-4000-8000-000000000001';
DELETE FROM auth.users WHERE email LIKE '%@dummy.fitforge';
