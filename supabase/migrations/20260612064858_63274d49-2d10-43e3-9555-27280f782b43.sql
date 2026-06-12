CREATE TYPE community_category AS ENUM ('story','mountain_info','gear');

CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category community_category NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  mountain_id INTEGER REFERENCES public.mountains(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "community_posts read all" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "community_posts insert own" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "community_posts update own" ON public.community_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "community_posts delete own" ON public.community_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER community_posts_updated_at BEFORE UPDATE ON public.community_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX community_posts_category_created_at_idx ON public.community_posts (category, created_at DESC);
CREATE INDEX community_posts_created_at_idx ON public.community_posts (created_at DESC);
CREATE INDEX community_posts_user_id_idx ON public.community_posts (user_id);

CREATE TABLE public.community_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
GRANT SELECT ON public.community_post_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.community_post_likes TO authenticated;
GRANT ALL ON public.community_post_likes TO service_role;
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "community_post_likes read all" ON public.community_post_likes FOR SELECT USING (true);
CREATE POLICY "community_post_likes insert own" ON public.community_post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "community_post_likes delete own" ON public.community_post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.community_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_post_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_post_comments TO authenticated;
GRANT ALL ON public.community_post_comments TO service_role;
ALTER TABLE public.community_post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "community_post_comments read all" ON public.community_post_comments FOR SELECT USING (true);
CREATE POLICY "community_post_comments insert own" ON public.community_post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "community_post_comments update own" ON public.community_post_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "community_post_comments delete own" ON public.community_post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX community_post_comments_post_id_idx ON public.community_post_comments (post_id, created_at);