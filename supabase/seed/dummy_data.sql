-- =====================================================================
--  DUMMY-/TESTDATEN für FitForge
--  Im Supabase SQL-Editor ausführen (läuft als service_role/postgres).
--  Idempotent: kann mehrfach ausgeführt werden.
--  Bindet alles an deinen Account (E-Mail unten ggf. anpassen).
--  Aufräumen: supabase/seed/dummy_data_cleanup.sql
-- =====================================================================

DO $$
DECLARE
  me uuid;
  ex uuid[];
  nex int;
  u1 uuid := 'dd000000-0000-4000-8000-000000000001'; -- Max  (Freund)
  u2 uuid := 'dd000000-0000-4000-8000-000000000002'; -- Lisa (Freund)
  u3 uuid := 'dd000000-0000-4000-8000-000000000003'; -- Tom  (Freund)
  u4 uuid := 'dd000000-0000-4000-8000-000000000004'; -- Sara (schickt DIR eine Anfrage)
  u5 uuid := 'dd000000-0000-4000-8000-000000000005'; -- Ben  (DU hast ihm eine Anfrage geschickt)
  accepted uuid[];
  alldummies uuid[];
  cid uuid := 'dc000000-0000-4000-8000-000000000001';
  wnames text[] := ARRAY['Push Day','Pull Day','Leg Day'];
  f uuid; wid uuid; i int; j int; s int; d int; vol numeric; startts timestamptz; pr_val numeric;
