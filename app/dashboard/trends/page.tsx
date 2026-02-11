"use client"

import useSWR, { mutate } from "swr"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, Music, Video, Hash, MessageSquare, Zap, Eye, CheckCircle2, Clock } from "lucide-react"
import { AddTrendDialog } from "@/components/dashboard/add-trend-dialog"
import { toast } from "sonner"

interface Trend {
  id: string
  platform: string
  trend_type: string
  title: string
  description: string | null
  relevance_score: number
  status: string
  source: string | null
  created_at: string
}

const fetcher = async (): Promise<Trend[]> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("trends")
    .select("*")
    .order("relevance_score", { ascending: false })

  if (error) throw error
  return data ?? []
}

const typeIcons = {
  audio: Music,
  format: Video,
  topic: MessageSquare,
  hashtag: Hash,
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Eye }> = {
  new: { label: "New", color: "text-primary", icon: Sparkles },
  watching: { label: "Watching", color: "text-warning", icon: Eye },
  acted: { label: "Acted On", color: "text-success", icon: CheckCircle2 },
  expired: { label: "Expired", color: "text-muted-foreground", icon: Clock },
}

export default function TrendsPage() {
  const { data: trends, isLoading } = useSWR("trends", fetcher)

  async function updateStatus(id: string, status: string) {
    const supabase = createClient()
    const { error } = await supabase.from("trends").update({ status }).eq("id", id)
    if (error) {
      toast.error("Failed to update status")
    } else {
      mutate("trends")
    }
  }

  const newTrends = trends?.filter((t) => t.status === "new") ?? []
  const watchingTrends = trends?.filter((t) => t.status === "watching") ?? []
  const actedTrends = trends?.filter((t) => t.status === "acted") ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Trends & Opportunities</h2>
          <p className="text-sm text-muted-foreground">
            Track viral formats, topics, and sounds. Match them to your niche for maximum growth.
          </p>
        </div>
        <AddTrendDialog />
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !trends || trends.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Sparkles className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No trends tracked yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add trending formats, audios, and topics you spot on social media
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* New / Unactioned */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">
                New ({newTrends.length})
              </h3>
            </div>
            {newTrends.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-8 text-center">
                  <p className="text-xs text-muted-foreground">No new trends</p>
                </CardContent>
              </Card>
            ) : (
              newTrends.map((trend) => (
                <TrendCard key={trend.id} trend={trend} onUpdateStatus={updateStatus} />
              ))
            )}
          </div>

          {/* Watching */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-medium text-foreground">
                Watching ({watchingTrends.length})
              </h3>
            </div>
            {watchingTrends.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-8 text-center">
                  <p className="text-xs text-muted-foreground">No trends being watched</p>
                </CardContent>
              </Card>
            ) : (
              watchingTrends.map((trend) => (
                <TrendCard key={trend.id} trend={trend} onUpdateStatus={updateStatus} />
              ))
            )}
          </div>

          {/* Acted On */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <h3 className="text-sm font-medium text-foreground">
                Acted On ({actedTrends.length})
              </h3>
            </div>
            {actedTrends.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-8 text-center">
                  <p className="text-xs text-muted-foreground">
                    No trends acted on yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              actedTrends.map((trend) => (
                <TrendCard key={trend.id} trend={trend} onUpdateStatus={updateStatus} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TrendCard({
  trend,
  onUpdateStatus,
}: {
  trend: Trend
  onUpdateStatus: (id: string, status: string) => void
}) {
  const TypeIcon = typeIcons[trend.trend_type as keyof typeof typeIcons] ?? Sparkles
  const statusInfo = statusConfig[trend.status] ?? statusConfig.new

  const relevanceColor =
    trend.relevance_score >= 70
      ? "text-success"
      : trend.relevance_score >= 40
        ? "text-warning"
        : "text-muted-foreground"

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <TypeIcon className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-foreground">
                {trend.title}
              </CardTitle>
              <div className="mt-0.5 flex items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px] bg-secondary text-secondary-foreground">
                  {trend.platform}
                </Badge>
                <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                  {trend.trend_type}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-sm font-bold font-mono ${relevanceColor}`}>
              {trend.relevance_score}
            </span>
            <span className="text-[10px] text-muted-foreground">relevance</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {trend.description && (
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            {trend.description}
          </p>
        )}
        {trend.source && (
          <p className="mb-3 text-[10px] text-muted-foreground">
            Source: {trend.source}
          </p>
        )}
        <div className="flex items-center gap-2">
          {trend.status === "new" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] border-border text-foreground bg-transparent"
                onClick={() => onUpdateStatus(trend.id, "watching")}
              >
                <Eye className="mr-1 h-3 w-3" />
                Watch
              </Button>
              <Button
                size="sm"
                className="h-7 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => onUpdateStatus(trend.id, "acted")}
              >
                <Zap className="mr-1 h-3 w-3" />
                Act on it
              </Button>
            </>
          )}
          {trend.status === "watching" && (
            <Button
              size="sm"
              className="h-7 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => onUpdateStatus(trend.id, "acted")}
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Mark acted
            </Button>
          )}
          {trend.status === "acted" && (
            <span className={`flex items-center gap-1 text-[11px] ${statusInfo.color}`}>
              <CheckCircle2 className="h-3 w-3" />
              Done
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
