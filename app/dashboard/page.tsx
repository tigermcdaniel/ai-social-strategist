import { createClient } from "@/lib/supabase/server"
import { Eye, Heart, Bookmark, Share2, Users, TrendingUp } from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"
import { EngagementChart } from "@/components/dashboard/engagement-chart"
import { TopPostsList } from "@/components/dashboard/top-posts-list"
import { PillarBreakdown } from "@/components/dashboard/pillar-breakdown"
import { WeeklyFocus } from "@/components/dashboard/weekly-focus"
import { format } from "date-fns"

export default async function OverviewPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch all posts
  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", user.id)
    .order("post_date", { ascending: false })

  const allPosts = posts ?? []

  // Compute aggregated stats
  const totalViews = allPosts.reduce((s, p) => s + (p.views ?? 0), 0)
  const totalLikes = allPosts.reduce((s, p) => s + (p.likes ?? 0), 0)
  const totalSaves = allPosts.reduce((s, p) => s + (p.saves ?? 0), 0)
  const totalShares = allPosts.reduce((s, p) => s + (p.shares ?? 0), 0)
  const totalFollows = allPosts.reduce((s, p) => s + (p.follows_gained ?? 0), 0)
  const avgEngagement =
    allPosts.length > 0
      ? allPosts.reduce((s, p) => s + Number(p.engagement_rate ?? 0), 0) / allPosts.length
      : 0

  // Prepare chart data (last 30 posts)
  const chartPosts = allPosts.slice(0, 30).reverse()
  const chartData = chartPosts.map((p) => ({
    date: format(new Date(p.post_date), "MMM d"),
    engagement: Number(p.engagement_rate ?? 0),
    saves: p.views > 0 ? (p.saves / p.views) * 100 : 0,
    shares: p.views > 0 ? (p.shares / p.views) * 100 : 0,
  }))

  // Top 5 posts by engagement
  const topPosts = [...allPosts]
    .sort((a, b) => Number(b.engagement_rate ?? 0) - Number(a.engagement_rate ?? 0))
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      caption: p.caption,
      platform: p.platform,
      views: p.views ?? 0,
      engagement_rate: Number(p.engagement_rate ?? 0),
      saves: p.saves ?? 0,
      content_pillar: p.content_pillar,
    }))

  // Pillar breakdown
  const pillarMap = new Map<string, { total: number; count: number }>()
  for (const p of allPosts) {
    if (p.content_pillar) {
      const existing = pillarMap.get(p.content_pillar) ?? { total: 0, count: 0 }
      existing.total += Number(p.engagement_rate ?? 0)
      existing.count += 1
      pillarMap.set(p.content_pillar, existing)
    }
  }
  const pillarData = Array.from(pillarMap.entries()).map(([name, d]) => ({
    name,
    avgEngagement: d.count > 0 ? d.total / d.count : 0,
    count: d.count,
  }))

  // Latest weekly report
  const { data: latestReport } = await supabase
    .from("weekly_reports")
    .select("summary, recommendations")
    .eq("user_id", user.id)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Views" value={totalViews.toLocaleString()} icon={Eye} />
        <StatCard label="Total Likes" value={totalLikes.toLocaleString()} icon={Heart} />
        <StatCard label="Total Saves" value={totalSaves.toLocaleString()} icon={Bookmark} />
        <StatCard label="Total Shares" value={totalShares.toLocaleString()} icon={Share2} />
        <StatCard label="Follows Gained" value={totalFollows.toLocaleString()} icon={Users} />
        <StatCard
          label="Avg. Engagement"
          value={`${avgEngagement.toFixed(2)}%`}
          icon={TrendingUp}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <EngagementChart data={chartData} />
        <PillarBreakdown data={pillarData} />
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopPostsList posts={topPosts} />
        <WeeklyFocus
          report={
            latestReport
              ? {
                  summary: latestReport.summary,
                  recommendations: latestReport.recommendations as Array<{
                    text: string
                    type: string
                  }> | null,
                }
              : null
          }
        />
      </div>
    </div>
  )
}
