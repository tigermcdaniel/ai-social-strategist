"use client"

import { useState } from "react"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { PostsTable } from "@/components/dashboard/posts-table"
import { AddPostDialog } from "@/components/dashboard/add-post-dialog"
import { InstagramSyncButton } from "@/components/dashboard/instagram-sync-button"
import { TokenSettings } from "@/components/dashboard/token-settings"

async function fetchPosts() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("post_date", { ascending: false })

  if (error) throw error
  return data ?? []
}

export function PostsView({ initialPosts }: { initialPosts: any[] }) {
  const [postLimit, setPostLimit] = useState(15)
  const { data: posts, mutate } = useSWR("posts", fetchPosts, {
    fallbackData: initialPosts,
    revalidateOnFocus: false,
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Post Performance</h2>
          <p className="text-sm text-muted-foreground">
            {(posts ?? []).length} posts tracked
          </p>
        </div>
        <div className="flex items-center gap-3">
          <InstagramSyncButton onSyncComplete={() => mutate()} limit={postLimit} />
          <AddPostDialog />
        </div>
      </div>
      <TokenSettings postLimit={postLimit} onPostLimitChange={setPostLimit} />
      <PostsTable posts={posts ?? []} />
    </div>
  )
}
