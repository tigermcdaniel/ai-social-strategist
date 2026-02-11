import { createClient } from "@/lib/supabase/server"
import { PostsView } from "@/components/dashboard/posts-view"

export default async function PostsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const testUserId = user?.id ?? "00000000-0000-0000-0000-000000000000"

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", testUserId)
    .order("post_date", { ascending: false })

  return <PostsView initialPosts={posts ?? []} />
}
