-- Allow authenticated users to update notes/image on public exercises
CREATE POLICY "exercises update public notes"
ON public.exercises FOR UPDATE TO authenticated
USING (is_public = true)
WITH CHECK (is_public = true);
