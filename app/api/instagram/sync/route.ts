import { createClient } from "@/lib/supabase/server"

const FB_API_BASE = "https://graph.facebook.com/v22.0"

interface FBPage {
  id: string
  name: string
  instagram_business_account?: { id: string }
}

interface IGMedia {
  id: string
  caption?: string
  media_type: string
  timestamp: string
  permalink: string
  thumbnail_url?: string
  media_product_type?: string
}

interface IGInsight {
  name: string
  values: { value: number }[]
}

async function fetchFB(path: string, token: string) {
  const sep = path.includes("?") ? "&" : "?"
  const url = `${FB_API_BASE}${path}${sep}access_token=${token}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.log("[v0] FB API error:", res.status, JSON.stringify(err))
    throw new Error(`Facebook API ${res.status}: ${JSON.stringify(err)}`)
  }
  return res.json()
}

async function discoverIGAccountId(token: string): Promise<string> {
  // Step 1: Get all Facebook Pages the token has access to
  const pagesRes = await fetchFB("/me/accounts?fields=id,name,instagram_business_account&limit=100", token)
  const pages: FBPage[] = pagesRes.data ?? []

  if (pages.length === 0) {
    throw new Error("No Facebook Pages found for this access token. Make sure the token has pages_read_engagement permission.")
  }

  // Step 2: Find the first page with a linked Instagram Business Account
  for (const page of pages) {
    if (page.instagram_business_account?.id) {
      console.log("[v0] Found IG Business Account", page.instagram_business_account.id, "on Page:", page.name)
      return page.instagram_business_account.id
    }
  }

  // Step 3: If none found inline, try querying each page explicitly
  for (const page of pages) {
    try {
      const pageDetail = await fetchFB(`/${page.id}?fields=instagram_business_account`, token)
      if (pageDetail.instagram_business_account?.id) {
        console.log("[v0] Found IG Business Account", pageDetail.instagram_business_account.id, "on Page:", page.name)
        return pageDetail.instagram_business_account.id
      }
    } catch {
      // Skip pages we can't query
    }
  }

  throw new Error("No Instagram Business Account linked to any of your Facebook Pages. Link your IG account to a Facebook Page first.")
}

function mapMediaTypeToFormat(mediaType: string, productType?: string): string {
  if (productType === "REELS" || mediaType === "VIDEO") return "reel"
  if (mediaType === "CAROUSEL_ALBUM") return "carousel"
  return "image"
}

// Metrics available via the Instagram Graph API (Facebook Login for Business)
function getMetricsForMedia(mediaType: string, productType?: string): string[] {
  if (productType === "REELS") {
    return ["reach", "likes", "comments", "saved", "shares", "total_interactions"]
  }
  if (mediaType === "VIDEO") {
    return ["impressions", "reach", "likes", "comments", "saved", "shares", "total_interactions"]
  }
  if (mediaType === "CAROUSEL_ALBUM") {
    return ["impressions", "reach", "likes", "comments", "saved", "shares", "total_interactions"]
  }
  // IMAGE
  return ["impressions", "reach", "likes", "comments", "saved", "shares", "total_interactions"]
}

export async function POST() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) {
    return Response.json({ error: "INSTAGRAM_ACCESS_TOKEN not set" }, { status: 500 })
  }

  const supabase = await createClient()
  const testUserId = "test-user-00000000-0000-0000-0000-000000000000"

  try {
    // Step 1: Auto-discover the Instagram Business Account ID
    const igAccountId = await discoverIGAccountId(token)

    // Step 2: Fetch recent media from the IG Business Account
    const mediaRes = await fetchFB(
      `/${igAccountId}/media?fields=id,caption,media_type,timestamp,permalink,thumbnail_url,media_product_type&limit=50`,
      token
    )
    const mediaItems: IGMedia[] = mediaRes.data ?? []
    console.log("[v0] Fetched", mediaItems.length, "media items from IG account", igAccountId)

    if (mediaItems.length === 0) {
      return Response.json({ synced: 0, message: "No media found on this Instagram account" })
    }

    let synced = 0
    let errors = 0

    for (const media of mediaItems) {
      try {
        // Check if already imported
        const { data: existing } = await supabase
          .from("posts")
          .select("id")
          .eq("instagram_media_id", media.id)
          .maybeSingle()

        // Fetch insights for this media
        const metrics = getMetricsForMedia(media.media_type, media.media_product_type)
        const insights: Record<string, number> = {}

        try {
          const insightsRes = await fetchFB(
            `/${media.id}/insights?metric=${metrics.join(",")}`,
            token
          )
          const insightsData: IGInsight[] = insightsRes.data ?? []
          for (const insight of insightsData) {
            insights[insight.name] = insight.values?.[0]?.value ?? 0
          }
        } catch (insightErr) {
          console.log("[v0] Could not fetch insights for media", media.id, insightErr)
        }

        const views = insights.impressions ?? 0
        const reach = insights.reach ?? 0
        const likes = insights.likes ?? 0
        const comments = insights.comments ?? 0
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
          format: mapMediaTypeToFormat(media.media_type, media.media_product_type),
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
          permalink: media.permalink,
          thumbnail_url: media.thumbnail_url ?? null,
        }

        if (existing) {
          const { error } = await supabase
            .from("posts")
            .update(postData)
            .eq("instagram_media_id", media.id)

          if (error) {
            console.log("[v0] Error updating post:", error)
            errors++
          } else {
            synced++
          }
        } else {
          const { error } = await supabase
            .from("posts")
            .insert(postData)

          if (error) {
            console.log("[v0] Error inserting post:", error)
            errors++
          } else {
            synced++
          }
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
      igAccountId,
      message: `Synced ${synced} posts from Instagram${errors > 0 ? `, ${errors} errors` : ""}`,
    })
  } catch (err) {
    console.log("[v0] Instagram sync error:", err)
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error syncing Instagram" },
      { status: 500 }
    )
  }
}
