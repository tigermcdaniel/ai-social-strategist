"use client"

import React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

const PILLARS = [
  "fashion",
  "lifestyle",
  "wellness",
  "travel",
  "beauty",
  "food",
  "personal",
  "entertainment",
  "education",
  "tech",
]

const FORMATS = [
  "reel",
  "photo",
  "carousel",
  "GRWM",
  "outfit video",
  "storytime",
  "vlog",
  "educational",
  "aesthetic",
  "funny/opinion",
  "review",
]

const HOOK_TYPES = [
  "curiosity",
  "controversial",
  "relatable",
  "saveable",
  "storytelling",
  "aspirational",
  "trending audio",
]

export function AddPostDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const views = Number(form.get("views") ?? 0)
    const likes = Number(form.get("likes") ?? 0)
    const comments = Number(form.get("comments") ?? 0)
    const saves = Number(form.get("saves") ?? 0)
    const shares = Number(form.get("shares") ?? 0)

    const engagement_rate = views > 0 ? ((likes + comments + saves + shares) / views) * 100 : 0
    const save_rate = views > 0 ? (saves / views) * 100 : 0
    const share_rate = views > 0 ? (shares / views) * 100 : 0

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Bypass auth for testing
    const userId = user?.id ?? "test-user-00000000-0000-0000-0000-000000000000"

    const { error } = await supabase.from("posts").insert({
      user_id: userId,
      platform: form.get("platform") as string,
      post_date: form.get("post_date") as string,
      caption: form.get("caption") as string,
      views,
      reach: Number(form.get("reach") ?? 0),
      likes,
      comments,
      saves,
      shares,
      follows_gained: Number(form.get("follows_gained") ?? 0),
      content_pillar: (form.get("content_pillar") as string) || null,
      content_format: (form.get("content_format") as string) || null,
      hook_type: (form.get("hook_type") as string) || null,
      engagement_rate,
      save_rate,
      share_rate,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Post added")
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Post
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card text-foreground sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Post Performance</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter metrics for a post from Instagram or TikTok.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-foreground">Platform</Label>
              <Select name="platform" required defaultValue="instagram">
                <SelectTrigger className="border-border bg-secondary text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card text-foreground">
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-foreground">Post Date</Label>
              <Input
                type="date"
                name="post_date"
                required
                defaultValue={new Date().toISOString().split("T")[0]}
                className="border-border bg-secondary text-foreground"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-foreground">Caption / Hook</Label>
            <Textarea
              name="caption"
              placeholder="What was the hook or caption?"
              rows={2}
              className="border-border bg-secondary text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-foreground">Views</Label>
              <Input type="number" name="views" defaultValue="0" min="0" className="border-border bg-secondary text-foreground" />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-foreground">Reach</Label>
              <Input type="number" name="reach" defaultValue="0" min="0" className="border-border bg-secondary text-foreground" />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-foreground">Likes</Label>
              <Input type="number" name="likes" defaultValue="0" min="0" className="border-border bg-secondary text-foreground" />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-foreground">Comments</Label>
              <Input type="number" name="comments" defaultValue="0" min="0" className="border-border bg-secondary text-foreground" />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-foreground">Saves</Label>
              <Input type="number" name="saves" defaultValue="0" min="0" className="border-border bg-secondary text-foreground" />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-foreground">Shares</Label>
              <Input type="number" name="shares" defaultValue="0" min="0" className="border-border bg-secondary text-foreground" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-foreground">Follows Gained</Label>
            <Input type="number" name="follows_gained" defaultValue="0" min="0" className="border-border bg-secondary text-foreground" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-foreground">Pillar</Label>
              <Select name="content_pillar">
                <SelectTrigger className="border-border bg-secondary text-foreground">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="border-border bg-card text-foreground">
                  {PILLARS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-foreground">Format</Label>
              <Select name="content_format">
                <SelectTrigger className="border-border bg-secondary text-foreground">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="border-border bg-card text-foreground">
                  {FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-foreground">Hook Type</Label>
              <Select name="hook_type">
                <SelectTrigger className="border-border bg-secondary text-foreground">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="border-border bg-card text-foreground">
                  {HOOK_TYPES.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Post"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
