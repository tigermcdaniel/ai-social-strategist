"use client"

import { useState, useCallback } from "react"
import useSWR, { mutate } from "swr"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Zap,
  Target,
  Lightbulb,
  TrendingUp,
  Calendar,
  Brain,
  ArrowRight,
} from "lucide-react"
import { toast } from "sonner"

interface Report {
  id: string
  week_start: string
  week_end: string
  summary: string | null
  avg_engagement_rate: number | null
  total_views: number
  total_saves: number
  total_shares: number
  ai_insights: Array<{ text: string; type: string }> | null
  recommendations: Array<{ text: string; type: string }> | null
  content_mix: {
    next_week_plan?: Array<{
      day: string
      content_idea: string
      format: string
      hook: string
      type: string
    }>
    viral_opportunities?: Array<{
      idea: string
      hook_suggestion: string
      format: string
      why_it_fits: string
      expected_outcome: string
    }>
    what_worked?: Array<{
      post_caption: string
      reason: string
      pattern: string
    }>
    what_didnt_work?: Array<{
      post_caption: string
      issue: string
      improvement: string
    }>
  } | null
}

const fetcher = async (): Promise<Report[]> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .order("week_start", { ascending: false })
    .limit(10)

  if (error) throw error
  return data ?? []
}

export default function ReportsPage() {
  const { data: reports, isLoading } = useSWR("weekly_reports", fetcher)
  const [generating, setGenerating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const generateReport = useCallback(async () => {
    setGenerating(true)
    try {
      const res = await fetch("/api/generate-report", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to generate report")
        return
      }
      toast.success("Weekly strategy report generated")
      mutate("weekly_reports")
    } catch {
      toast.error("Something went wrong generating the report")
    } finally {
      setGenerating(false)
    }
  }, [])

  const latestReport = reports?.[0]
  const expanded = expandedId ? reports?.find((r) => r.id === expandedId) : latestReport

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Weekly Strategy</h2>
          <p className="text-sm text-muted-foreground">
            AI-powered viral growth analysis and next-week game plan
          </p>
        </div>
        <Button
          onClick={generateReport}
          disabled={generating}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Report
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !reports || reports.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Sparkles className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No reports yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add some posts and generate your first viral growth strategy
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-4">
          {/* Report selector sidebar */}
          <div className="flex flex-col gap-2 xl:col-span-1">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Past Reports</p>
            {reports.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setExpandedId(r.id)}
                className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors ${
                  (expanded?.id ?? latestReport?.id) === r.id
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-card hover:bg-secondary/50"
                }`}
              >
                <span className="text-xs font-medium text-foreground">
                  Week of {new Date(r.week_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <span className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                  {r.summary || "No summary"}
                </span>
              </button>
            ))}
          </div>

          {/* Report detail */}
          {expanded && (
            <div className="flex flex-col gap-5 xl:col-span-3">
              {/* Summary */}
              <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-medium text-foreground">
                      Week of {new Date(expanded.week_start).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-foreground">
                    {expanded.summary || "No summary available"}
                  </p>
                  <div className="mt-4 flex gap-4">
                    <div className="rounded-lg bg-card/50 px-3 py-2">
                      <p className="text-lg font-semibold text-foreground">{expanded.total_views?.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Views</p>
                    </div>
                    <div className="rounded-lg bg-card/50 px-3 py-2">
                      <p className="text-lg font-semibold text-foreground">{expanded.total_shares?.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Shares</p>
                    </div>
                    <div className="rounded-lg bg-card/50 px-3 py-2">
                      <p className="text-lg font-semibold text-foreground">{expanded.total_saves?.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Saves</p>
                    </div>
                    <div className="rounded-lg bg-card/50 px-3 py-2">
                      <p className="text-lg font-semibold text-primary">
                        {expanded.avg_engagement_rate ? `${Number(expanded.avg_engagement_rate).toFixed(2)}%` : "--"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Avg Eng.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* What Worked / What Didn't */}
              <div className="grid gap-5 md:grid-cols-2">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <CardTitle className="text-sm font-medium text-foreground">What Worked</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {expanded.content_mix?.what_worked && expanded.content_mix.what_worked.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {expanded.content_mix.what_worked.map((item, i) => (
                          <div key={i} className="rounded-lg bg-success/5 border border-success/10 p-3">
                            <p className="text-xs font-medium text-foreground line-clamp-1">
                              &ldquo;{item.post_caption}&rdquo;
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
                            <Badge variant="secondary" className="mt-1.5 bg-success/10 text-success text-[10px] border-0">
                              {item.pattern}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No data in this report</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <CardTitle className="text-sm font-medium text-foreground">What Didn&apos;t Work</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {expanded.content_mix?.what_didnt_work && expanded.content_mix.what_didnt_work.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {expanded.content_mix.what_didnt_work.map((item, i) => (
                          <div key={i} className="rounded-lg bg-destructive/5 border border-destructive/10 p-3">
                            <p className="text-xs font-medium text-foreground line-clamp-1">
                              &ldquo;{item.post_caption}&rdquo;
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.issue}</p>
                            <div className="mt-1.5 flex items-start gap-1">
                              <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                              <p className="text-[11px] text-primary">{item.improvement}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No data in this report</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Viral Opportunities */}
              {expanded.content_mix?.viral_opportunities && expanded.content_mix.viral_opportunities.length > 0 && (
                <Card className="border-destructive/20 bg-gradient-to-br from-card to-destructive/5">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-destructive" />
                      <CardTitle className="text-sm font-medium text-foreground">
                        Viral Opportunities
                      </CardTitle>
                    </div>
                    <CardDescription className="text-muted-foreground">
                      Highest probability viral content for your account this week
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2">
                      {expanded.content_mix.viral_opportunities.map((opp, i) => (
                        <div key={i} className="rounded-lg border border-border bg-card p-3">
                          <div className="flex items-start gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-[10px] font-bold text-destructive">
                              {i + 1}
                            </span>
                            <p className="text-sm font-medium text-foreground">{opp.idea}</p>
                          </div>
                          <div className="mt-2 ml-7 flex flex-col gap-1">
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">Hook:</span> {opp.hook_suggestion}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">Why:</span> {opp.why_it_fits}
                            </p>
                            <p className="text-xs text-success">
                              <span className="font-medium">Expected:</span> {opp.expected_outcome}
                            </p>
                            <Badge variant="secondary" className="mt-1 w-fit bg-primary/10 text-primary text-[10px] border-0">
                              {opp.format}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Next Week Plan */}
              {expanded.content_mix?.next_week_plan && expanded.content_mix.next_week_plan.length > 0 && (
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <CardTitle className="text-sm font-medium text-foreground">
                        Next Week Posting Plan
                      </CardTitle>
                    </div>
                    <CardDescription className="text-muted-foreground">
                      Your content calendar with viral attempts marked
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      {expanded.content_mix.next_week_plan.map((day, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-3 rounded-lg border p-3 ${
                            day.type?.toLowerCase().includes("viral")
                              ? "border-destructive/20 bg-destructive/5"
                              : "border-border bg-secondary/30"
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-semibold text-foreground">{day.day}</span>
                            {day.type?.toLowerCase().includes("viral") && (
                              <Zap className="mt-1 h-3 w-3 text-destructive" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">{day.content_idea}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">Hook:</span> {day.hook}
                            </p>
                            <div className="mt-1.5 flex gap-1.5">
                              <Badge variant="secondary" className="text-[10px] bg-secondary text-secondary-foreground">
                                {day.format}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className={`text-[10px] border-0 ${
                                  day.type?.toLowerCase().includes("viral")
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-primary/10 text-primary"
                                }`}
                              >
                                {day.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Insights + Recommendations */}
              <div className="grid gap-5 md:grid-cols-2">
                {expanded.ai_insights && expanded.ai_insights.length > 0 && (
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-warning" />
                        <CardTitle className="text-sm font-medium text-foreground">Patterns & Insights</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        {expanded.ai_insights.map((insight, i) => (
                          <div key={i} className="flex items-start gap-2 rounded-lg bg-secondary/30 p-2">
                            <TrendingUp className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                            <p className="text-xs text-foreground">{insight.text}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {expanded.recommendations && expanded.recommendations.length > 0 && (
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-medium text-foreground">Skill Focus & Actions</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        {expanded.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-2 rounded-lg bg-secondary/30 p-2">
                            <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                            <div>
                              <p className="text-xs text-foreground">{rec.text}</p>
                              <Badge variant="secondary" className="mt-1 text-[10px] bg-secondary text-muted-foreground">
                                {rec.type}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
