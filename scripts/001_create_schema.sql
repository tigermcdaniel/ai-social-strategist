-- Posts table: stores all content performance data (Instagram + TikTok)
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
  post_date TIMESTAMPTZ NOT NULL,
  caption TEXT,
  format TEXT, -- reel, photo, carousel, video
  views INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  follows_gained INTEGER DEFAULT 0,
  -- Classification fields
  content_pillar TEXT, -- fashion, seattle lifestyle, wellness, travel, beauty, food, personal life
  content_format TEXT, -- GRWM, outfit video, storytime, vlog, educational, aesthetic, funny, review
  hook_type TEXT, -- curiosity, controversial, relatable, value, storytelling, aspirational
  -- Computed metrics (stored for performance)
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

-- Weekly reports table: stores AI-generated weekly strategy reports
CREATE TABLE IF NOT EXISTS public.weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  -- Report sections (stored as JSONB for flexibility)
  what_worked JSONB, -- { posts: [...], patterns: [...], insights: [...] }
  what_didnt_work JSONB, -- { posts: [...], reasons: [...], improvements: [...] }
  pattern_recognition JSONB, -- { trends: [...], audience_preferences: [...] }
  viral_opportunities JSONB, -- [{ idea, hook, format, reasoning, expected_outcome }]
  next_week_strategy JSONB, -- { posts: [...], focus_areas: [...], skill_focus: [...] }
  skill_recommendations JSONB, -- [{ skill, current_level, advice }]
  -- Reinforcement learning
  previous_recommendations_accuracy JSONB, -- how well last week's recs performed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select_own" ON public.weekly_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reports_insert_own" ON public.weekly_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reports_update_own" ON public.weekly_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reports_delete_own" ON public.weekly_reports FOR DELETE USING (auth.uid() = user_id);

-- Trends table: stores trending formats/topics/hooks
CREATE TABLE IF NOT EXISTS public.trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trend_type TEXT NOT NULL CHECK (trend_type IN ('format', 'topic', 'hook', 'pattern')),
  title TEXT NOT NULL,
  description TEXT,
  relevance_to_niche TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'used')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trends_select_own" ON public.trends FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trends_insert_own" ON public.trends FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trends_update_own" ON public.trends FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "trends_delete_own" ON public.trends FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_user_date ON public.posts(user_id, post_date DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_platform ON public.posts(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_reports_user_week ON public.weekly_reports(user_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_trends_user_status ON public.trends(user_id, status);
