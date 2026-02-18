import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("settings")
    .select("id, value, updated_at")
    .in("id", ["instagram_access_token", "instagram_page_token"])

  const settings: Record<string, { value: string; updated_at: string }> = {}
  for (const row of data ?? []) {
    settings[row.id] = { value: row.value, updated_at: row.updated_at }
  }

  return Response.json({
    instagram_access_token: settings.instagram_access_token
      ? { set: true, updated_at: settings.instagram_access_token.updated_at, preview: `...${settings.instagram_access_token.value.slice(-8)}` }
      : { set: false },
    instagram_page_token: settings.instagram_page_token
      ? { set: true, updated_at: settings.instagram_page_token.updated_at, preview: `...${settings.instagram_page_token.value.slice(-8)}` }
      : { set: false },
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  const { key, value } = body as { key: string; value: string }

  if (!["instagram_access_token", "instagram_page_token"].includes(key)) {
    return Response.json({ error: "Invalid setting key" }, { status: 400 })
  }

  if (!value || value.trim().length < 10) {
    return Response.json({ error: "Token is too short" }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("settings")
    .upsert({ id: key, value: value.trim(), updated_at: new Date().toISOString() })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
