"use client"

import React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { mutate } from "swr"

export function AddTrendDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    platform: "both",
    trend_type: "format",
    relevance_score: 50,
    source: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error("Title is required")
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Bypass auth for testing
      const userId = user?.id ?? "test-user-00000000-0000-0000-0000-000000000000"

      const { error } = await supabase.from("trends").insert({
        user_id: userId,
        ...form,
      })
      if (error) throw error
      toast.success("Trend added")
      setOpen(false)
      setForm({
        title: "",
        description: "",
        platform: "both",
        trend_type: "format",
        relevance_score: 50,
        source: "",
      })
      mutate("trends")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add trend"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Add Trend
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-foreground">Track a Trend</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add a trending format, topic, or audio to match against your niche
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title" className="text-foreground">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Get ready with me transitions"
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description" className="text-foreground">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="How to use this trend and why it matters..."
                rows={3}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-foreground">Platform</Label>
                <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    <SelectItem value="both">Both</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-foreground">Type</Label>
                <Select value={form.trend_type} onValueChange={(v) => setForm({ ...form, trend_type: v })}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    <SelectItem value="format">Format</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="topic">Topic</SelectItem>
                    <SelectItem value="hashtag">Hashtag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">Relevance Score</Label>
                <span className="text-xs font-mono text-primary">{form.relevance_score}/100</span>
              </div>
              <Slider
                value={[form.relevance_score]}
                onValueChange={(v) => setForm({ ...form, relevance_score: v[0] })}
                max={100}
                step={5}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="source" className="text-foreground">Source (optional)</Label>
              <Input
                id="source"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="Where you spotted this trend"
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-border text-foreground bg-transparent"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Trend"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
