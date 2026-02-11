import { generateText, Output } from "ai"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"
import { subDays, startOfWeek, endOfWeek, format } from "date-fns"

const reportSchema = z.object({
  summary: z.string().describe("A 2-3 sentence executive summary of the week"),
  what_worked: z.array(
    z.object({
      post_caption: z.string(),
      reason: z.string(),
      pattern: z.string(),
    })
  ).describe("Top performing posts and why they worked"),
  what_didnt_work: z.array(
    z.object({
      post_caption: z.string(),
      issue: z.string(),
      improvement: z.string(),
    })
  ).describe("Underperforming posts with specific improvement guidance"),
  patterns: z.array(
    z.object({
      observation: z.string(),
      evidence: z.string(),
      recommendation: z.string(),
    })
  ).describe("Key patterns detected in the data"),
  viral_opportunities: z.array(
    z.object({
      idea: z.string(),
      hook_suggestion: z.string(),
      format: z.string(),
      why_it_fits: z.string(),
      expected_outcome: z.string(),
    })
  ).describe("3-5 viral opportunity recommendations"),
  next_week_plan: z.array(
    z.object({
      day: z.string(),
      content_idea: z.string(),
      format: z.string(),
      hook: z.string(),
      type: z.string().describe("'viral attempt' or 'audience builder'"),
    })
  ).describe("7-day posting plan for next week"),
  skill_focus: z.array(
    z.object({
      skill: z.string(),
      why: z.string(),
      action: z.string(),
    })
  ).describe("Skills to improve this week"),
  reinforcement_notes: z.array(
    z.object({
      text: z.string(),
      type: z.string().describe("'insight' or 'adjustment' or 'validation'"),
    })
  ).describe("Learnings to carry forward"),
})

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Bypass auth for testing
  const testUserId = user?.id ?? "test-user-00000000-0000-0000-0000-000000000000"

  // Get posts from the last 30 days for analysis
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd")
  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", testUserId)
    .gte("post_date", thirtyDaysAgo)
    .order("post_date", { ascending: false })

  if (!posts || posts.length === 0) {
    return Response.json(
      { error: "No posts found. Add at least a few posts before generating a report." },
      { status: 400 }
    )
  }

  // Get previous reports for reinforcement learning
  const { data: prevReports } = await supabase
    .from("weekly_reports")
    .select("recommendations, ai_insights")
    .eq("user_id", testUserId)
    .order("week_start", { ascending: false })
    .limit(3)

  const postsContext = posts
    .map(
      (p) =>
        `[${p.post_date}] ${p.platform} | "${p.caption || "No caption"}" | Views: ${p.views}, Likes: ${p.likes}, Comments: ${p.comments}, Saves: ${p.saves}, Shares: ${p.shares}, Follows: ${p.follows_gained} | Eng: ${p.engagement_rate}% | Pillar: ${p.content_pillar || "unset"} | Format: ${p.content_format || "unset"} | Hook: ${p.hook_type || "unset"}`
    )
    .join("\n")

  const prevContext =
    prevReports && prevReports.length > 0
      ? `\n\nPrevious report recommendations:\n${prevReports.map((r) => JSON.stringify(r.recommendations)).join("\n")}`
      : ""

  const { output } = await generateText({
    model: "openai/gpt-4o",
    output: Output.object({ schema: reportSchema }),
    messages: [
      {
        role: "user",
        content: `You are an elite social media growth strategist obsessed with engineering virality. The creator's #1 goal is breaking their follower plateau and engineering intentional viral growth. Virality = high shares + saves + reach-to-follower ratio.

CRITICAL: Every analysis and recommendation must serve the goal of MAXIMIZING VIRALITY. Generic engagement advice is not enough. Focus on:
- What content has the highest share/save rates (viral signals)
- What hook patterns trigger shares (not just likes)
- What formats have disproportionate reach (viral potential)
- What content drives FOLLOWS, not just views

Here are the creator's recent posts:
${postsContext}
${prevContext}

Produce a comprehensive weekly strategy report. Be brutally specific: reference actual posts by caption, cite exact numbers, and explain WHY something went viral or didn't. Every viral opportunity must be grounded in this creator's proven data patterns. The next week plan should have at least 2-3 explicit "viral attempts" designed for maximum shareability. Compare with previous recommendations if available and note what adjustments to make based on actual results.`,
      },
    ],
  })

  if (!output) {
    return Response.json({ error: "Failed to generate report" }, { status: 500 })
  }

  // Save the report
  const now = new Date()
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd")
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd")

  const topPost = posts.reduce((best, p) =>
    Number(p.engagement_rate ?? 0) > Number(best.engagement_rate ?? 0) ? p : best
  )

  const avgEngRate =
    posts.reduce((s, p) => s + Number(p.engagement_rate ?? 0), 0) / posts.length

  const { error: insertError } = await supabase.from("weekly_reports").insert({
    user_id: testUserId,
    week_start: weekStart,
    week_end: weekEnd,
    summary: output.summary,
    top_post_id: topPost.id,
    avg_engagement_rate: avgEngRate,
    total_views: posts.reduce((s, p) => s + (p.views ?? 0), 0),
    total_likes: posts.reduce((s, p) => s + (p.likes ?? 0), 0),
    total_comments: posts.reduce((s, p) => s + (p.comments ?? 0), 0),
    total_saves: posts.reduce((s, p) => s + (p.saves ?? 0), 0),
    total_shares: posts.reduce((s, p) => s + (p.shares ?? 0), 0),
    ai_insights: [
      ...output.patterns.map((p) => ({ text: p.observation, type: "pattern" })),
      ...output.reinforcement_notes,
    ],
    recommendations: [
      ...output.viral_opportunities.map((v) => ({ text: v.idea, type: "viral" })),
      ...output.skill_focus.map((s) => ({ text: `${s.skill}: ${s.action}`, type: "skill" })),
    ],
    content_mix: {
      next_week_plan: output.next_week_plan,
      viral_opportunities: output.viral_opportunities,
      what_worked: output.what_worked,
      what_didnt_work: output.what_didnt_work,
    },
  })

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 })
  }

  return Response.json({ report: output })
}
