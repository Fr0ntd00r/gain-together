-- =====================================================================
--  TRAININGS-SEED aus dem Fitness-Handbuch (docs/fitness-guide/)
--  Offizielle, öffentliche Übungen + Trainingspläne A/B + Ganzkörper A/B.
--  Im Supabase SQL-Editor ausführen (läuft als service_role/postgres → RLS
--  wird umgangen). Idempotent: kann mehrfach ausgeführt werden.
--  created_by = NULL  => nutzer-unabhängige, offizielle Inhalte.
--  Aufräumen: supabase/seed/fitness_guide_training_cleanup.sql
--
--  Quelle: docs/fitness-guide/05-training.md (Kap. 5.6 / 5.7).
--  Hinweis: target_reps ist EIN Integer -> hier die Untergrenze; der volle
--  Wiederholungsbereich + RIR/Progression steht in notes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) ÜBUNGEN (deterministische IDs fce…0001 .. 0019)
-- ---------------------------------------------------------------------
INSERT INTO public.exercises
  (id, name, primary_muscle, secondary_muscles, equipment, is_compound, is_public, created_by, instructions)
VALUES
  ('fce00000-0000-4000-8000-000000000001','Bankdrücken','chest','{triceps,shoulders}','barbell',true,true,NULL,
   'Schulterblätter zusammenziehen, Brust raus, Füße fest am Boden. Letzter Satz RIR 1–2.'),
  ('fce00000-0000-4000-8000-000000000002','Schrägbankdrücken Kurzhantel','chest','{shoulders,triceps}','dumbbell',true,true,NULL,
   'Schrägbank ~30°. Kontrolliert absenken, obere Brust ansteuern.'),
  ('fce00000-0000-4000-8000-000000000003','Schulterpresse (Maschine)','shoulders','{triceps}','machine',true,true,NULL,
   'Griffe auf Schulterhöhe einstellen, kontrolliert nach oben drücken, nicht durchschlagen.'),
  ('fce00000-0000-4000-8000-000000000004','Butterfly','chest','{shoulders}','machine',false,true,NULL,
   'Fokus auf Dehnung und Kontrolle, Brustspannung halten.'),
  ('fce00000-0000-4000-8000-000000000005','Preacher Curl (Maschine)','biceps','{forearms}','machine',false,true,NULL,
   'Oberarme aufgelegt, volle Streckung unten, oben bewusst kontrahieren.'),
  ('fce00000-0000-4000-8000-000000000006','Rudern eng (Kabel)','back','{biceps}','cable',true,true,NULL,
   'Brust raus, Ellbogen eng am Körper nach hinten ziehen, Schulterblätter zusammen.'),
  ('fce00000-0000-4000-8000-000000000007','Seitheben','shoulders','{}','dumbbell',false,true,NULL,
   'Leichte Gewichte, saubere Form, bis Schulterhöhe. Letzter Satz RIR 0–1.'),
  ('fce00000-0000-4000-8000-000000000008','Face Pull','shoulders','{back}','cable',false,true,NULL,
   'Seil auf Gesichtshöhe ziehen, Ellbogen hoch, hintere Schulter ansteuern. Haltung/Schultergesundheit.'),
  ('fce00000-0000-4000-8000-000000000009','Beinpresse','quads','{glutes,hamstrings}','machine',true,true,NULL,
   'Volle Kontrolle, tiefe ROM, nicht aufspringen. Knie nicht durchdrücken.'),
  ('fce00000-0000-4000-8000-000000000010','Beinbeuger (sitzend)','hamstrings','{}','machine',false,true,NULL,
   'Hintere Oberschenkel. Kontrolliert beugen und strecken.'),
  ('fce00000-0000-4000-8000-000000000011','Rumänisches Kreuzheben','hamstrings','{glutes,back}','barbell',true,true,NULL,
   'Hüfte nach hinten schieben, Rücken neutral, leichte Kniebeugung, Stange nah am Körper. Dehnung spüren. Leicht starten.'),
  ('fce00000-0000-4000-8000-000000000012','Latziehen eng','back','{biceps}','cable',true,true,NULL,
   'Brust raus, zum oberen Brustbein ziehen, Schulterblätter nach unten/hinten.'),
  ('fce00000-0000-4000-8000-000000000013','Rudern (breit)','back','{biceps}','cable',true,true,NULL,
   'Breiter Griff, Ellbogen weiter außen, oberer Rücken.'),
  ('fce00000-0000-4000-8000-000000000014','Trizeps Pushdown','triceps','{}','cable',false,true,NULL,
   'Ellbogen fixiert am Körper, voll strecken, kontrolliert zurück.'),
  ('fce00000-0000-4000-8000-000000000015','Trizeps SZ-Curl liegend','triceps','{}','barbell',false,true,NULL,
   'Oberarme senkrecht, nur im Ellbogen bewegen (French Press / Skull Crusher).'),
  ('fce00000-0000-4000-8000-000000000016','Wadenheben','calves','{}','machine',false,true,NULL,
   'Volle ROM: ganz hoch auf die Zehen, ganz runter. Kurz halten oben.'),
  ('fce00000-0000-4000-8000-000000000017','Adduktoren-Maschine','quads','{}','machine',false,true,NULL,
   'Optionale Übung. Beine kontrolliert zusammenführen.'),
  ('fce00000-0000-4000-8000-000000000018','Beinstrecker (Leg Extension)','quads','{}','machine',false,true,NULL,
   'Vordere Oberschenkel. Oben kurz halten, kontrolliert ablassen.'),
  ('fce00000-0000-4000-8000-000000000019','Latzug einarmig (Maschine)','back','{biceps}','machine',true,true,NULL,
   'Einseitig, volle ROM, Rumpf stabil halten.')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2) TRAININGSPLÄNE (Templates, offiziell + öffentlich)
