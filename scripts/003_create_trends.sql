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

CREATE INDEX IF NOT EXISTS idx_trends_user_status ON public.trends(user_id, status);
