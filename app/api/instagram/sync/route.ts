import { createClient } from "@/lib/supabase/server"

const FB_API = "https://graph.facebook.com/v22.0"
const IG_API = "https://graph.instagram.com/v22.0"
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
  console.log("[v0] Fetching:", url.replace(/access_token=[^&]+/, "access_token=***"))
  const res = await fetch(url, { cache: "no-store" })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.log("[v0] API error:", res.status, JSON.stringify(data))
    throw new Error(data?.error?.message ?? `API ${res.status}`)
  }
  return data
}

function getToken(): { pageToken: string; userToken: string } {
  const pageToken = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN
  const userToken = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!pageToken && !userToken) {
    throw new Error("No access token set. Add INSTAGRAM_PAGE_ACCESS_TOKEN or INSTAGRAM_ACCESS_TOKEN.")
  }
  return {
    pageToken: pageToken ?? userToken!,
    userToken: userToken ?? pageToken!,
  }
}

async function fetchMedia(igId: string, token: string): Promise<{ media: IGMedia[]; apiBase: string }> {
  const fields = "id,caption,media_type,timestamp,permalink,thumbnail_url,media_product_type,like_count,comments_count"

  // Try Facebook Graph API first
  try {
    console.log("[v0] Trying graph.facebook.com for media...")
    const url = `${FB_API}/${igId}/media?fields=${fields}&limit=50&access_token=${token}`
    const res = await apiFetch(url)
    return { media: res.data ?? [], apiBase: FB_API }
  } catch (fbErr) {
    console.log("[v0] graph.facebook.com failed:", fbErr)
  }

  // Fall back to Instagram Graph API
  console.log("[v0] Trying graph.instagram.com for media...")
  const url = `${IG_API}/me/media?fields=${fields}&limit=50&access_token=${token}`
  const res = await apiFetch(url)
  return { media: res.data ?? [], apiBase: IG_API }
}

async function fetchInsights(
  mediaId: string,
  token: string,
  apiBase: string = FB_API
): Promise<Record<string, number>> {
  const insights: Record<string, number> = {}

  // Only request metrics that the IG API actually returns via insights:
  // saved, shares, reach (likes/comments come from media fields instead)
  try {
    const res = await apiFetch(
      `${apiBase}/${mediaId}/insights?metric=saved,shares,reach,comments&access_token=${token}`
    )
    for (const item of (res.data ?? []) as IGInsight[]) {
      insights[item.name] = item.values?.[0]?.value ?? 0
    }
  } catch (err) {
    console.log("[v0] Insights failed for", mediaId, "-", err instanceof Error ? err.message : String(err))
  }

  // Also try to get views/plays separately (available for reels/video)
  try {
    const res = await apiFetch(
      `${apiBase}/${mediaId}/insights?metric=plays&access_token=${token}`
    )
    for (const item of (res.data ?? []) as IGInsight[]) {
      insights[item.name] = item.values?.[0]?.value ?? 0
    }
  } catch {
    // plays not available for this media type - that's fine
  }

  return insights
}

function mapFormat(mediaType: string, productType?: string): string {
  if (productType === "REELS" || mediaType === "VIDEO") return "reel"
  if (mediaType === "CAROUSEL_ALBUM") return "carousel"
  return "image"
}