-- ---------------------------------------------------------------------
INSERT INTO public.workout_templates
  (id, name, description, created_by, is_public, is_official, difficulty, estimated_duration_min, category)
VALUES
  ('fc100000-0000-4000-8000-000000000001','Training A – Brust/Schulter/Bizeps/Rücken',
   'Optimiertes A/B-System, Tag A. Doppelprogression: erst Wdh. steigern, dann Gewicht. Letzter Satz RIR 1–2 (Isolation 0–1).',
   NULL,true,true,'beginner',70,'Krafttraining'),
  ('fc100000-0000-4000-8000-000000000002','Training B – Beine/Rücken/Trizeps',
   'Optimiertes A/B-System, Tag B. Wichtigster Tag für Fettverlust (große Muskelgruppen).',
   NULL,true,true,'beginner',75,'Krafttraining'),
  ('fc100000-0000-4000-8000-000000000003','Ganzkörper A',
   'Ganzkörper-System (ab ~Woche 9), höhere Frequenz. Rotation Wo.1: GK A / GK B / GK A.',
   NULL,true,true,'beginner',60,'Krafttraining'),
  ('fc100000-0000-4000-8000-000000000004','Ganzkörper B',
   'Ganzkörper-System (ab ~Woche 9), höhere Frequenz. Rotation Wo.2: GK B / GK A / GK B.',
   NULL,true,true,'beginner',60,'Krafttraining')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3) TEMPLATE-ÜBUNGEN
-- ---------------------------------------------------------------------
-- Training A
INSERT INTO public.template_exercises
  (id, template_id, exercise_id, position, target_sets, target_reps, target_weight, rest_seconds, notes)
