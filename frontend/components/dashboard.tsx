"use client";

import {AdminPanel} from "@/components/admin-panel";
import {DashboardHeader} from "@/components/dashboard-header";
import {EmailLogViewer} from "@/components/email-log-viewer";
import {PluginCard} from "@/components/plugin-card";
import {PluginPage} from "@/components/plugin-page";
import {apiFetch} from "@/lib/api-client";
import {useAuth} from "@/lib/auth-context";
import type {AccessRequest, Plugin} from "@/lib/types";
import {useQuery} from "@tanstack/react-query";
import {Loader2} from "lucide-react";
import {useState} from "react";

export function Dashboard() {
  const {session} = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);
  const [showEmails, setShowEmails] = useState(false);
  const [activePluginId, setActivePluginId] = useState<string | null>(null);

  const {data: plugins, isLoading: pluginsLoading} = useQuery<Plugin[]>({
    queryKey: ["plugins"],
    queryFn: () => apiFetch("/plugins"),
  });

  // Permissões diretas do backend (AccessRequests resolvidos)
  const {data: accesses} = useQuery<AccessRequest[]>({
    queryKey: ["accesses", session?.userId],
    queryFn: () => apiFetch(`/plugins/my-permissions`),
    enabled: !!session?.userId,
    // Polling inteligente: Só atualiza se houver pelo menos uma solicitação pendente
    refetchInterval: (query) => {
      const hasPending = query.state.data?.some(a => a.status === "PENDING");
      return hasPending ? 30000 : false;
    },
  });

  if (!session) return null;

  // If a plugin is open, show the plugin page
  if (activePluginId) {
    const plugin = plugins?.find((p) => p.id === activePluginId);
    if (plugin) {
      return (
        <PluginPage
          plugin={plugin}
          onBack={() => setActivePluginId(null)}
        />
      );
    }
  }

  function handleOpenPlugin(pluginId: string) {
    setActivePluginId(pluginId);
  }

  const isManagementRole = session.role === "PORTAL_ADMIN" || session.role === "PLUGIN_MANAGER";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader
        onShowAdmin={() => {
          setShowAdmin(!showAdmin);
          setShowEmails(false);
        }}
        onShowEmails={() => {
          setShowEmails(!showEmails);
          setShowAdmin(false);
        }}
        showAdmin={showAdmin}
        showEmails={showEmails}
        canSeeAdmin={isManagementRole}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {showAdmin && isManagementRole ? (
          <AdminPanel />
        ) : showEmails && session.role === "PORTAL_ADMIN" ? (
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
                  );
                  return (
                    <PluginCard
                      key={plugin.id}
                      plugin={plugin}
                      access={access}
                      userId={session.userId}
                      onOpenPlugin={handleOpenPlugin}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
