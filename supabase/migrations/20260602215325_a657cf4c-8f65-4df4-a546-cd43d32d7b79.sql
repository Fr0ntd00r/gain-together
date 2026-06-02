
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TYPE public.fitness_goal AS ENUM ('strength','hypertrophy','endurance','weight_loss','general_fitness');
CREATE TYPE public.experience_level AS ENUM ('beginner','intermediate','advanced');
CREATE TYPE public.muscle_group AS ENUM ('chest','back','shoulders','biceps','triceps','forearms','quads','hamstrings','glutes','calves','core','full_body','cardio');
CREATE TYPE public.equipment_type AS ENUM ('barbell','dumbbell','machine','cable','bodyweight','kettlebell','bands','cardio_machine','other');
CREATE TYPE public.friendship_status AS ENUM ('pending','accepted','blocked');
CREATE TYPE public.feed_event_type AS ENUM ('workout_completed','personal_record','achievement_unlocked','challenge_joined','challenge_completed');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  goal public.fitness_goal DEFAULT 'general_fitness',
  experience public.experience_level DEFAULT 'beginner',
  weight_unit TEXT DEFAULT 'kg' CHECK (weight_unit IN ('kg','lb')),
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_workout_date DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles select all" ON public.profiles FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid()=id) WITH CHECK (auth.uid()=id);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid()=id);

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles select own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid()=user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

-- FRIENDSHIPS (created early so other policies can reference it)
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);
CREATE INDEX friendships_users_idx ON public.friendships(requester_id, addressee_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friendships select involved" ON public.friendships FOR SELECT TO authenticated USING (auth.uid() IN (requester_id, addressee_id));
CREATE POLICY "friendships insert as requester" ON public.friendships FOR INSERT TO authenticated WITH CHECK (auth.uid()=requester_id);
CREATE POLICY "friendships update involved" ON public.friendships FOR UPDATE TO authenticated USING (auth.uid() IN (requester_id, addressee_id));
CREATE POLICY "friendships delete involved" ON public.friendships FOR DELETE TO authenticated USING (auth.uid() IN (requester_id, addressee_id));

-- Helper: is_friend
CREATE OR REPLACE FUNCTION public.is_friend(_a UUID, _b UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status='accepted'
      AND ((requester_id=_a AND addressee_id=_b) OR (requester_id=_b AND addressee_id=_a))
  )
$$;

-- EXERCISES
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  primary_muscle public.muscle_group NOT NULL,
  secondary_muscles public.muscle_group[] DEFAULT '{}',
  equipment public.equipment_type NOT NULL,
  is_compound BOOLEAN DEFAULT false,
  instructions TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX exercises_muscle_idx ON public.exercises(primary_muscle);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT SELECT ON public.exercises TO anon;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercises read public or own" ON public.exercises FOR SELECT TO authenticated, anon USING (is_public OR created_by = auth.uid());
CREATE POLICY "exercises insert own" ON public.exercises FOR INSERT TO authenticated WITH CHECK (auth.uid()=created_by);
CREATE POLICY "exercises update own" ON public.exercises FOR UPDATE TO authenticated USING (auth.uid()=created_by);
CREATE POLICY "exercises delete own" ON public.exercises FOR DELETE TO authenticated USING (auth.uid()=created_by);

-- WORKOUT TEMPLATES
CREATE TABLE public.workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  is_official BOOLEAN DEFAULT false,
  difficulty public.experience_level DEFAULT 'beginner',
  estimated_duration_min INT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_templates TO authenticated;
GRANT SELECT ON public.workout_templates TO anon;
GRANT ALL ON public.workout_templates TO service_role;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates read" ON public.workout_templates FOR SELECT TO authenticated, anon USING (is_public OR is_official OR created_by = auth.uid());
CREATE POLICY "templates insert own" ON public.workout_templates FOR INSERT TO authenticated WITH CHECK (auth.uid()=created_by);
CREATE POLICY "templates update own" ON public.workout_templates FOR UPDATE TO authenticated USING (auth.uid()=created_by);
CREATE POLICY "templates delete own" ON public.workout_templates FOR DELETE TO authenticated USING (auth.uid()=created_by);

CREATE TABLE public.template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  position INT NOT NULL DEFAULT 0,
  target_sets INT DEFAULT 3,
  target_reps INT DEFAULT 10,
  target_weight NUMERIC,
  rest_seconds INT DEFAULT 90,
  notes TEXT
);
CREATE INDEX template_exercises_template_idx ON public.template_exercises(template_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_exercises TO authenticated;
GRANT SELECT ON public.template_exercises TO anon;
GRANT ALL ON public.template_exercises TO service_role;
ALTER TABLE public.template_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "te read via template" ON public.template_exercises FOR SELECT TO authenticated, anon USING (
  EXISTS (SELECT 1 FROM public.workout_templates t WHERE t.id=template_id AND (t.is_public OR t.is_official OR t.created_by=auth.uid()))
);
CREATE POLICY "te modify via own template" ON public.template_exercises FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.workout_templates t WHERE t.id=template_id AND t.created_by=auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.workout_templates t WHERE t.id=template_id AND t.created_by=auth.uid())
);

