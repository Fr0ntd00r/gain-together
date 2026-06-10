-- activity_feed INSERT
CREATE POLICY "activity_feed insert own"
ON public.activity_feed FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- notifications: block client-side inserts; only SECURITY DEFINER triggers (owned by postgres, BYPASSRLS) may insert
CREATE POLICY "notifications no client insert"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (false);

-- personal_records: own-row CRUD
CREATE POLICY "pr insert own"
ON public.personal_records FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pr update own"
ON public.personal_records FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pr delete own"
ON public.personal_records FOR DELETE TO authenticated
USING (auth.uid() = user_id);