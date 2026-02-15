"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { PluginCard } from "@/components/plugin-card"
import { PluginPage } from "@/components/plugin-page"
import { AdminPanel } from "@/components/admin-panel"
import { EmailLogViewer } from "@/components/email-log-viewer"
import { Loader2 } from "lucide-react"
import type { Plugin, AccessRequest } from "@/lib/types"

export function Dashboard() {
  const { session } = useAuth()
  const [showAdmin, setShowAdmin] = useState(false)
  const [showEmails, setShowEmails] = useState(false)
  const [activePluginId, setActivePluginId] = useState<string | null>(null)

  const { data: plugins, isLoading: pluginsLoading } = useQuery<Plugin[]>({
    queryKey: ["plugins"],
    queryFn: async () => {
      const res = await fetch("/api/plugins")
      return res.json()
    },
  })

  const { data: accesses } = useQuery<AccessRequest[]>({
    queryKey: ["accesses", session?.userId],
    queryFn: async () => {
      const res = await fetch(`/api/access?userId=${session?.userId}`)
      return res.json()
    },
    enabled: !!session?.userId,
  })

  if (!session) return null

  // If a plugin is open, show the plugin page
  if (activePluginId) {
    const plugin = plugins?.find((p) => p.id === activePluginId)
    if (plugin) {
      return (
        <PluginPage
          plugin={plugin}
          onBack={() => setActivePluginId(null)}
        />
      )
    }
  }

  function handleOpenPlugin(pluginId: string) {
    setActivePluginId(pluginId)
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        onShowAdmin={() => {
          setShowAdmin(!showAdmin)
          setShowEmails(false)
        }}
        onShowEmails={() => {
          setShowEmails(!showEmails)
          setShowAdmin(false)
        }}
        showAdmin={showAdmin}
        showEmails={showEmails}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {showAdmin ? (
          <AdminPanel />
        ) : showEmails ? (
          <EmailLogViewer />
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground text-balance">
                Plugins Disponiveis
              </h2>
              <p className="mt-1 text-muted-foreground">
                Solicite acesso aos plugins necessarios para seu trabalho
              </p>
            </div>

            {pluginsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {plugins?.map((plugin) => {
                  const access = accesses?.find(
                    (a) => a.pluginId === plugin.id
                  )
                  return (
                    <PluginCard
                      key={plugin.id}
                      plugin={plugin}
                      access={access}
                      userId={session.userId}
                      onOpenPlugin={handleOpenPlugin}
                    />
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
