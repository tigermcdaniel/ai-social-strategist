import { createClient } from "@/lib/supabase/server"
import { getInstagramTokens } from "@/lib/instagram-tokens"

const FB_API = "https://graph.facebook.com/v22.0"
const KNOWN_IG_ACCOUNT_ID = "17841400977919619"

interface IGMedia {
  id: string
  caption?: string
  media_type: string
  timestamp: string
  permalink?: string
  thumbnail_url?: string
  media_product_type?: string
  like_count?: number
  comments_count?: number
}

interface IGInsight {
  name: string
  values: { value: number }[]
}

async function apiFetch(url: string) {
  const res = await fetch(url, { cache: "no-store" })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `API ${res.status}`)
  }
  return data
}

async function getToken(): Promise<string> {
  const tokens = await getInstagramTokens()
  const token = tokens.pageToken ?? tokens.userToken
  if (!token) {
    throw new Error("No access token set. Paste your Instagram token in Settings.")
  }
  return token
}

// Fetches all media with pagination support
async function fetchAllMedia(igId: string, token: string, limit: number): Promise<IGMedia[]> {
  const fields = "id,caption,media_type,timestamp,permalink,thumbnail_url,media_product_type,like_count,comments_count"
  const allMedia: IGMedia[] = []
  let url: string | null = `${FB_API}/${igId}/media?fields=${fields}&limit=100&access_token=${token}`

  while (url && allMedia.length < limit) {
    const res = await apiFetch(url)
    const items = res.data ?? []
    allMedia.push(...items)
    // Follow pagination cursor if we need more
    url = allMedia.length < limit ? (res.paging?.next ?? null) : null
  }

  return allMedia.slice(0, limit)
}

async function fetchInsights(
  mediaId: string,
  token: string,
): Promise<Record<string, number>> {
  const insights: Record<string, number> = {}

  try {
    const res = await apiFetch(
      `${FB_API}/${mediaId}/insights?metric=views,likes,saved,shares,reach,comments&access_token=${token}`
    )
    for (const item of (res.data ?? []) as IGInsight[]) {
      insights[item.name] = item.values?.[0]?.value ?? 0
    }
  } catch {
    // insights not available for this media
  }

  // Reels-specific metrics (separate call, non-fatal)
  try {
    const res = await apiFetch(
      `${FB_API}/${mediaId}/insights?metric=clips_replays_count,ig_reels_avg_watch_time,ig_reels_video_view_total_time&access_token=${token}`
    )
    for (const item of (res.data ?? []) as IGInsight[]) {
      insights[item.name] = item.values?.[0]?.value ?? 0
    }
  } catch { /* not a reel */ }

  return insights
}

