import { createClient } from "@/lib/supabase/server"
import {
  Eye,
  Heart,
  Bookmark,
  Share2,
  Users,
  TrendingUp,
} from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"
import { EngagementChart } from "@/components/dashboard/engagement-chart"
import { TopPostsList } from "@/components/dashboard/top-posts-list"
import { PillarBreakdown } from "@/components/dashboard/pillar-breakdown"
import { WeeklyFocus } from "@/components/dashboard/weekly-focus"
import { ViralityScore } from "@/components/dashboard/virality-score"
import { ViralOpportunities } from "@/components/dashboard/viral-opportunities"
import { format } from "date-fns"

function computeViralityScore(posts: Array<Record<string, unknown>>) {
  if (posts.length === 0) return { score: 0, viralSpikes: 0, shareRate: 0, saveRate: 0, bestViralPost: null as string | null }

  const totalViews = posts.reduce((s, p) => s + (Number(p.views) || 0), 0)
  const totalShares = posts.reduce((s, p) => s + (Number(p.shares) || 0), 0)
  const totalSaves = posts.reduce((s, p) => s + (Number(p.saves) || 0), 0)

  const shareRate = totalViews > 0 ? (totalShares / totalViews) * 100 : 0
  const saveRate = totalViews > 0 ? (totalSaves / totalViews) * 100 : 0

  // Viral spikes: posts where views > 3x avg views
  const avgViews = totalViews / posts.length
  const viralSpikes = posts.filter((p) => (Number(p.views) || 0) > avgViews * 3).length

  // Virality score formula:
  // Share rate drives virality most (40%), save rate signals value (30%),
  // viral spikes show momentum (20%), engagement rate baseline (10%)
  const avgEngagement = posts.reduce((s, p) => s + Number(p.engagement_rate ?? 0), 0) / posts.length

  const shareComponent = Math.min(shareRate * 10, 40) // max 40 pts
  const saveComponent = Math.min(saveRate * 6, 30) // max 30 pts
  const spikeComponent = Math.min((viralSpikes / posts.length) * 100, 20) // max 20 pts
  const engComponent = Math.min(avgEngagement * 2, 10) // max 10 pts

  const score = Math.round(shareComponent + saveComponent + spikeComponent + engComponent)

  // Best viral post = highest (shares + saves)
  const bestPost = posts.reduce((best, p) => {
    const viralSignal = (Number(p.shares) || 0) + (Number(p.saves) || 0)
    const bestSignal = (Number(best.shares) || 0) + (Number(best.saves) || 0)
    return viralSignal > bestSignal ? p : best
  })

  return {
    score: Math.min(score, 100),
    viralSpikes,
    shareRate,
    saveRate,
    bestViralPost: (bestPost.caption as string) || null,
  }
}

export default async function OverviewPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Bypass auth for testing
  const testUserId = user?.id ?? "00000000-0000-0000-0000-000000000000"

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", testUserId)
    .order("post_date", { ascending: false })

  const allPosts = posts ?? []

  // Core metrics
  const totalViews = allPosts.reduce((s, p) => s + (p.views ?? 0), 0)
  const totalLikes = allPosts.reduce((s, p) => s + (p.likes ?? 0), 0)
  const totalSaves = allPosts.reduce((s, p) => s + (p.saves ?? 0), 0)
  const totalShares = allPosts.reduce((s, p) => s + (p.shares ?? 0), 0)
  const totalFollows = allPosts.reduce(
    (s, p) => s + (p.follows_gained ?? 0),
    0,
  )
  const avgEngagement =
    allPosts.length > 0
      ? allPosts.reduce((s, p) => s + Number(p.engagement_rate ?? 0), 0) /
        allPosts.length
      : 0

  // Virality metrics
  const viralMetrics = computeViralityScore(allPosts)

  // Chart data (last 30 posts)
  const chartPosts = allPosts.slice(0, 30).reverse()
  const chartData = chartPosts.map((p) => ({
    date: format(new Date(p.post_date), "MMM d"),
    engagement: Number(p.engagement_rate ?? 0),
    saves: p.views > 0 ? (p.saves / p.views) * 100 : 0,
    shares: p.views > 0 ? (p.shares / p.views) * 100 : 0,
  }))

  // Top 5 posts by viral signal (shares + saves), NOT just engagement
  const topPosts = [...allPosts]
    .sort(
      (a, b) =>
        (b.shares ?? 0) +
        (b.saves ?? 0) -
        ((a.shares ?? 0) + (a.saves ?? 0)),
    )
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      caption: p.caption,
      platform: p.platform,
      views: p.views ?? 0,
      engagement_rate: Number(p.engagement_rate ?? 0),
      saves: p.saves ?? 0,
      shares: p.shares ?? 0,
      content_pillar: p.content_pillar,
    }))

  // Pillar breakdown
  const pillarMap = new Map<string, { total: number; count: number; shares: number; saves: number }>()
  for (const p of allPosts) {
    if (p.content_pillar) {
      const existing = pillarMap.get(p.content_pillar) ?? {
        total: 0,
        count: 0,
        shares: 0,
        saves: 0,
      }
      existing.total += Number(p.engagement_rate ?? 0)
      existing.count += 1
      existing.shares += p.shares ?? 0
      existing.saves += p.saves ?? 0
      pillarMap.set(p.content_pillar, existing)
    }
  }
  const pillarData = Array.from(pillarMap.entries()).map(([name, d]) => ({
    name,
    avgEngagement: d.count > 0 ? d.total / d.count : 0,
    count: d.count,
  }))

  // Latest report for viral opportunities + weekly focus
  const { data: latestReport } = await supabase
    .from("weekly_reports")
    .select("summary, recommendations, ai_insights, content_mix")
    .eq("user_id", testUserId)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle()

  // Extract viral opportunities from the latest report's content_mix
  const viralOpportunities = latestReport?.content_mix?.viral_opportunities ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Hero: Virality Score + Key Viral Metrics */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ViralityScore
          score={viralMetrics.score}
          viralSpikes={viralMetrics.viralSpikes}
          shareRate={viralMetrics.shareRate}
          saveRate={viralMetrics.saveRate}
          bestViralPost={viralMetrics.bestViralPost}
        />
        <div className="grid grid-cols-2 gap-4 lg:col-span-2 lg:grid-cols-3">
          <StatCard
            label="Total Views"
            value={totalViews.toLocaleString()}
            icon={Eye}
          />
          <StatCard
            label="Total Likes"
            value={totalLikes.toLocaleString()}
            icon={Heart}
          />
          <StatCard
            label="Total Saves"
            value={totalSaves.toLocaleString()}
            icon={Bookmark}
          />
          <StatCard
            label="Total Shares"
            value={totalShares.toLocaleString()}
            icon={Share2}
          />
          <StatCard
            label="Follows Gained"
            value={totalFollows.toLocaleString()}
            icon={Users}
          />
          <StatCard
            label="Avg. Engagement"
            value={`${avgEngagement.toFixed(2)}%`}
            icon={TrendingUp}
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <EngagementChart data={chartData} />
        <PillarBreakdown data={pillarData} />
      </div>

      {/* Bottom: Viral Opportunities + Top Posts + Weekly Focus */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ViralOpportunities opportunities={viralOpportunities} />
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
