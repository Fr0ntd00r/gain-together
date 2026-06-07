-- Likes/Reaktionen auf einzelne Kommentare (analog zu feed_likes).
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.feed_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);
CREATE INDEX IF NOT EXISTS comment_likes_comment_idx ON public.comment_likes(comment_id);

GRANT SELECT, INSERT, DELETE ON public.comment_likes TO authenticated;
GRANT ALL ON public.comment_likes TO service_role;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_likes read all" ON public.comment_likes;
CREATE POLICY "comment_likes read all" ON public.comment_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "comment_likes insert own" ON public.comment_likes;
CREATE POLICY "comment_likes insert own" ON public.comment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "comment_likes delete own" ON public.comment_likes;
CREATE POLICY "comment_likes delete own" ON public.comment_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
