import { createClient } from "@/lib/supabase/server"
import { AddPostDialog } from "@/components/dashboard/add-post-dialog"
import { PostsTable } from "@/components/dashboard/posts-table"

export default async function PostsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", user.id)
    .order("post_date", { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Post Performance</h2>
          <p className="text-sm text-muted-foreground">
            {(posts ?? []).length} posts tracked
          </p>
        </div>
        <AddPostDialog />
      </div>
      <PostsTable posts={posts ?? []} />
    </div>
  )
}