VALUES
  ('fc1a0000-0000-4000-8000-000000000001','fc100000-0000-4000-8000-000000000001','fce00000-0000-4000-8000-000000000001',0,3,6,50,120,'6–10 Wdh., RIR 1–2. Bei 10/10/10 → +2,5 kg.'),
  ('fc1a0000-0000-4000-8000-000000000002','fc100000-0000-4000-8000-000000000001','fce00000-0000-4000-8000-000000000002',1,3,8,18,120,'8–12 Wdh.'),
  ('fc1a0000-0000-4000-8000-000000000003','fc100000-0000-4000-8000-000000000001','fce00000-0000-4000-8000-000000000003',2,3,8,40,120,'8–12 Wdh.'),
  ('fc1a0000-0000-4000-8000-000000000004','fc100000-0000-4000-8000-000000000001','fce00000-0000-4000-8000-000000000004',3,2,10,40,90,'10–15 Wdh.'),
  ('fc1a0000-0000-4000-8000-000000000005','fc100000-0000-4000-8000-000000000001','fce00000-0000-4000-8000-000000000005',4,3,8,30,90,'8–12 Wdh.'),
  ('fc1a0000-0000-4000-8000-000000000006','fc100000-0000-4000-8000-000000000001','fce00000-0000-4000-8000-000000000006',5,3,8,45,120,'8–12 Wdh.'),
  ('fc1a0000-0000-4000-8000-000000000007','fc100000-0000-4000-8000-000000000001','fce00000-0000-4000-8000-000000000007',6,3,12,NULL,90,'12–20 Wdh., RIR 0–1.'),
  ('fc1a0000-0000-4000-8000-000000000008','fc100000-0000-4000-8000-000000000001','fce00000-0000-4000-8000-000000000008',7,3,12,NULL,90,'12–20 Wdh. Hintere Schulter / Haltung.'),
-- Training B
  ('fc1b0000-0000-4000-8000-000000000001','fc100000-0000-4000-8000-000000000002','fce00000-0000-4000-8000-000000000009',0,4,8,130,120,'8–15 Wdh. Bei 15×4 → +10 kg.'),
  ('fc1b0000-0000-4000-8000-000000000002','fc100000-0000-4000-8000-000000000002','fce00000-0000-4000-8000-000000000010',1,3,10,NULL,90,'10–15 Wdh.'),
  ('fc1b0000-0000-4000-8000-000000000003','fc100000-0000-4000-8000-000000000002','fce00000-0000-4000-8000-000000000011',2,3,8,NULL,120,'8–12 Wdh. Hüftstreckung, sauber & leicht starten. Ab Phase 2 steigern.'),
  ('fc1b0000-0000-4000-8000-000000000004','fc100000-0000-4000-8000-000000000002','fce00000-0000-4000-8000-000000000012',3,3,8,59,120,'8–12 Wdh. Bei 12/12/12 → +5 kg.'),
  ('fc1b0000-0000-4000-8000-000000000005','fc100000-0000-4000-8000-000000000002','fce00000-0000-4000-8000-000000000013',4,3,8,45,120,'8–12 Wdh.'),
  ('fc1b0000-0000-4000-8000-000000000006','fc100000-0000-4000-8000-000000000002','fce00000-0000-4000-8000-000000000014',5,3,10,22,90,'10–15 Wdh.'),
  ('fc1b0000-0000-4000-8000-000000000007','fc100000-0000-4000-8000-000000000002','fce00000-0000-4000-8000-000000000015',6,3,8,15,90,'8–12 Wdh.'),
  ('fc1b0000-0000-4000-8000-000000000008','fc100000-0000-4000-8000-000000000002','fce00000-0000-4000-8000-000000000016',7,3,12,NULL,90,'12–20 Wdh.'),
