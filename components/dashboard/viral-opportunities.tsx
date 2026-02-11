import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Flame, Lightbulb, TrendingUp } from "lucide-react"

interface ViralOpportunity {
  idea: string
  hook_suggestion: string
  format: string
  why_it_fits: string
  expected_outcome: string
}

export function ViralOpportunities({ opportunities }: { opportunities: ViralOpportunity[] }) {
  if (opportunities.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-destructive" />
            <CardTitle className="text-sm font-medium text-foreground">Viral Opportunities</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            Generate a weekly report to unlock viral content ideas tailored to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="flex h-24 items-center justify-center">
          <p className="text-sm text-muted-foreground">No opportunities yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-destructive" />
          <CardTitle className="text-sm font-medium text-foreground">Viral Opportunities</CardTitle>
        </div>
        <CardDescription className="text-muted-foreground">
          High-probability viral content ideas for your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {opportunities.map((opp, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-secondary/30 p-3"
            >
              <div className="flex items-start gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-xs font-bold text-destructive">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{opp.idea}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] border-0">
                      {opp.format}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="mt-2 ml-8 flex flex-col gap-1.5">
                <div className="flex items-start gap-1.5">
                  <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Hook:</span> {opp.hook_suggestion}
                  </p>
                </div>
                <div className="flex items-start gap-1.5">
                  <TrendingUp className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Expected:</span> {opp.expected_outcome}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
