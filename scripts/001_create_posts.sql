CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
  post_date TIMESTAMPTZ NOT NULL,
  caption TEXT,
  format TEXT,
  views INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  follows_gained INTEGER DEFAULT 0,
  content_pillar TEXT,
  content_format TEXT,
  hook_type TEXT,
  engagement_rate NUMERIC(8,4),
  save_rate NUMERIC(8,4),
  share_rate NUMERIC(8,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_select_own" ON public.posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "posts_insert_own" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update_own" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "posts_delete_own" ON public.posts FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_posts_user_date ON public.posts(user_id, post_date DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_platform ON public.posts(user_id, platform);
