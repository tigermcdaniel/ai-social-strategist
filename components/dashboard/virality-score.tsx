"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap } from "lucide-react"

interface ViralityScoreProps {
  score: number
  viralSpikes: number
  shareRate: number
  saveRate: number
  bestViralPost: string | null
}

export function ViralityScore({ score, viralSpikes, shareRate, saveRate, bestViralPost }: ViralityScoreProps) {
  const getScoreColor = (s: number) => {
    if (s >= 70) return "text-success"
    if (s >= 40) return "text-warning"
    return "text-destructive"
  }

  const getScoreLabel = (s: number) => {
    if (s >= 70) return "High viral potential"
    if (s >= 40) return "Building momentum"
    return "Needs more shareability"
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm font-medium text-foreground">Virality Score</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Your content&apos;s viral potential
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold tracking-tight ${getScoreColor(score)}`}>
            {score}
          </span>
          <span className="text-sm text-muted-foreground">/ 100</span>
        </div>
        <p className={`mt-1 text-xs font-medium ${getScoreColor(score)}`}>
          {getScoreLabel(score)}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-secondary/50 p-2">
            <p className="text-lg font-semibold text-foreground">{viralSpikes}</p>
            <p className="text-[10px] text-muted-foreground">Viral spikes</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-2">
            <p className="text-lg font-semibold text-foreground">{shareRate.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground">Share rate</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-2">
            <p className="text-lg font-semibold text-foreground">{saveRate.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground">Save rate</p>
          </div>
        </div>

        {bestViralPost && (
          <div className="mt-3 rounded-lg border border-border bg-card p-2">
            <p className="text-[10px] font-medium text-primary">Best viral post</p>
            <p className="mt-0.5 truncate text-xs text-foreground">{bestViralPost}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
