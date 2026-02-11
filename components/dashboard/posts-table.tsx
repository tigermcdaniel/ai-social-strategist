"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface Post {
  id: string
  platform: string
  post_date: string
  caption: string | null
  views: number
  likes: number
  comments: number
  saves: number
  shares: number
  follows_gained: number
  engagement_rate: number | null
  content_pillar: string | null
  content_format: string | null
  hook_type: string | null
}

export function PostsTable({ posts }: { posts: Post[] }) {
  const router = useRouter()

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from("posts").delete().eq("id", id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Post deleted")
      router.refresh()
    }
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <p className="text-sm text-muted-foreground">No posts yet. Add your first post to start tracking.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground">Date</TableHead>
            <TableHead className="text-muted-foreground">Platform</TableHead>
            <TableHead className="text-muted-foreground max-w-[200px]">Caption</TableHead>
            <TableHead className="text-right text-muted-foreground">Views</TableHead>
            <TableHead className="text-right text-muted-foreground">Likes</TableHead>
            <TableHead className="text-right text-muted-foreground">Saves</TableHead>
            <TableHead className="text-right text-muted-foreground">Shares</TableHead>
            <TableHead className="text-right text-muted-foreground">Eng. Rate</TableHead>
            <TableHead className="text-muted-foreground">Pillar</TableHead>
            <TableHead className="text-muted-foreground">Format</TableHead>
            <TableHead className="text-muted-foreground">Hook</TableHead>
            <TableHead className="sr-only">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => (
            <TableRow key={post.id} className="border-border hover:bg-secondary/50">
              <TableCell className="text-xs text-foreground whitespace-nowrap">
                {format(new Date(post.post_date), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-[10px] bg-secondary text-secondary-foreground">
                  {post.platform}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-sm text-foreground">
                {post.caption || "--"}
              </TableCell>
              <TableCell className="text-right text-sm text-foreground font-mono">
                {post.views.toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-sm text-foreground font-mono">
                {post.likes.toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-sm text-foreground font-mono">
                {post.saves.toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-sm text-foreground font-mono">
                {post.shares.toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-sm font-semibold text-primary font-mono">
                {post.engagement_rate ? `${Number(post.engagement_rate).toFixed(2)}%` : "--"}
              </TableCell>
              <TableCell>
                {post.content_pillar ? (
                  <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                    {post.content_pillar}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">--</span>
                )}
              </TableCell>
              <TableCell>
                {post.content_format ? (
                  <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                    {post.content_format}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">--</span>
                )}
              </TableCell>
              <TableCell>
                {post.hook_type ? (
                  <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                    {post.hook_type}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">--</span>
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(post.id)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive bg-transparent"
                  aria-label={`Delete post from ${post.post_date}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
