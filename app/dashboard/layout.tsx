import React from "react"
import { createClient } from "@/lib/supabase/server"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Bypass auth for testing - pass real user or a mock
  const displayUser = user ?? ({
    id: "test-user-00000000-0000-0000-0000-000000000000",
    email: "tester@growthpulse.dev",
  } as any)

  return <DashboardShell user={displayUser}>{children}</DashboardShell>
}
