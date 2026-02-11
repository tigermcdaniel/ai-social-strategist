"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Instagram, RefreshCw, Check, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface SyncResult {
  synced: number
  errors: number
  total: number
  message: string
}

export function InstagramSyncButton({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)

  async function handleSync() {
    setSyncing(true)
    setLastResult(null)

    try {
      const res = await fetch("/api/instagram/sync", { method: "POST" })
      const data = await res.json()
      console.log("[v0] Sync response status:", res.status, "body:", JSON.stringify(data))

      if (!res.ok) {
        console.log("[v0] Sync error:", data.error)
        toast.error(data.error ?? "Sync failed")
        return
      }

      setLastResult(data)
      toast.success(data.message)
      onSyncComplete?.()
    } catch (err) {
      console.log("[v0] Sync fetch error:", err)
      toast.error("Failed to connect to Instagram API")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleSync}
        disabled={syncing}
        className="bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white hover:opacity-90 border-0"
      >
        {syncing ? (
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Instagram className="mr-2 h-4 w-4" />
        )}
        {syncing ? "Syncing..." : "Sync Instagram"}
      </Button>

      {lastResult && !syncing && (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {lastResult.errors === 0 ? (
            <Check className="h-3.5 w-3.5 text-success" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-warning" />
          )}
          {lastResult.synced}/{lastResult.total} synced
        </span>
      )}
    </div>
  )
}