function mapFormat(mediaType: string, productType?: string): string {
  if (productType === "REELS" || mediaType === "VIDEO") return "reel"
  if (mediaType === "CAROUSEL_ALBUM") return "carousel"
  return "image"
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 15, 1), 500)
    const mode = searchParams.get("mode") ?? "new" // "all" = sync everything, "new" = skip existing

    const token = await getToken()
    const igId = KNOWN_IG_ACCOUNT_ID

    const supabase = await createClient()
    const testUserId = "00000000-0000-0000-0000-000000000000"

    // Fetch media from Instagram (with pagination for large limits)
    const mediaItems = await fetchAllMedia(igId, token, limit)

    if (mediaItems.length === 0) {
      return Response.json({ synced: 0, message: "No media found on this Instagram account" })
    }

    // If mode=new, filter out posts we already have
    let toProcess = mediaItems
    if (mode === "new") {
      const mediaIds = mediaItems.map((m) => m.id)
      const { data: existing } = await supabase
        .from("posts")
        .select("instagram_media_id")
        .in("instagram_media_id", mediaIds)

      const existingIds = new Set((existing ?? []).map((e) => e.instagram_media_id))
      toProcess = mediaItems.filter((m) => !existingIds.has(m.id))

      if (toProcess.length === 0) {
        return Response.json({
          synced: 0,
          skipped: mediaItems.length,
          message: `All ${mediaItems.length} posts already synced. Use "Sync All" to refresh metrics.`,
        })
      }
    }

    // Fetch account-level follower count
    let accountFollowerCount = 0
    try {
      const accountRes = await apiFetch(`${FB_API}/${igId}?fields=followers_count&access_token=${token}`)
      accountFollowerCount = accountRes.followers_count ?? 0
    } catch { /* non-fatal */ }

    let synced = 0
    let errors = 0
    const errorDetails: string[] = []

    for (const media of toProcess) {
      try {
        const insights = await fetchInsights(media.id, token)

        const views = insights.views ?? 0
        const reach = insights.reach ?? 0
        const likes = insights.likes ?? media.like_count ?? 0
        const comments = insights.comments ?? media.comments_count ?? 0
        const saves = insights.saved ?? 0
        const shares = insights.shares ?? 0
        const replays = insights.clips_replays_count ?? 0
        const avgWatchTime = insights.ig_reels_avg_watch_time ?? 0
        const videoViewTotalTime = insights.ig_reels_video_view_total_time ?? 0

        const totalInteractions = likes + comments + saves + shares
        const engagementRate = reach > 0 ? Number(((totalInteractions / reach) * 100).toFixed(4)) : 0
        const saveRate = reach > 0 ? Number(((saves / reach) * 100).toFixed(4)) : 0
        const shareRate = reach > 0 ? Number(((shares / reach) * 100).toFixed(4)) : 0

        const postData = {
          user_id: testUserId,
          platform: "instagram" as const,
          post_date: media.timestamp,
          caption: media.caption?.slice(0, 2000) ?? null,
          format: mapFormat(media.media_type, media.media_product_type),
          media_type: media.media_type,
          views,
          reach,
          likes,
          comments,
          saves,
          shares,
          follower_count_snapshot: accountFollowerCount,
          follows_gained: 0,
          profile_visits: 0,
          total_interactions: totalInteractions,
          replays,
          avg_watch_time: avgWatchTime,
          video_view_total_time: videoViewTotalTime,
          engagement_rate: engagementRate,
          save_rate: saveRate,
          share_rate: shareRate,
          instagram_media_id: media.id,
          permalink: media.permalink ?? null,
          thumbnail_url: media.thumbnail_url ?? null,
        }

        // Check if already exists (for mode=all update case)
        const { data: existingPost } = await supabase
          .from("posts")
          .select("id")
          .eq("instagram_media_id", media.id)
          .maybeSingle()

        if (existingPost) {
          // Don't overwrite good data with zeros
          const updateData: Record<string, unknown> = { ...postData }
          if (views === 0) delete updateData.views
          if (reach === 0) delete updateData.reach
          if (saves === 0) delete updateData.saves
          if (shares === 0) delete updateData.shares
          if (comments === 0) delete updateData.comments
          if (accountFollowerCount === 0) delete updateData.follower_count_snapshot

          const { error } = await supabase.from("posts").update(updateData).eq("instagram_media_id", media.id)
          if (error) { errorDetails.push(`Update ${media.id}: ${error.message}`); errors++ }
          else { synced++ }
        } else {
          const { error } = await supabase.from("posts").insert(postData)
          if (error) { errorDetails.push(`Insert ${media.id}: ${error.message}`); errors++ }
          else { synced++ }
        }
      } catch (mediaErr) {
        errorDetails.push(`${media.id}: ${mediaErr instanceof Error ? mediaErr.message : String(mediaErr)}`)
        errors++
      }
    }

    // Compute follows_gained as deltas between consecutive posts
    const { data: allPosts } = await supabase
      .from("posts")
      .select("id, post_date, follower_count_snapshot")
      .eq("user_id", testUserId)
      .gt("follower_count_snapshot", 0)
      .order("post_date", { ascending: true })

    if (allPosts && allPosts.length > 1) {
      for (let i = 1; i < allPosts.length; i++) {
        const delta = allPosts[i].follower_count_snapshot - allPosts[i - 1].follower_count_snapshot
        await supabase
          .from("posts")
          .update({ follows_gained: Math.max(delta, 0) })
          .eq("id", allPosts[i].id)
      }
    }

    return Response.json({
      synced,
      errors,
      skipped: mediaItems.length - toProcess.length,
      total: toProcess.length,
      fetched: mediaItems.length,
      igAccountId: igId,
      errorDetails: errorDetails.slice(0, 5),
      message: `Synced ${synced} posts from Instagram${errors > 0 ? ` (${errors} errors)` : ""}`,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