export async function POST() {
  try {
    const { pageToken } = getToken()
    const igId = KNOWN_IG_ACCOUNT_ID

    console.log("[v0] Starting sync for IG account:", igId)
    console.log("[v0] Page token set:", !!process.env.INSTAGRAM_PAGE_ACCESS_TOKEN)
    console.log("[v0] User token set:", !!process.env.INSTAGRAM_ACCESS_TOKEN)

    const supabase = await createClient()
    const testUserId = "00000000-0000-0000-0000-000000000000"

    // Step 1: Verify the token works by checking permissions
    try {
      const debugRes = await apiFetch(`${FB_API}/debug_token?input_token=${pageToken}&access_token=${pageToken}`)
      console.log("[v0] Token debug - app_id:", debugRes.data?.app_id, "type:", debugRes.data?.type, "scopes:", debugRes.data?.scopes)
    } catch (e) {
      console.log("[v0] Token debug failed (non-fatal):", e)
    }

    // Step 2: Try fetching media with multiple token/API combos
    let mediaItems: IGMedia[]
    let workingApiBase = FB_API
    let workingToken = pageToken

    // Try page token first
    try {
      console.log("[v0] Trying media fetch with page token...")
      const result = await fetchMedia(igId, pageToken)
      mediaItems = result.media
      workingApiBase = result.apiBase
      workingToken = pageToken
    } catch (pageErr) {
      console.log("[v0] Page token failed:", pageErr)
      // Try user token
      const { userToken } = getToken()
      if (userToken !== pageToken) {
        console.log("[v0] Retrying with user token...")
        const result = await fetchMedia(igId, userToken)
        mediaItems = result.media
        workingApiBase = result.apiBase
        workingToken = userToken
      } else {
        throw pageErr
      }
    }
    console.log("[v0] Fetched", mediaItems.length, "media items via", workingApiBase)

    if (mediaItems.length === 0) {
      return Response.json({ synced: 0, message: "No media found on this Instagram account" })
    }

    // Limit to 2 posts for initial testing
    const testBatch = mediaItems.slice(0, 2)
    console.log("[v0] Processing", testBatch.length, "posts (limited for testing)")

    let synced = 0
    let errors = 0
    const errorDetails: string[] = []

    for (const media of testBatch) {
      try {
        console.log("[v0] Processing media:", media.id, "type:", media.media_type, "like_count:", media.like_count, "comments_count:", media.comments_count)
        const insights = await fetchInsights(media.id, workingToken, workingApiBase)
        console.log("[v0] Insights for", media.id, ":", JSON.stringify(insights))

        // reach = unique accounts that saw the post (use as views)
        // plays only available for reels/video, use reach as fallback
        const reach = insights.reach ?? 0
        const views = insights.plays ?? reach
        const likes = media.like_count ?? 0
        const comments = insights.comments ?? media.comments_count ?? 0
        const saves = insights.saved ?? 0
        const shares = insights.shares ?? 0

        console.log("[v0] Final metrics ->", { views, reach, likes, comments, saves, shares })

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
          follows_gained: 0,
          engagement_rate: engagementRate,
          save_rate: saveRate,
          share_rate: shareRate,
          instagram_media_id: media.id,
          permalink: media.permalink ?? null,
          thumbnail_url: media.thumbnail_url ?? null,
        }

        // Upsert by instagram_media_id
        const { data: existing } = await supabase
          .from("posts")
          .select("id")
          .eq("instagram_media_id", media.id)
          .maybeSingle()

        console.log("[v0] Post data to upsert:", JSON.stringify(postData))

        if (existing) {
          const { error } = await supabase.from("posts").update(postData).eq("instagram_media_id", media.id)
          if (error) {
            const msg = `Update ${media.id}: ${error.message} (code: ${error.code}, details: ${error.details})`
            console.log("[v0] DB Update error:", msg)
            errorDetails.push(msg)
            errors++
          } else { synced++ }
        } else {
          const { error } = await supabase.from("posts").insert(postData)
          if (error) {
            const msg = `Insert ${media.id}: ${error.message} (code: ${error.code}, details: ${error.details})`
            console.log("[v0] DB Insert error:", msg)
            errorDetails.push(msg)
            errors++
          } else { synced++ }
        }
      } catch (mediaErr) {
        const msg = `Catch ${media.id}: ${mediaErr instanceof Error ? mediaErr.message : String(mediaErr)}`
        console.log("[v0] Error processing media:", msg)
        errorDetails.push(msg)
        errors++
      }
    }

    console.log("[v0] Sync complete:", synced, "synced,", errors, "errors")

    return Response.json({
      synced,
      errors,
      total: testBatch.length,
      igAccountId: igId,
      errorDetails: errorDetails.slice(0, 5),
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
