CREATE TABLE IF NOT EXISTS public.weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  what_worked JSONB,
  what_didnt_work JSONB,
  pattern_recognition JSONB,
  viral_opportunities JSONB,
  next_week_strategy JSONB,
  skill_recommendations JSONB,
  previous_recommendations_accuracy JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select_own" ON public.weekly_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reports_insert_own" ON public.weekly_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reports_update_own" ON public.weekly_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reports_delete_own" ON public.weekly_reports FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reports_user_week ON public.weekly_reports(user_id, week_start DESC);