BEGIN
  accepted   := ARRAY[u1,u2,u3];
  alldummies := ARRAY[u1,u2,u3,u4,u5];

  -- Deinen Account finden: zuerst per E-Mail (hier ggf. eintragen),
  -- sonst automatisch der älteste echte (Nicht-Dummy-)Account.
  SELECT id INTO me FROM auth.users WHERE lower(email) = lower('alltimegaminghd@gmail.com') LIMIT 1;
  IF me IS NULL THEN
    SELECT id INTO me FROM auth.users
     WHERE COALESCE(email,'') NOT LIKE '%@dummy.fitforge'
     ORDER BY created_at ASC LIMIT 1;
  END IF;
  IF me IS NULL THEN
    RAISE EXCEPTION 'Kein Account gefunden – bitte zuerst in der App registrieren/einloggen.';
  END IF;
  RAISE NOTICE 'Dummy-Daten werden mit Account % verknüpft.', (SELECT email FROM auth.users WHERE id = me);

  SELECT array_agg(id) INTO ex FROM (SELECT id FROM public.exercises ORDER BY name LIMIT 6) q;
  IF ex IS NULL THEN RAISE EXCEPTION 'Keine Übungen in public.exercises gefunden.'; END IF;
  nex := array_length(ex, 1);

  -- 1) Dummy-Auth-User anlegen (Trigger on_auth_user_created legt Profile + Rolle an)
  INSERT INTO auth.users
    (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
     raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
  VALUES
    ('00000000-0000-0000-0000-000000000000', u1, 'authenticated','authenticated','maxmuscle@dummy.fitforge', NULL, now(), now(), now(),
     '{"provider":"email","providers":["email"]}','{"username":"maxmuscle","full_name":"Max Muskel","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=max"}', false,'','','',''),
    ('00000000-0000-0000-0000-000000000000', u2, 'authenticated','authenticated','lisalift@dummy.fitforge', NULL, now(), now(), now(),
     '{"provider":"email","providers":["email"]}','{"username":"lisalift","full_name":"Lisa Lift","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=lisa"}', false,'','','',''),
    ('00000000-0000-0000-0000-000000000000', u3, 'authenticated','authenticated','tomtrains@dummy.fitforge', NULL, now(), now(), now(),
     '{"provider":"email","providers":["email"]}','{"username":"tomtrains","full_name":"Tom Trainer","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=tom"}', false,'','','',''),
    ('00000000-0000-0000-0000-000000000000', u4, 'authenticated','authenticated','sarastrong@dummy.fitforge', NULL, now(), now(), now(),
     '{"provider":"email","providers":["email"]}','{"username":"sarastrong","full_name":"Sara Stark","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=sara"}', false,'','','',''),
    ('00000000-0000-0000-0000-000000000000', u5, 'authenticated','authenticated','benchbeast@dummy.fitforge', NULL, now(), now(), now(),
     '{"provider":"email","providers":["email"]}','{"username":"benchbeast","full_name":"Ben Bankdrücker","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=ben"}', false,'','','','')
  ON CONFLICT (id) DO NOTHING;

  -- Profile etwas ausschmücken
  UPDATE public.profiles SET goal='hypertrophy',     experience='advanced',     current_streak=5, longest_streak=12, last_workout_date=current_date-1 WHERE id=u1;
  UPDATE public.profiles SET goal='strength',        experience='intermediate', current_streak=3, longest_streak=8,  last_workout_date=current_date-2 WHERE id=u2;
  UPDATE public.profiles SET goal='general_fitness', experience='beginner',     current_streak=1, longest_streak=4,  last_workout_date=current_date-3 WHERE id=u3;
  UPDATE public.profiles SET goal='strength',        experience='intermediate'                                                                       WHERE id=u4;
  UPDATE public.profiles SET goal='endurance',       experience='beginner'                                                                          WHERE id=u5;

  -- 2) Freundschaften – mit JEDEM echten Account verknüpfen (account-unabhängig,
  --    damit es unabhängig davon klappt, mit welchem Account du eingeloggt bist).
  DELETE FROM public.friendships WHERE requester_id = ANY(alldummies) OR addressee_id = ANY(alldummies);
  FOR f IN SELECT id FROM auth.users WHERE COALESCE(email,'') NOT LIKE '%@dummy.fitforge' LOOP
    INSERT INTO public.friendships (requester_id, addressee_id, status) VALUES
      (u1, f, 'accepted'),
      (u2, f, 'accepted'),
      (u3, f, 'accepted'),
      (u4, f, 'pending'),   -- eingehende Anfrage  -> in der App annehmen/ablehnen
      (f, u5, 'pending')    -- ausgehende Anfrage  -> in der App abbrechen
    ON CONFLICT (requester_id, addressee_id) DO NOTHING;
  END LOOP;

  -- 3) Dynamische Daten der Dummys zurücksetzen (für saubere Wiederholung)
  DELETE FROM public.activity_feed     WHERE user_id = ANY(alldummies);
  DELETE FROM public.personal_records  WHERE user_id = ANY(alldummies);
  DELETE FROM public.workouts          WHERE user_id = ANY(alldummies); -- Sätze via ON DELETE CASCADE

  -- 4) Workouts + Sätze + Feed-Einträge für die bestätigten Freunde
  FOREACH f IN ARRAY accepted LOOP
    FOR i IN 1..3 LOOP
      wid := gen_random_uuid();
      d := i*2 + (CASE WHEN f=u2 THEN 1 WHEN f=u3 THEN 2 ELSE 0 END);
      startts := now() - make_interval(days => d) + make_interval(hours => 18);
      INSERT INTO public.workouts (id,user_id,name,started_at,finished_at,duration_seconds,total_volume,is_completed,created_at)
      VALUES (wid, f, wnames[i], startts, startts + interval '55 minutes', 3300, 0, true, startts);

      FOR j IN 1..LEAST(3, nex) LOOP
        FOR s IN 1..3 LOOP
          INSERT INTO public.workout_sets (workout_id,exercise_id,user_id,position,set_number,reps,weight,is_completed)
          VALUES (wid, ex[j], f, j-1, s, 11 - s, 40 + j*15 + i*5, true);
        END LOOP;
      END LOOP;

      SELECT COALESCE(SUM(weight*reps),0) INTO vol FROM public.workout_sets WHERE workout_id=wid AND is_completed;
      UPDATE public.workouts SET total_volume=vol WHERE id=wid;

      INSERT INTO public.activity_feed (user_id,event_type,ref_id,data,created_at)
      VALUES (f,'workout_completed',wid,
        jsonb_build_object('name',wnames[i],'volume',vol,'duration',3300,'sets',LEAST(3,nex)*3,'prs',0), startts);
    END LOOP;

    -- ein persönlicher Rekord + Feed
    pr_val := 70 + (random()*50)::int;
    INSERT INTO public.personal_records (user_id,exercise_id,record_type,value,weight,reps,achieved_at)
    VALUES (f, ex[1], 'max_weight', pr_val, pr_val, 3, now()-interval '1 day')
    ON CONFLICT (user_id,exercise_id,record_type) DO UPDATE SET value=EXCLUDED.value, achieved_at=EXCLUDED.achieved_at;
    INSERT INTO public.activity_feed (user_id,event_type,ref_id,data,created_at)
    VALUES (f,'personal_record',NULL, jsonb_build_object('exercise_id',ex[1],'value',pr_val), now()-interval '1 day' + interval '1 minute');

    -- ein Achievement im Feed
    INSERT INTO public.activity_feed (user_id,event_type,ref_id,data,created_at)
    VALUES (f,'achievement_unlocked',NULL, jsonb_build_object('name','10 Workouts geschafft'), now()-interval '4 days');
  END LOOP;

  -- 5) Eine öffentliche Challenge mit Teilnehmern (zum Beitreten/Leaderboard testen)
  INSERT INTO public.challenges (id,name,description,metric,target_value,start_date,end_date,created_by,is_public)
  VALUES (cid,'Monats Volumen-Challenge','Wer hebt diesen Monat am meisten kg?','total_volume',100000,
          date_trunc('month',current_date)::date, (date_trunc('month',current_date)+interval '1 month - 1 day')::date, u1, true)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.challenge_participants (challenge_id,user_id,current_value) VALUES
    (cid,u1,85000),(cid,u2,62000),(cid,u3,41000)
  ON CONFLICT (challenge_id,user_id) DO NOTHING;

  RAISE NOTICE 'Dummy-Daten erstellt und mit % verknüpft.', me;
END $$;
