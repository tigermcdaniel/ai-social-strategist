import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Flame } from "lucide-react"

interface TopPost {
  id: string
  caption: string | null
  platform: string
  views: number
  engagement_rate: number | null
  saves: number
  shares: number
  content_pillar: string | null
}

export function TopPostsList({ posts }: { posts: TopPost[] }) {
  if (posts.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-warning" />
            <CardTitle className="text-sm font-medium text-foreground">Most Viral Posts</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            Ranked by viral signal (shares + saves)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex h-32 items-center justify-center">
          <p className="text-sm text-muted-foreground">Add posts to see top performers</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-warning" />
          <CardTitle className="text-sm font-medium text-foreground">Most Viral Posts</CardTitle>
        </div>
        <CardDescription className="text-muted-foreground">
          Ranked by viral signal (shares + saves)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {posts.map((post, i) => {
            const viralSignal = post.shares + post.saves
            return (
              <div
                key={post.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-secondary/50 p-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {post.caption || "Untitled post"}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-secondary text-secondary-foreground"
                    >
                      {post.platform}
                    </Badge>
                    {post.content_pillar && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-border text-muted-foreground"
                      >
                        {post.content_pillar}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span className="text-sm font-semibold text-primary">
                    {viralSignal.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {post.shares} shares / {post.saves} saves
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {post.views.toLocaleString()} views
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
