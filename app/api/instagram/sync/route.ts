import { createClient } from "@/lib/supabase/server"

const IG_API_BASE = "https://graph.instagram.com/v22.0"

interface IGMedia {
  id: string
  caption?: string
  media_type: string
  timestamp: string
  permalink: string
  thumbnail_url?: string
  media_product_type?: string
}

interface IGInsightValue {
  value: number
}

interface IGInsight {
  name: string
  values: IGInsightValue[]
}

async function fetchIG(path: string, token: string) {
  const sep = path.includes("?") ? "&" : "?"
  const url = `${IG_API_BASE}${path}${sep}access_token=${token}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.log("[v0] IG API error:", res.status, JSON.stringify(err))
    throw new Error(`Instagram API ${res.status}: ${JSON.stringify(err)}`)
  }
  return res.json()
}

function mapMediaTypeToFormat(mediaType: string, productType?: string): string {
  if (productType === "REELS" || mediaType === "VIDEO") return "reel"
  if (mediaType === "CAROUSEL_ALBUM") return "carousel"
  return "image"
}

// Metrics available per media type via Instagram API with Instagram Login
const MEDIA_INSIGHTS: Record<string, string[]> = {
  IMAGE: ["impressions", "reach", "likes", "comments", "saved", "shares", "follows", "total_interactions"],
  VIDEO: ["impressions", "reach", "likes", "comments", "saved", "shares", "follows", "total_interactions"],
  CAROUSEL_ALBUM: ["impressions", "reach", "likes", "comments", "saved", "shares", "follows", "total_interactions"],
  REELS: ["reach", "likes", "comments", "saved", "shares", "follows", "total_interactions"],
}

function getMetricsForMedia(mediaType: string, productType?: string): string[] {
  if (productType === "REELS") return MEDIA_INSIGHTS.REELS
  return MEDIA_INSIGHTS[mediaType] ?? MEDIA_INSIGHTS.IMAGE
}

export async function POST() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) {
    return Response.json({ error: "INSTAGRAM_ACCESS_TOKEN not set" }, { status: 500 })
  }

  const supabase = await createClient()
  const testUserId = "test-user-00000000-0000-0000-0000-000000000000"

  try {
    // Step 1: Fetch recent media (up to 50 posts)
    const mediaRes = await fetchIG(
      "/me/media?fields=id,caption,media_type,timestamp,permalink,thumbnail_url,media_product_type&limit=50",
      token
    )
    const mediaItems: IGMedia[] = mediaRes.data ?? []
    console.log("[v0] Fetched", mediaItems.length, "media items from Instagram")

    if (mediaItems.length === 0) {
      return Response.json({ synced: 0, message: "No media found on this Instagram account" })
    }

    let synced = 0
    let skipped = 0
    let errors = 0

    for (const media of mediaItems) {
      try {
        // Check if already imported
        const { data: existing } = await supabase
          .from("posts")
          .select("id")
          .eq("instagram_media_id", media.id)
          .maybeSingle()

        // Step 2: Fetch insights for this media
        const metrics = getMetricsForMedia(media.media_type, media.media_product_type)
        let insights: Record<string, number> = {}

        try {
          const insightsRes = await fetchIG(
            `/${media.id}/insights?metric=${metrics.join(",")}`,
            token
          )
          const insightsData: IGInsight[] = insightsRes.data ?? []
          for (const insight of insightsData) {
            insights[insight.name] = insight.values?.[0]?.value ?? 0
          }
        } catch (insightErr) {
          // Some media (stories, etc.) may not support insights - use 0s
          console.log("[v0] Could not fetch insights for media", media.id, insightErr)
        }

        const views = insights.impressions ?? insights.views ?? 0
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
          // Update existing post with fresh metrics
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
          // Insert new post
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
      skipped,
      errors,
      total: mediaItems.length,
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
