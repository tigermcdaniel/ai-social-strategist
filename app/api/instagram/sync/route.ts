import { createClient } from "@/lib/supabase/server"

const FB_API = "https://graph.facebook.com/v22.0"

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
  console.log("[v0] Fetching:", url.replace(/access_token=[^&]+/, "access_token=***"))
  const res = await fetch(url, { cache: "no-store" })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.log("[v0] API error:", res.status, JSON.stringify(data))
    throw new Error(data?.error?.message ?? `API ${res.status}`)
  }
  return data
}

// Discover IG account and get the Page access token (needed for media/insights)
async function discoverIG(token: string): Promise<{
  igId: string
  pageToken: string
  pageName: string
} | null> {
  console.log("[v0] Discovering IG account via Facebook Pages...")

  const pagesRes = await apiFetch(
    `${FB_API}/me/accounts?fields=id,name,access_token,instagram_business_account,connected_page_backed_instagram_account&limit=100&access_token=${token}`
  )
  const pages = pagesRes.data ?? []
  console.log("[v0] Found", pages.length, "Facebook Pages")

  for (const page of pages) {
    const igId =
      page.connected_page_backed_instagram_account?.id ??
      page.instagram_business_account?.id
    if (igId) {
      console.log("[v0] Found IG account:", igId, "on Page:", page.name, "(using page token)")
      return { igId, pageToken: page.access_token, pageName: page.name }
    }
  }

  // Explicit query per page
  for (const page of pages) {
    try {
      const detail = await apiFetch(
        `${FB_API}/${page.id}?fields=instagram_business_account,connected_page_backed_instagram_account&access_token=${token}`
      )
      const igId =
        detail.connected_page_backed_instagram_account?.id ??
        detail.instagram_business_account?.id
      if (igId) {
        console.log("[v0] Found IG account (explicit):", igId, "on Page:", page.name)
        return { igId, pageToken: page.access_token, pageName: page.name }
      }
    } catch { /* skip */ }
  }

  return null
}

// Fetch media using the Page token
async function fetchMedia(igId: string, pageToken: string): Promise<IGMedia[]> {
  const fields = "id,caption,media_type,timestamp,permalink,thumbnail_url,media_product_type,like_count,comments_count"
  const url = `${FB_API}/${igId}/media?fields=${fields}&limit=50&access_token=${pageToken}`
  const res = await apiFetch(url)
  return res.data ?? []
}

// Fetch insights for a single media using the Page token
async function fetchInsights(mediaId: string, mediaType: string, productType: string | undefined, pageToken: string): Promise<Record<string, number>> {
  const insights: Record<string, number> = {}

  let metrics: string[]
  if (productType === "REELS") {
    metrics = ["reach", "likes", "comments", "saved", "shares", "total_interactions"]
  } else if (mediaType === "VIDEO") {
    metrics = ["impressions", "reach", "likes", "comments", "saved", "shares"]
  } else {
    metrics = ["impressions", "reach", "likes", "comments", "saved", "shares"]
  }

  try {
    const res = await apiFetch(
      `${FB_API}/${mediaId}/insights?metric=${metrics.join(",")}&access_token=${pageToken}`
    )
    for (const item of (res.data ?? []) as IGInsight[]) {
      insights[item.name] = item.values?.[0]?.value ?? 0
    }
  } catch (err) {
    console.log("[v0] Insights failed for", mediaId, "- using basic counts only")
  }

  return insights
}

function mapFormat(mediaType: string, productType?: string): string {
  if (productType === "REELS" || mediaType === "VIDEO") return "reel"
  if (mediaType === "CAROUSEL_ALBUM") return "carousel"
  return "image"
}

export async function POST() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) {
    return Response.json({ error: "INSTAGRAM_ACCESS_TOKEN not set" }, { status: 500 })
  }

  const supabase = await createClient()
  const testUserId = "test-user-00000000-0000-0000-0000-000000000000"

  try {
    const discovery = await discoverIG(token)

    if (!discovery) {
      return Response.json({
        error: "No Instagram account linked to your Facebook Pages. Make sure your IG Business/Creator account is connected to a Facebook Page.",
        hint: "Check /api/instagram/debug for details about your token and pages.",
      }, { status: 400 })
    }

    const { igId, pageToken, pageName } = discovery
    console.log("[v0] Using Page token from:", pageName, "for IG account:", igId)

    // Fetch media using the Page token (works with pages_read_engagement)
    const mediaItems = await fetchMedia(igId, pageToken)
    console.log("[v0] Fetched", mediaItems.length, "media items")

    if (mediaItems.length === 0) {
      return Response.json({ synced: 0, message: "No media found on this Instagram account" })
    }

    let synced = 0
    let errors = 0

    for (const media of mediaItems) {
      try {
        // Fetch insights using Page token (works with read_insights)
        const insights = await fetchInsights(media.id, media.media_type, media.media_product_type, pageToken)

        const views = insights.impressions ?? insights.views ?? 0
        const reach = insights.reach ?? 0
        const likes = insights.likes ?? media.like_count ?? 0
        const comments = insights.comments ?? media.comments_count ?? 0
        const saves = insights.saved ?? 0
        const shares = insights.shares ?? 0
        const followsGained = insights.follows ?? 0

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
          follows_gained: followsGained,
          engagement_rate: engagementRate,
          save_rate: saveRate,
          share_rate: shareRate,
          instagram_media_id: media.id,
          permalink: media.permalink ?? null,
          thumbnail_url: media.thumbnail_url ?? null,
        }

        // Upsert
        const { data: existing } = await supabase
          .from("posts")
          .select("id")
          .eq("instagram_media_id", media.id)
          .maybeSingle()

        if (existing) {
          const { error } = await supabase.from("posts").update(postData).eq("instagram_media_id", media.id)
          if (error) { console.log("[v0] Update error:", error); errors++ } else { synced++ }
        } else {
          const { error } = await supabase.from("posts").insert(postData)
          if (error) { console.log("[v0] Insert error:", error); errors++ } else { synced++ }
        }
      } catch (mediaErr) {
        console.log("[v0] Error processing media", media.id, mediaErr)
        errors++
      }
    }

    return Response.json({
      synced,
      errors,
      total: mediaItems.length,
      igAccountId: igId,
      pageName,
      message: `Synced ${synced} posts from Instagram${errors > 0 ? ` (${errors} errors)` : ""}`,
    })
  } catch (err) {
    console.log("[v0] Sync error:", err)
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
