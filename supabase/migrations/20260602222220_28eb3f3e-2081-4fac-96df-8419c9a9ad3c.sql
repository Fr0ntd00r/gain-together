CREATE POLICY "exercise images viewable by authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'exercise-images');

CREATE POLICY "authenticated can upload exercise images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'exercise-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users update own exercise images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'exercise-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users delete own exercise images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'exercise-images' AND auth.uid()::text = (storage.foldername(name))[1]);
