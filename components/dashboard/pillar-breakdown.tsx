"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface PillarData {
  name: string
  avgEngagement: number
  count: number
}

const COLORS = [
  "hsl(162, 72%, 46%)",
  "hsl(190, 70%, 50%)",
  "hsl(38, 92%, 60%)",
  "hsl(280, 60%, 60%)",
  "hsl(340, 70%, 55%)",
]

export function PillarBreakdown({ data }: { data: PillarData[] }) {
  if (data.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-foreground">Content Pillars</CardTitle>
          <CardDescription className="text-muted-foreground">Avg. engagement by content pillar</CardDescription>
        </CardHeader>
        <CardContent className="flex h-48 items-center justify-center">
          <p className="text-sm text-muted-foreground">Tag posts with pillars to see breakdown</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-foreground">Content Pillars</CardTitle>
        <CardDescription className="text-muted-foreground">Avg. engagement by content pillar</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
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
              formatter={(value: number) => [`${value.toFixed(2)}%`, "Avg Engagement"]}
            />
            <Bar dataKey="avgEngagement" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
