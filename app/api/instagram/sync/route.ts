import { createClient } from "@/lib/supabase/server"

const FB_API = "https://graph.facebook.com/v22.0"
const IG_API = "https://graph.instagram.com/v22.0"

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

// Strategy 1: Facebook Graph API - /me/accounts -> instagram_business_account
async function tryFacebookPath(token: string): Promise<{ igId: string; api: string } | null> {
  try {
    console.log("[v0] Trying Facebook Graph API path...")
    const pagesRes = await apiFetch(
      `${FB_API}/me/accounts?fields=id,name,instagram_business_account,connected_page_backed_instagram_account&limit=100&access_token=${token}`
    )
    const pages = pagesRes.data ?? []
    console.log("[v0] Found", pages.length, "Facebook Pages")

    for (const page of pages) {
      // Check the newer connected_page_backed_instagram_account field first
      if (page.connected_page_backed_instagram_account?.id) {
        console.log("[v0] Found IG via connected_page_backed:", page.connected_page_backed_instagram_account.id, "on Page:", page.name)
        return { igId: page.connected_page_backed_instagram_account.id, api: "facebook" }
      }
      // Fall back to the older instagram_business_account field
      if (page.instagram_business_account?.id) {
        console.log("[v0] Found IG Business Account:", page.instagram_business_account.id, "on Page:", page.name)
        return { igId: page.instagram_business_account.id, api: "facebook" }
      }
    }

    // Try querying each page explicitly with both fields
    for (const page of pages) {
      try {
        const detail = await apiFetch(
          `${FB_API}/${page.id}?fields=instagram_business_account,connected_page_backed_instagram_account&access_token=${token}`
        )
        if (detail.connected_page_backed_instagram_account?.id) {
          return { igId: detail.connected_page_backed_instagram_account.id, api: "facebook" }
        }
        if (detail.instagram_business_account?.id) {
          return { igId: detail.instagram_business_account.id, api: "facebook" }
        }
      } catch { /* skip */ }
    }

    console.log("[v0] No IG Business Account linked to any Facebook Page")
    return null
  } catch (err) {
    console.log("[v0] Facebook path failed:", err)
    return null
  }
}

// Strategy 2: Instagram Graph API - /me directly (Instagram Login for Business)
async function tryInstagramPath(token: string): Promise<{ igId: string; api: string } | null> {
  try {
    console.log("[v0] Trying Instagram API path (graph.instagram.com/me)...")
    const meRes = await apiFetch(`${IG_API}/me?fields=user_id,username&access_token=${token}`)
    const igId = meRes.user_id ?? meRes.id
    if (igId) {
      console.log("[v0] Found IG account via Instagram API:", igId, "username:", meRes.username)
      return { igId, api: "instagram" }
    }
    return null
  } catch (err) {
    console.log("[v0] Instagram path failed:", err)
    return null
  }
}

// Fetch media - works with both APIs
async function fetchMedia(igId: string, api: string, token: string): Promise<IGMedia[]> {
  const baseUrl = api === "facebook" ? FB_API : IG_API
  const fields = "id,caption,media_type,timestamp,permalink,thumbnail_url,media_product_type,like_count,comments_count"
  const res = await apiFetch(
    `${baseUrl}/${igId}/media?fields=${fields}&limit=50&access_token=${token}`
  )
  return res.data ?? []
}

// Fetch insights for a single media item
async function fetchInsights(mediaId: string, mediaType: string, productType: string | undefined, api: string, token: string): Promise<Record<string, number>> {
  const baseUrl = api === "facebook" ? FB_API : IG_API
  const insights: Record<string, number> = {}

  // Different metrics available depending on media type
  let metrics: string[]
  if (productType === "REELS") {
    metrics = ["reach", "likes", "comments", "saved", "shares", "total_interactions"]
  } else if (mediaType === "VIDEO") {
    metrics = ["impressions", "reach", "likes", "comments", "saved", "shares"]
  } else if (mediaType === "CAROUSEL_ALBUM") {
    metrics = ["impressions", "reach", "likes", "comments", "saved", "shares"]
  } else {
    metrics = ["impressions", "reach", "likes", "comments", "saved", "shares"]
  }

  try {
    const res = await apiFetch(
      `${baseUrl}/${mediaId}/insights?metric=${metrics.join(",")}&access_token=${token}`
    )
    for (const item of (res.data ?? []) as IGInsight[]) {
      insights[item.name] = item.values?.[0]?.value ?? 0
    }
  } catch (err) {
    console.log("[v0] Insights fetch failed for", mediaId, "- falling back to basic metrics")
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
    // Try both API paths - Facebook first, then Instagram
    let result = await tryFacebookPath(token)
    if (!result) {
      result = await tryInstagramPath(token)
    }

    if (!result) {
      return Response.json({
        error: "Could not find your Instagram account. Token may not have instagram_basic or instagram_business_basic permissions. Check /api/instagram/debug for details."
      }, { status: 400 })
    }

    const { igId, api } = result
    console.log("[v0] Using", api, "API with IG account:", igId)

    // Fetch all recent media
    const mediaItems = await fetchMedia(igId, api, token)
    console.log("[v0] Fetched", mediaItems.length, "media items")

    if (mediaItems.length === 0) {
      return Response.json({ synced: 0, message: "No media found on this Instagram account" })
    }

    let synced = 0
    let errors = 0

    for (const media of mediaItems) {
      try {
        // Fetch insights
        const insights = await fetchInsights(media.id, media.media_type, media.media_product_type, api, token)

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

        // Upsert - update if exists, insert if not
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
      apiUsed: api,
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
