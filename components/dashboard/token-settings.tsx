"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Key, Check, AlertCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface TokenStatus {
  set: boolean
  updated_at?: string
  preview?: string
}

export function TokenSettings() {
  const [pageToken, setPageToken] = useState("")
  const [userToken, setUserToken] = useState("")
  const [saving, setSaving] = useState<string | null>(null)
  const [status, setStatus] = useState<{
    instagram_page_token: TokenStatus
    instagram_access_token: TokenStatus
  } | null>(null)

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {})
  }, [])

  const saveToken = async (key: string, value: string, label: string) => {
    if (!value.trim()) {
      toast.error(`Paste your ${label} first`)
      return
    }
    setSaving(key)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: value.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      toast.success(`${label} saved`)
      if (key === "instagram_page_token") setPageToken("")
      else setUserToken("")
      // Refresh status
      const statusRes = await fetch("/api/settings")
      setStatus(await statusRes.json())
    } catch {
      toast.error("Failed to save token")
    } finally {
      setSaving(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Key className="h-5 w-5" />
          Instagram API Tokens
        </CardTitle>
        <CardDescription>
          Tokens expire hourly. Paste your updated tokens here before syncing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Page Access Token */}
        <div className="space-y-2">
          <Label htmlFor="page-token" className="text-sm font-medium text-foreground">
            Page Access Token
          </Label>
          {status?.instagram_page_token?.set && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-green-500" />
              <span>
                Set ({status.instagram_page_token.preview}) &middot; updated{" "}
                {formatDistanceToNow(new Date(status.instagram_page_token.updated_at!), { addSuffix: true })}
              </span>
            </div>
          )}
          {!status?.instagram_page_token?.set && status && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              <span>Not set</span>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              id="page-token"
              type="password"
              placeholder="Paste page access token..."
              value={pageToken}
              onChange={(e) => setPageToken(e.target.value)}
              className="font-mono text-xs"
            />
            <Button
              onClick={() => saveToken("instagram_page_token", pageToken, "Page token")}
              disabled={saving === "instagram_page_token" || !pageToken.trim()}
              size="sm"
            >
              {saving === "instagram_page_token" ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* User Access Token */}
        <div className="space-y-2">
          <Label htmlFor="user-token" className="text-sm font-medium text-foreground">
            User Access Token
          </Label>
          {status?.instagram_access_token?.set && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-green-500" />
              <span>
                Set ({status.instagram_access_token.preview}) &middot; updated{" "}
                {formatDistanceToNow(new Date(status.instagram_access_token.updated_at!), { addSuffix: true })}
              </span>
            </div>
          )}
          {!status?.instagram_access_token?.set && status && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              <span>Not set (optional - page token is used for sync)</span>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              id="user-token"
              type="password"
              placeholder="Paste user access token..."
              value={userToken}
              onChange={(e) => setUserToken(e.target.value)}
              className="font-mono text-xs"
            />
            <Button
              onClick={() => saveToken("instagram_access_token", userToken, "User token")}
              disabled={saving === "instagram_access_token" || !userToken.trim()}
              size="sm"
            >
              {saving === "instagram_access_token" ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
