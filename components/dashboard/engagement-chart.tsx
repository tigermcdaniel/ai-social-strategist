"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface EngagementChartProps {
  data: Array<{
    date: string
    engagement: number
    saves: number
    shares: number
  }>
}

export function EngagementChart({ data }: EngagementChartProps) {
  if (data.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-foreground">Engagement Over Time</CardTitle>
          <CardDescription className="text-muted-foreground">Add posts to see your engagement trend</CardDescription>
        </CardHeader>
        <CardContent className="flex h-48 items-center justify-center">
          <p className="text-sm text-muted-foreground">No data yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-foreground">Engagement Over Time</CardTitle>
        <CardDescription className="text-muted-foreground">
          Save rate, share rate, and engagement rate trends
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(162, 72%, 46%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(162, 72%, 46%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="saveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(190, 70%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(190, 70%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 14%)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(215, 14%, 50%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(220, 14%, 14%)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(215, 14%, 50%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220, 18%, 7%)",
                border: "1px solid hsl(220, 14%, 14%)",
                borderRadius: "8px",
                color: "hsl(210, 20%, 95%)",
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value.toFixed(2)}%`]}
            />
            <Area
              type="monotone"
              dataKey="engagement"
              stroke="hsl(162, 72%, 46%)"
              fill="url(#engGrad)"
              strokeWidth={2}
              name="Engagement"
            />
            <Area
              type="monotone"
              dataKey="saves"
              stroke="hsl(190, 70%, 50%)"
              fill="url(#saveGrad)"
              strokeWidth={2}
              name="Save Rate"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