-- Ganzkörper A
  ('fc1c0000-0000-4000-8000-000000000001','fc100000-0000-4000-8000-000000000003','fce00000-0000-4000-8000-000000000001',0,3,6,50,120,'6–10 Wdh.'),
  ('fc1c0000-0000-4000-8000-000000000002','fc100000-0000-4000-8000-000000000003','fce00000-0000-4000-8000-000000000012',1,3,8,59,120,'8–12 Wdh.'),
  ('fc1c0000-0000-4000-8000-000000000003','fc100000-0000-4000-8000-000000000003','fce00000-0000-4000-8000-000000000009',2,4,10,130,120,'10–15 Wdh.'),
  ('fc1c0000-0000-4000-8000-000000000004','fc100000-0000-4000-8000-000000000003','fce00000-0000-4000-8000-000000000003',3,3,8,40,120,'8–12 Wdh.'),
  ('fc1c0000-0000-4000-8000-000000000005','fc100000-0000-4000-8000-000000000003','fce00000-0000-4000-8000-000000000005',4,2,10,30,90,'10–15 Wdh.'),
  ('fc1c0000-0000-4000-8000-000000000006','fc100000-0000-4000-8000-000000000003','fce00000-0000-4000-8000-000000000014',5,2,10,22,90,'10–15 Wdh.'),
-- Ganzkörper B
  ('fc1d0000-0000-4000-8000-000000000001','fc100000-0000-4000-8000-000000000004','fce00000-0000-4000-8000-000000000002',0,3,8,18,120,'8–12 Wdh.'),
  ('fc1d0000-0000-4000-8000-000000000002','fc100000-0000-4000-8000-000000000004','fce00000-0000-4000-8000-000000000006',1,3,8,45,120,'8–12 Wdh.'),
  ('fc1d0000-0000-4000-8000-000000000003','fc100000-0000-4000-8000-000000000004','fce00000-0000-4000-8000-000000000018',2,4,12,NULL,90,'12–15 Wdh.'),
  ('fc1d0000-0000-4000-8000-000000000004','fc100000-0000-4000-8000-000000000004','fce00000-0000-4000-8000-000000000010',3,3,10,NULL,90,'10–15 Wdh.'),
  ('fc1d0000-0000-4000-8000-000000000005','fc100000-0000-4000-8000-000000000004','fce00000-0000-4000-8000-000000000019',4,3,10,35,90,'10–15 Wdh.'),
  ('fc1d0000-0000-4000-8000-000000000006','fc100000-0000-4000-8000-000000000004','fce00000-0000-4000-8000-000000000007',5,3,15,NULL,90,'15–20 Wdh.'),
  ('fc1d0000-0000-4000-8000-000000000007','fc100000-0000-4000-8000-000000000004','fce00000-0000-4000-8000-000000000015',6,2,10,15,90,'10–15 Wdh.'),
  ('fc1d0000-0000-4000-8000-000000000008','fc100000-0000-4000-8000-000000000004','fce00000-0000-4000-8000-000000000005',7,2,10,12,90,'10–15 Wdh. (einarmig).')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4) OPTIONAL: Wochenplan (Mo/Mi/Fr = A/B/A) für DEINEN Account.
--    schedule_rules.user_id ist NOT NULL + FK auf auth.users -> nicht
--    global seedbar. Bei Bedarf untenstehenden Block einkommentieren
--    (läuft als service_role; 'me' wird per E-Mail ermittelt).
-- ---------------------------------------------------------------------
-- DO $$
-- DECLARE me uuid;
-- BEGIN
--   SELECT id INTO me FROM auth.users WHERE lower(email)=lower('alltimegaminghd@gmail.com') LIMIT 1;
--   IF me IS NULL THEN RAISE NOTICE 'Kein Account gefunden – Block übersprungen.'; RETURN; END IF;
--   INSERT INTO public.schedule_settings (user_id, mode) VALUES (me,'weekly')
--     ON CONFLICT (user_id) DO UPDATE SET mode='weekly';
--   INSERT INTO public.schedule_rules (user_id, mode, slot_index, template_id) VALUES
--     (me,'weekly',0,'fc100000-0000-4000-8000-000000000001'),  -- Mo = Training A
--     (me,'weekly',2,'fc100000-0000-4000-8000-000000000002'),  -- Mi = Training B
--     (me,'weekly',4,'fc100000-0000-4000-8000-000000000001')   -- Fr = Training A
--   ON CONFLICT (user_id,mode,slot_index) DO UPDATE SET template_id=EXCLUDED.template_id;
-- END $$;
