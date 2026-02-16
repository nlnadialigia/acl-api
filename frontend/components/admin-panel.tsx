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
import type {AccessRequest, Plugin, PluginPermissionDefinition, PluginRole, ScopeType, User} from "@/lib/types";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {
  Check,
  ClipboardList,
  Loader2,
  Puzzle,
  Trash2,
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
  const isAdmin = session?.role === "PORTAL_ADMIN";

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

  // ACL Management state
  const [grantRoleId, setGrantRoleId] = useState("");
  const [selectedAclPluginId, setSelectedAclPluginId] = useState<string | null>(null);
  const [newDefName, setNewDefName] = useState("");
  const [newDefLabel, setNewDefLabel] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [selectedDefIds, setSelectedDefIds] = useState<string[]>([]);

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
    mutationFn: () => apiFetch("/requests/grant", {
      method: "POST",
      body: JSON.stringify({
        userId: grantTargetUserId,
        pluginId: grantPluginId,
        roleId: grantRoleId,
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

  const createDefMutation = useMutation({
    mutationFn: (data: {pluginId?: string; name: string; label: string;}) =>
      apiFetch("/admin/plugins/definitions", {method: "POST", body: JSON.stringify(data)}),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["definitions"]});
      setNewDefName("");
      setNewDefLabel("");
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: (data: {pluginId: string; name: string; description: string; definitionIds: string[];}) =>
      apiFetch(`/admin/plugins/${data.pluginId}/roles`, {method: "POST", body: JSON.stringify(data)}),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["roles"]});
      setNewRoleName("");
      setNewRoleDesc("");
      setSelectedDefIds([]);
    },
  });

  const deleteDefMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/plugins/definitions/${id}`, {method: "DELETE"}),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["definitions"]});
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/plugins/roles/${id}`, {method: "DELETE"}),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["roles"]});
    },
    onError: (err: any) => {
      alert(err.message || "Erro ao excluir papel. Verifique se existem permissões ativas vinculadas a ele.");
    }
  });

  const {data: allDefinitions} = useQuery<PluginPermissionDefinition[]>({
    queryKey: ["definitions", selectedAclPluginId],
    queryFn: () => apiFetch(`/admin/plugins/${selectedAclPluginId || 'global'}/definitions`),
    enabled: !!selectedAclPluginId || isAdmin,
  });

  const {data: currentPluginRoles} = useQuery<PluginRole[]>({
    queryKey: ["roles", selectedAclPluginId],
    queryFn: () => apiFetch(`/admin/plugins/${selectedAclPluginId}/roles`),
    enabled: !!selectedAclPluginId,
  });

  const {data: grantPluginRoles} = useQuery<PluginRole[]>({
    queryKey: ["plugin-roles", grantPluginId],
    queryFn: () => apiFetch(`/admin/plugins/${grantPluginId}/roles`),
    enabled: !!grantPluginId,
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
          <TabsTrigger value="acl" className="gap-2">
            <Check className="h-4 w-4" />
            <span className="hidden sm:inline">Roles & Permissões</span>
          </TabsTrigger>
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
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {req.role?.name || "Nível Padrão"}
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
        <TabsContent value="acl" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* DEFINITIONS MANAGEMENT */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Biblioteca de Permissões
                </CardTitle>
                <CardDescription>Defina as ações possíveis (ex: users:read)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg">
                  <Label>Vincular a Plugin (Opcional)</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={selectedAclPluginId || ""}
                    onChange={(e) => setSelectedAclPluginId(e.target.value || null)}
                  >
                    <option value="">Permissão Global</option>
                    {plugins?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                {isAdmin && (
                  <div className="space-y-3 p-3 border border-dashed rounded-lg">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        placeholder="Nome (ex: app:edit)"
                        className="h-8 px-2 text-xs rounded border bg-background"
                        value={newDefName}
                        onChange={e => setNewDefName(e.target.value)}
                      />
                      <input
                        placeholder="Label (ex: Editar App)"
                        className="h-8 px-2 text-xs rounded border bg-background"
                        value={newDefLabel}
                        onChange={e => setNewDefLabel(e.target.value)}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="w-full h-8"
                      disabled={!newDefName || !newDefLabel}
                      onClick={() => createDefMutation.mutate({
                        pluginId: selectedAclPluginId || undefined,
                        name: newDefName,
                        label: newDefLabel
                      })}
                    >
                      Adicionar Permissão
                    </Button>
                  </div>
                )}

                <div className="max-h-[300px] overflow-y-auto space-y-1">
                  {allDefinitions?.map(def => (
                    <div key={def.id} className="flex items-center justify-between p-2 text-xs rounded hover:bg-muted/50 border border-transparent hover:border-border">
                      <div className="flex flex-col">
                        <span className="font-bold">{def.label}</span>
                        <code className="text-[10px] text-muted-foreground">{def.name}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        {!def.pluginId && <Badge variant="outline" className="text-[10px]">Global</Badge>}
                        {isAdmin && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              if (confirm("Deseja realmente excluir esta definição?")) {
                                deleteDefMutation.mutate(def.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ROLE MANAGEMENT */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Papéis (Roles) do Plugin
                </CardTitle>
                <CardDescription>Agrupe permissões em papéis nomeados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedAclPluginId ? (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm italic">
                    Selecione um plugin ao lado para gerenciar papéis
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 p-3 border border-dashed rounded-lg bg-primary/5">
                      <input
                        placeholder="Nome do Papel (ex: Supervisor)"
                        className="h-9 w-full px-3 text-sm rounded border bg-background"
                        value={newRoleName}
                        onChange={e => setNewRoleName(e.target.value)}
                      />
                      <div className="max-h-[150px] overflow-y-auto p-2 border rounded bg-background">
                        <Label className="text-[10px] uppercase mb-1 block">Permissões Inclusas</Label>
                        {allDefinitions?.map(def => (
                          <label key={def.id} className="flex items-center gap-2 p-1 text-xs cursor-pointer hover:bg-muted rounded">
                            <Checkbox
                              checked={selectedDefIds.includes(def.id)}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedDefIds([...selectedDefIds, def.id]);
                                else setSelectedDefIds(selectedDefIds.filter(id => id !== def.id));
                              }}
                            />
                            {def.label}
                          </label>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={!newRoleName || selectedDefIds.length === 0}
                        onClick={() => createRoleMutation.mutate({
                          pluginId: selectedAclPluginId,
                          name: newRoleName,
                          description: newRoleDesc,
                          definitionIds: selectedDefIds
                        })}
                      >
                        Criar Novo Papel
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Papéis Existentes</Label>
                      {currentPluginRoles?.map(role => (
                        <div key={role.id} className="p-3 border rounded-lg bg-card">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm text-primary">{role.name}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px]">{role.definitions?.length || 0} permissões</Badge>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  if (confirm("Deseja realmente excluir este papel?")) {
                                    deleteRoleMutation.mutate(role.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {role.definitions?.map(def => (
                              <span key={def.id} className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border">
                                {def.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
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
                <p className="text-sm">
                  <span className="font-medium">Papel solicitado:</span> {selectedRequest.role?.name || "Nível Padrão"}
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

            <div className="flex flex-col gap-2">
              <Label htmlFor="grant-role">Selecionar Papel (Role)</Label>
              <select
                id="grant-role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={grantRoleId}
                onChange={(e) => setGrantRoleId(e.target.value)}
              >
                <option value="">Selecione um papel...</option>
                {grantPluginRoles?.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
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
              disabled={grantAccessMutation.isPending || !grantTargetUserId || !grantPluginId || !grantRoleId || (grantScopeType !== "GLOBAL" && !grantScopeId)}
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
