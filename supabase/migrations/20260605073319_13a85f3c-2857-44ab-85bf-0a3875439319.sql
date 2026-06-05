
-- 1) user_achievements: restrict reads to self or friends
DROP POLICY IF EXISTS "ua read all" ON public.user_achievements;
CREATE POLICY "ua read self or friends" ON public.user_achievements
  FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR public.is_friend(auth.uid(), user_id));

-- 2) personal_records: drop client write (ALL) policy; keep select
DROP POLICY IF EXISTS "pr modify own" ON public.personal_records;
-- pr select policy already exists and remains

-- 3) activity_feed: drop client insert; keep select + delete
DROP POLICY IF EXISTS "feed insert own" ON public.activity_feed;
