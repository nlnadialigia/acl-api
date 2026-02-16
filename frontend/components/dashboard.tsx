"use client";

import { AdminPanel } from "@/components/admin-panel";
import { DashboardHeader } from "@/components/dashboard-header";
import { EmailLogViewer } from "@/components/email-log-viewer";
import { PluginCard } from "@/components/plugin-card";
import { PluginPage } from "@/components/plugin-page";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { AccessRequest, Plugin } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Grid, Loader2, Star } from "lucide-react";
import { useState } from "react";

export function Dashboard() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [showAdmin, setShowAdmin] = useState(false);
  const [showEmails, setShowEmails] = useState(false);
  const [activePluginId, setActivePluginId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const { data: plugins, isLoading: pluginsLoading } = useQuery<Plugin[]>({
    queryKey: ["plugins"],
    queryFn: () => apiFetch("/plugins"),
  });

  // Permissões diretas do backend (AccessRequests resolvidos)
  const { data: accesses } = useQuery<AccessRequest[]>({
    queryKey: ["accesses", session?.userId],
    queryFn: () => apiFetch(`/plugins/my-permissions`),
    enabled: !!session?.userId,
    // Polling inteligente: Só atualiza se houver pelo menos uma solicitação pendente
    refetchInterval: (query) => {
      const hasPending = query.state.data?.some(a => a.status === "PENDING");
      return hasPending ? 30000 : false;
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (pluginId: string) => apiFetch(`/plugins/${pluginId}/favorite`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugins"] });
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

  const favoritePlugins = plugins?.filter(p =>
    p.userPluginFavorites?.some(f => f.userId === session.userId)
  ) || [];

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
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground text-balance">
                Portal de Plugins
              </h2>
              <p className="mt-1 text-muted-foreground">
                Gerencie seus acessos e ferramentas em um só lugar
              </p>
            </div>

            {pluginsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                  <TabsTrigger value="all" className="flex gap-2">
                    <Grid className="h-3.5 w-3.5" />
                    Todos
                  </TabsTrigger>
                  <TabsTrigger value="favorites" className="flex gap-2">
                    <Star className={`h-3.5 w-3.5 ${activeTab === 'favorites' ? 'fill-current' : ''}`} />
                    Favoritos
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {plugins?.map((plugin) => {
                      const access = accesses?.find(a => a.pluginId === plugin.id);
                      const isFavorite = plugin.userPluginFavorites?.some(f => f.userId === session.userId);
                      return (
                        <PluginCard
                          key={plugin.id}
                          plugin={plugin}
                          access={access}
                          userId={session.userId}
                          onOpenPlugin={handleOpenPlugin}
                          isFavorite={isFavorite}
                          onToggleFavorite={() => toggleFavoriteMutation.mutate(plugin.id)}
                        />
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="favorites">
                  {favoritePlugins.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
                      <Star className="h-10 w-10 text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground font-medium">Você ainda não tem favoritos</p>
                      <p className="text-xs text-muted-foreground/70">Clique na estrela dos cards para favoritar um plugin</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {favoritePlugins.map((plugin) => {
                        const access = accesses?.find(a => a.pluginId === plugin.id);
                        return (
                          <PluginCard
                            key={plugin.id}
                            plugin={plugin}
                            access={access}
                            userId={session.userId}
                            onOpenPlugin={handleOpenPlugin}
                            isFavorite={true}
                            onToggleFavorite={() => toggleFavoriteMutation.mutate(plugin.id)}
                          />
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </main>
    </div>
  );
}