-- WORKOUTS
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT 'Workout',
  started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  finished_at TIMESTAMPTZ,
  duration_seconds INT,
  notes TEXT,
  total_volume NUMERIC DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX workouts_user_idx ON public.workouts(user_id, started_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated;
GRANT ALL ON public.workouts TO service_role;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workouts select" ON public.workouts FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_friend(auth.uid(), user_id));
CREATE POLICY "workouts insert own" ON public.workouts FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "workouts update own" ON public.workouts FOR UPDATE TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "workouts delete own" ON public.workouts FOR DELETE TO authenticated USING (auth.uid()=user_id);

CREATE TABLE public.workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  set_number INT NOT NULL DEFAULT 1,
  reps INT,
  weight NUMERIC,
  rpe NUMERIC,
  is_warmup BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX ws_workout_idx ON public.workout_sets(workout_id);
CREATE INDEX ws_user_ex_idx ON public.workout_sets(user_id, exercise_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sets TO authenticated;
GRANT ALL ON public.workout_sets TO service_role;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sets select" ON public.workout_sets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_friend(auth.uid(), user_id));
CREATE POLICY "sets insert own" ON public.workout_sets FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "sets update own" ON public.workout_sets FOR UPDATE TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "sets delete own" ON public.workout_sets FOR DELETE TO authenticated USING (auth.uid()=user_id);

-- PERSONAL RECORDS
CREATE TABLE public.personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('1rm','max_weight','max_reps','max_volume')),
  value NUMERIC NOT NULL,
  reps INT,
  weight NUMERIC,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
  achieved_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, exercise_id, record_type)
);
CREATE INDEX pr_user_idx ON public.personal_records(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_records TO authenticated;
GRANT ALL ON public.personal_records TO service_role;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr select" ON public.personal_records FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_friend(auth.uid(), user_id));
CREATE POLICY "pr modify own" ON public.personal_records FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- ACHIEVEMENTS
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','platinum')),
  criteria JSONB DEFAULT '{}'::jsonb
);
GRANT SELECT ON public.achievements TO authenticated, anon;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements public read" ON public.achievements FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, achievement_id)
);
GRANT SELECT, INSERT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ua read all" ON public.user_achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "ua insert own" ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);

-- CHALLENGES
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  metric TEXT NOT NULL CHECK (metric IN ('workouts_count','total_volume','total_duration','exercise_volume')),
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  target_value NUMERIC,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges read" ON public.challenges FOR SELECT TO authenticated USING (is_public OR created_by=auth.uid());
CREATE POLICY "challenges insert own" ON public.challenges FOR INSERT TO authenticated WITH CHECK (auth.uid()=created_by);
CREATE POLICY "challenges update own" ON public.challenges FOR UPDATE TO authenticated USING (auth.uid()=created_by);
CREATE POLICY "challenges delete own" ON public.challenges FOR DELETE TO authenticated USING (auth.uid()=created_by);

CREATE TABLE public.challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  current_value NUMERIC DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  UNIQUE (challenge_id, user_id)
);
CREATE INDEX cp_challenge_idx ON public.challenge_participants(challenge_id, current_value DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_participants TO authenticated;
GRANT ALL ON public.challenge_participants TO service_role;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp read all" ON public.challenge_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "cp join self" ON public.challenge_participants FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "cp update self" ON public.challenge_participants FOR UPDATE TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "cp delete self" ON public.challenge_participants FOR DELETE TO authenticated USING (auth.uid()=user_id);

-- ACTIVITY FEED + LIKES + COMMENTS
CREATE TABLE public.activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type public.feed_event_type NOT NULL,
  ref_id UUID,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX feed_user_idx ON public.activity_feed(user_id, created_at DESC);
CREATE INDEX feed_created_idx ON public.activity_feed(created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.activity_feed TO authenticated;
GRANT ALL ON public.activity_feed TO service_role;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feed select" ON public.activity_feed FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_friend(auth.uid(), user_id));
CREATE POLICY "feed insert own" ON public.activity_feed FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "feed delete own" ON public.activity_feed FOR DELETE TO authenticated USING (auth.uid()=user_id);

CREATE TABLE public.feed_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id UUID NOT NULL REFERENCES public.activity_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (feed_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.feed_likes TO authenticated;
GRANT ALL ON public.feed_likes TO service_role;
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes read all" ON public.feed_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "likes insert own" ON public.feed_likes FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "likes delete own" ON public.feed_likes FOR DELETE TO authenticated USING (auth.uid()=user_id);

CREATE TABLE public.feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id UUID NOT NULL REFERENCES public.activity_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX comments_feed_idx ON public.feed_comments(feed_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_comments TO authenticated;
GRANT ALL ON public.feed_comments TO service_role;
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments read all" ON public.feed_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "comments insert own" ON public.feed_comments FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "comments update own" ON public.feed_comments FOR UPDATE TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "comments delete own" ON public.feed_comments FOR DELETE TO authenticated USING (auth.uid()=user_id);

-- TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  base_username TEXT; final_username TEXT; counter INT := 0;
BEGIN
  base_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'lifter');
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  IF length(base_username) < 3 THEN base_username := base_username || 'user'; END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (NEW.id, final_username, COALESCE(NEW.raw_user_meta_data->>'full_name', final_username), NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON public.workout_templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_friendships_updated BEFORE UPDATE ON public.friendships FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
