-- 1) Friendships: split UPDATE policy so only addressee can change status
DROP POLICY IF EXISTS "friendships update involved" ON public.friendships;

CREATE POLICY "friendships update addressee accept"
ON public.friendships
FOR UPDATE
TO authenticated
USING (auth.uid() = addressee_id)
WITH CHECK (auth.uid() = addressee_id);

-- 2) user_achievements: remove client INSERT policy (server-side only)
DROP POLICY IF EXISTS "ua insert own" ON public.user_achievements;

-- 3) exercises: restrict the "public notes" update policy to admins only
DROP POLICY IF EXISTS "exercises update public notes" ON public.exercises;

CREATE POLICY "exercises admin update public"
ON public.exercises
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) profiles: require auth to read
DROP POLICY IF EXISTS "profiles select all" ON public.profiles;

CREATE POLICY "profiles select authenticated"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.profiles FROM anon;