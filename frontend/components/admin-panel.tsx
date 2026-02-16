"use client";

import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Checkbox} from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {Label} from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {apiFetch} from "@/lib/api-client";
import {useAuth} from "@/lib/auth-context";
import type {AccessRequest, Plugin, ScopeType, User} from "@/lib/types";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {
  Check,
  ClipboardList,
  Loader2,
  Puzzle,
  UserPlus,
  Users,
  X
} from "lucide-react";
import {useState} from "react";

const AVAILABLE_UNITS = ["Unidade SP", "Unidade RJ", "Unidade MG"];
const AVAILABLE_FACTORIES = ["Fabrica Norte", "Fabrica Sul"];

export function AdminPanel() {
  const {session} = useAuth();
  const queryClient = useQueryClient();

  // Resolve dialog
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [grantedScopeType, setGrantedScopeType] = useState<ScopeType>("GLOBAL");
  const [grantedScopeId, setGrantedScopeId] = useState<string>("");

  // Grant access dialog
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [grantTargetUserId, setGrantTargetUserId] = useState("");
  const [grantPluginId, setGrantPluginId] = useState("");
  const [grantScopeType, setGrantScopeType] = useState<ScopeType>("GLOBAL");
  const [grantScopeId, setGrantScopeId] = useState<string>("");

  // Plugin management dialog
  const [pluginDialogOpen, setPluginDialogOpen] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null);
  const [pluginName, setPluginName] = useState("");
  const [pluginDescription, setPluginDescription] = useState("");
  const [pluginIcon, setPluginIcon] = useState("");
  const [pluginIsPublic, setPluginIsPublic] = useState(false);

  // Queries
  const {data: pendingRequests, isLoading: requestsLoading} = useQuery<AccessRequest[]>({
    queryKey: ["pending-requests"],
    queryFn: () => apiFetch("/requests"),
    enabled: !!session,
    refetchInterval: 5000,
  });

  const {data: users} = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiFetch("/users"),
    enabled: !!session,
  });

  const {data: plugins} = useQuery<Plugin[]>({
    queryKey: ["plugins-admin"],
    queryFn: () => apiFetch("/admin/plugins"),
    enabled: !!session,
  });

  // Mutations
  const resolveMutation = useMutation({
    mutationFn: async ({requestId, action}: {requestId: string; action: "approve" | "reject";}) => {
      const endpoint = action === "approve" ? `/requests/${requestId}/approve` : `/requests/${requestId}/reject`;
      return apiFetch(endpoint, {
        method: "POST",
        body: action === "approve" ? JSON.stringify({
          scopeType: grantedScopeType,
          scopeId: grantedScopeType === "GLOBAL" ? undefined : grantedScopeId,
        }) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["pending-requests"]});
      setResolveDialogOpen(false);
      setSelectedRequest(null);
    },
  });

  const grantAccessMutation = useMutation({
    mutationFn: () => apiFetch("/requests/grant", { // Endpoint sugerido para admin conceder direto
      method: "POST",
      body: JSON.stringify({
        userId: grantTargetUserId,
        pluginId: grantPluginId,
        scopeType: grantScopeType,
        scopeId: grantScopeType === "GLOBAL" ? undefined : grantScopeId,
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["accesses"]});
      setGrantDialogOpen(false);
    },
  });

  const pluginMutation = useMutation({
    mutationFn: async () => {
      const endpoint = editingPlugin ? `/admin/plugins/${editingPlugin.id}` : "/admin/plugins";
      const method = editingPlugin ? "PATCH" : "POST";
      return apiFetch(endpoint, {
        method,
        body: JSON.stringify({
          name: pluginName,
          description: pluginDescription,
          icon: pluginIcon,
          isPublic: pluginIsPublic,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["plugins-admin"]});
      setPluginDialogOpen(false);
      setEditingPlugin(null);
      setPluginName("");
      setPluginDescription("");
      setPluginIcon("");
      setPluginIsPublic(false);
    },
  });

  const editPlugin = (plugin: Plugin) => {
    setEditingPlugin(plugin);
    setPluginName(plugin.name);
    setPluginDescription(plugin.description || "");
    setPluginIcon(plugin.icon || "");
    setPluginIsPublic(plugin.isPublic || false);
    setPluginDialogOpen(true);
  };

  const togglePluginPublicMutation = useMutation({
    mutationFn: async ({id, isPublic}: {id: string; isPublic: boolean;}) => {
      return apiFetch(`/admin/plugins/${id}`, {
        method: "PATCH",
        body: JSON.stringify({isPublic}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["plugins-admin"]});
    },
  });

  const togglePluginStatusMutation = useMutation({
    mutationFn: async ({id, isActive}: {id: string; isActive: boolean;}) => {
      return apiFetch(`/admin/plugins/${id}`, {
        method: "PATCH",
        body: JSON.stringify({isActive}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["plugins-admin"]});
    },
  });

  if (!session) return null;

  const isAdmin = session.role === "PORTAL_ADMIN";

  function openResolveDialog(request: AccessRequest) {
    setSelectedRequest(request);
    setGrantedScopeType(request.scopeType);
    setGrantedScopeId(request.scopeId || "");
    setResolveDialogOpen(true);
  }

  function getScopeLabel(type: ScopeType, id?: string) {
    if (type === "GLOBAL") return "Global";
    return `${type}: ${id}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground text-balance">
            {isAdmin ? "Painel do Administrador" : "Painel do Manager"}
          </h2>
          <p className="mt-1 text-muted-foreground">
            Gerencie solicitacoes e usuarios
          </p>
        </div>
        <Button
          onClick={() => setGrantDialogOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Conceder Acesso
        </Button>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="bg-muted">
          <TabsTrigger value="requests" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Solicitacoes</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuarios</span>
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="plugins" className="gap-2">
              <Puzzle className="h-4 w-4" />
              <span className="hidden sm:inline">Plugins</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <ClipboardList className="h-5 w-5 text-primary" />
                Solicitacoes Pendentes
              </CardTitle>
              <CardDescription>
                {pendingRequests?.length || 0} solicitacoes aguardando aprovacao
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !pendingRequests?.length ? (
                <p className="py-8 text-center text-muted-foreground">
                  Nenhuma solicitacao pendente
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground">Usuario</TableHead>
                        <TableHead className="text-muted-foreground">Plugin</TableHead>
                        <TableHead className="text-muted-foreground">Escopo solicitado</TableHead>
                        <TableHead className="text-muted-foreground">Data</TableHead>
                        <TableHead className="text-right text-muted-foreground">Acoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((req) => (
                        <TableRow key={req.id} className="border-border">
                          <TableCell className="font-medium text-card-foreground">{req.user?.email}</TableCell>
                          <TableCell className="text-card-foreground">{req.plugin?.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30 text-xs text-uppercase">
                              {getScopeLabel(req.scopeType, req.scopeId)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {new Date(req.requestedAt).toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" onClick={() => openResolveDialog(req)} className="bg-emerald-600 text-emerald-50 hover:bg-emerald-700">
                                <Check className="mr-1 h-3 w-3" />
                                Aprovar
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => resolveMutation.mutate({requestId: req.id, action: "reject"})}>
                                <X className="mr-1 h-3 w-3" />
                                Rejeitar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users" className="mt-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <Users className="h-5 w-5 text-primary" />
                  Gerenciamento de Usuarios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground">E-mail</TableHead>
                        <TableHead className="text-muted-foreground">Role</TableHead>
                        <TableHead className="text-muted-foreground">Desde</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map((user) => (
                        <TableRow key={user.id} className="border-border">
                          <TableCell className="font-medium text-card-foreground">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30">
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="plugins" className="mt-4">
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-card-foreground">
                    <Puzzle className="h-5 w-5 text-primary" />
                    Gerenciamento de Plugins
                  </CardTitle>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingPlugin(null);
                    setPluginName("");
                    setPluginDescription("");
                    setPluginDialogOpen(true);
                  }}
                  className="bg-primary text-primary-foreground"
                >
                  <Puzzle className="mr-2 h-4 w-4" />
                  Novo Plugin
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground">Nome</TableHead>
                        <TableHead className="text-muted-foreground">Descrição</TableHead>
                        <TableHead className="text-muted-foreground">Tipo</TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                        <TableHead className="text-right text-muted-foreground">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plugins?.map((plugin) => (
                        <TableRow key={plugin.id} className="border-border">
                          <TableCell className="font-medium text-card-foreground">{plugin.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                            {plugin.description || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`cursor-pointer ${plugin.isPublic ? "bg-blue-500/15 text-blue-500 border-blue-500/30" : "bg-amber-500/15 text-amber-500 border-amber-500/30"}`}
                              onClick={() => togglePluginPublicMutation.mutate({id: plugin.id, isPublic: !plugin.isPublic})}
                            >
                              {plugin.isPublic ? "Público" : "Privado"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={plugin.isActive ? "default" : "secondary"} className={plugin.isActive ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : "bg-muted text-muted-foreground"}>
                              {plugin.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => editPlugin(plugin)}
                              >
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant={plugin.isActive ? "destructive" : "default"}
                                className={!plugin.isActive ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                                onClick={() => togglePluginStatusMutation.mutate({id: plugin.id, isActive: !plugin.isActive})}
                              >
                                {plugin.isActive ? "Desativar" : "Ativar"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* APPROVE DIALOG */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Aprovar Acesso</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="flex flex-col gap-4 pt-2">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm">
                  <span className="font-medium">Usuario:</span> {selectedRequest.user?.email}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Plugin:</span> {selectedRequest.plugin?.name}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Label className="text-sm font-medium">Escopo a Conceder</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["GLOBAL", "UNIT", "FACTORY"] as ScopeType[]).map((type) => (
                    <Button
                      key={type}
                      variant={grantedScopeType === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setGrantedScopeType(type);
                        setGrantedScopeId("");
                      }}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              {grantedScopeType !== "GLOBAL" && (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">
                    {grantedScopeType === "UNIT" ? "Unidade" : "Fábrica"}
                  </Label>
                  <div className="rounded-lg border border-input bg-background p-3 grid grid-cols-1 gap-2">
                    {(grantedScopeType === "UNIT" ? AVAILABLE_UNITS : AVAILABLE_FACTORIES).map((id) => (
                      <label key={id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox
                          checked={grantedScopeId === id}
                          onCheckedChange={() => setGrantedScopeId(id)}
                        />
                        {id}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="w-full bg-emerald-600 text-emerald-50 hover:bg-emerald-700"
                onClick={() => resolveMutation.mutate({requestId: selectedRequest.id, action: "approve"})}
                disabled={resolveMutation.isPending || (grantedScopeType !== "GLOBAL" && !grantedScopeId)}
              >
                {resolveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Confirmar Aprovação
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PLUGIN DIALOG */}
      <Dialog open={pluginDialogOpen} onOpenChange={setPluginDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">
              {editingPlugin ? "Editar Plugin" : "Novo Plugin"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="plugin-name">Nome do Plugin</Label>
              <input
                id="plugin-name"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={pluginName}
                onChange={(e) => setPluginName(e.target.value)}
                placeholder="Ex: Inventory, CRM, etc."
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="plugin-desc">Descrição</Label>
              <textarea
                id="plugin-desc"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={pluginDescription}
                onChange={(e) => setPluginDescription(e.target.value)}
                placeholder="Uma breve descrição da funcionalidade..."
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="plugin-icon">Ícone (Nome Lucide)</Label>
              <input
                id="plugin-icon"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={pluginIcon}
                onChange={(e) => setPluginIcon(e.target.value)}
                placeholder="Ex: Package, Users, Settings (Default: Crown)"
              />
            </div>
            <div className="flex items-center space-x-2 py-2">
              <Checkbox
                id="plugin-public"
                checked={pluginIsPublic}
                onCheckedChange={(checked) => setPluginIsPublic(!!checked)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="plugin-public"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Plugin Público
                </label>
                <p className="text-xs text-muted-foreground">
                  Aprovação automática ao solicitar acesso.
                </p>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => pluginMutation.mutate()}
              disabled={pluginMutation.isPending || !pluginName}
            >
              {pluginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              {editingPlugin ? "Salvar Alterações" : "Criar Plugin"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* GRANT ACCESS DIALOG */}
      <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Conceder Acesso Direto</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="grant-user">Selecionar Usuário</Label>
              <select
                id="grant-user"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={grantTargetUserId}
                onChange={(e) => setGrantTargetUserId(e.target.value)}
              >
                <option value="">Selecione um usuário...</option>
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>{u.email}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="grant-plugin">Selecionar Plugin</Label>
              <select
                id="grant-plugin"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={grantPluginId}
                onChange={(e) => setGrantPluginId(e.target.value)}
              >
                <option value="">Selecione um plugin...</option>
                {plugins?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3">
              <Label className="text-sm font-medium">Escopo</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["GLOBAL", "UNIT", "FACTORY"] as ScopeType[]).map((type) => (
                  <Button
                    key={type}
                    variant={grantScopeType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setGrantScopeType(type);
                      setGrantScopeId("");
                    }}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            {grantScopeType !== "GLOBAL" && (
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">
                  {grantScopeType === "UNIT" ? "Unidade" : "Fábrica"}
                </Label>
                <div className="rounded-lg border border-input bg-background p-3 grid grid-cols-1 gap-2">
                  {(grantScopeType === "UNIT" ? AVAILABLE_UNITS : AVAILABLE_FACTORIES).map((id) => (
                    <label key={id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={grantScopeId === id}
                        onCheckedChange={() => setGrantScopeId(id)}
                      />
                      {id}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => grantAccessMutation.mutate()}
              disabled={grantAccessMutation.isPending || !grantTargetUserId || !grantPluginId || (grantScopeType !== "GLOBAL" && !grantScopeId)}
            >
              {grantAccessMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Conceder Acesso
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}
