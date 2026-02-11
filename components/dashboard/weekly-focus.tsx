import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, Target, Zap } from "lucide-react"

interface WeeklyFocusProps {
  report: {
    summary: string | null
    recommendations: Array<{ text: string; type: string }> | null
  } | null
}

export function WeeklyFocus({ report }: WeeklyFocusProps) {
  if (!report) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-foreground">This Week&apos;s Focus</CardTitle>
          <CardDescription className="text-muted-foreground">
            Generate a weekly report to see your strategic focus
          </CardDescription>
        </CardHeader>
        <CardContent className="flex h-24 items-center justify-center">
          <p className="text-sm text-muted-foreground">No report yet</p>
        </CardContent>
      </Card>
    )
  }

  const recommendations = (report.recommendations ?? []).slice(0, 3)

  const icons = [Target, Lightbulb, Zap]

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-foreground">This Week&apos;s Focus</CardTitle>
        {report.summary && (
          <CardDescription className="text-muted-foreground line-clamp-2">
            {report.summary}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {recommendations.map((rec, i) => {
            const Icon = icons[i % icons.length]
            return (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-secondary/50 p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{rec.text}</p>
                  <Badge variant="secondary" className="mt-1 text-[10px] bg-secondary text-muted-foreground">
                    {rec.type}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
