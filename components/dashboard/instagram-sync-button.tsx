"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Instagram, RefreshCw, Check, AlertCircle, Download } from "lucide-react"
import { toast } from "sonner"

interface SyncResult {
  synced: number
  errors: number
  skipped?: number
  total: number
  fetched?: number
  message: string
}

export function InstagramSyncButton({ onSyncComplete, limit = 15 }: { onSyncComplete?: () => void; limit?: number }) {
  const [syncing, setSyncing] = useState(false)
  const [syncMode, setSyncMode] = useState<"new" | "all" | null>(null)
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)

  async function handleSync(mode: "new" | "all") {
    setSyncing(true)
    setSyncMode(mode)
    setLastResult(null)

    const fetchLimit = mode === "all" ? 500 : limit

    try {
      const res = await fetch(`/api/instagram/sync?limit=${fetchLimit}&mode=${mode}`, { method: "POST" })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Sync failed")
        return
      }

      setLastResult(data)
      if (data.synced > 0) {
        toast.success(data.message)
      } else if (data.skipped > 0) {
        toast.info(data.message)
      } else if (data.errorDetails?.length > 0) {
        toast.error(`Errors: ${data.errorDetails[0]}`)
      }
      onSyncComplete?.()
    } catch {
      toast.error("Failed to connect to Instagram API")
    } finally {
      setSyncing(false)
      setSyncMode(null)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={() => handleSync("new")}
        disabled={syncing}
        className="bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white hover:opacity-90 border-0"
      >
        {syncing && syncMode === "new" ? (
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Instagram className="mr-2 h-4 w-4" />
        )}
        {syncing && syncMode === "new" ? "Syncing new..." : "Sync New"}
      </Button>

      <Button
        onClick={() => handleSync("all")}
        disabled={syncing}
        variant="outline"
        size="sm"
      >
        {syncing && syncMode === "all" ? (
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {syncing && syncMode === "all" ? "Syncing all..." : "Sync All"}
      </Button>

      {lastResult && !syncing && (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {lastResult.errors === 0 ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
          )}
          {lastResult.synced} synced
          {(lastResult.skipped ?? 0) > 0 && `, ${lastResult.skipped} skipped`}
          {lastResult.errors > 0 && `, ${lastResult.errors} errors`}
        </span>
      )}
    </div>
  )
}
