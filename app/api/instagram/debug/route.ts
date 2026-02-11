export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN

  if (!token) {
    return Response.json({ error: "INSTAGRAM_ACCESS_TOKEN not set", hasToken: false })
  }

  const results: Record<string, unknown> = {
    hasToken: true,
    tokenPreview: `${token.slice(0, 10)}...${token.slice(-5)}`,
  }

  // Test 1: Check token validity with /me
  try {
    const meRes = await fetch(
      `https://graph.facebook.com/v22.0/me?fields=id,name&access_token=${token}`,
      { cache: "no-store" }
    )
    results.meStatus = meRes.status
    results.me = await meRes.json()
  } catch (err) {
    results.meError = String(err)
  }

  // Test 2: Check token permissions
  try {
    const permRes = await fetch(
      `https://graph.facebook.com/v22.0/me/permissions?access_token=${token}`,
      { cache: "no-store" }
    )
    results.permissionsStatus = permRes.status
    results.permissions = await permRes.json()
  } catch (err) {
    results.permissionsError = String(err)
  }

  // Test 3: Check pages + IG accounts
  try {
    const pagesRes = await fetch(
      `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,instagram_business_account&limit=10&access_token=${token}`,
      { cache: "no-store" }
    )
    results.pagesStatus = pagesRes.status
    results.pages = await pagesRes.json()
  } catch (err) {
    results.pagesError = String(err)
  }

  return Response.json(results, {
    headers: { "Content-Type": "application/json" },
  })
}
