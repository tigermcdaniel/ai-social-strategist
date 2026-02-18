import { createClient } from "@/lib/supabase/server"

export async function getInstagramTokens(): Promise<{
  pageToken: string | null
  userToken: string | null
}> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("settings")
    .select("id, value")
    .in("id", ["instagram_access_token", "instagram_page_token"])

  const dbTokens: Record<string, string> = {}
  for (const row of data ?? []) {
    dbTokens[row.id] = row.value
  }

  // DB tokens take priority over env vars
  const pageToken = dbTokens.instagram_page_token || process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || null
  const userToken = dbTokens.instagram_access_token || process.env.INSTAGRAM_ACCESS_TOKEN || null

  return { pageToken, userToken }
}
