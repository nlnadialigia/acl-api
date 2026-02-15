"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth-context"
import { AVAILABLE_UNITS, AVAILABLE_FACTORIES } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Check, X, Loader2, Users, ClipboardList, Shield, KeyRound, Plus, Trash2,
  Globe, Puzzle, UserPlus,
} from "lucide-react"
import type { Plugin, PermissionType } from "@/lib/types"

interface EnrichedRequest {
  id: string
  userId: string
  pluginId: string
  units: string[]
  factories: string[]
  permissionTypeId?: string
  status: string
  createdAt: string
  username: string
  pluginName: string
  permissionTypeName?: string | null
}

interface UserInfo {
  id: string
  username: string
  role: string
  managedPlugins: string[]
  createdAt: string
}

export function AdminPanel() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  // Resolve dialog
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<EnrichedRequest | null>(null)
  const [grantedUnits, setGrantedUnits] = useState<string[]>([])
  const [grantedFactories, setGrantedFactories] = useState<string[]>([])
  const [grantedPermissionTypeId, setGrantedPermissionTypeId] = useState("")

  // Grant access dialog
  const [grantDialogOpen, setGrantDialogOpen] = useState(false)
  const [grantTargetUserId, setGrantTargetUserId] = useState("")
  const [grantPluginId, setGrantPluginId] = useState("")
  const [grantUnits, setGrantUnits] = useState<string[]>([])
  const [grantFactories, setGrantFactories] = useState<string[]>([])
  const [grantPermTypeId, setGrantPermTypeId] = useState("")

  // Permission type creation
  const [newPermName, setNewPermName] = useState("")
  const [newPermDesc, setNewPermDesc] = useState("")
  const [newPermPluginId, setNewPermPluginId] = useState("")

  // Queries
  const { data: pendingRequests, isLoading: requestsLoading } = useQuery<EnrichedRequest[]>({
    queryKey: ["pending-requests", session?.userId],
    queryFn: async () => {
      const params = new URLSearchParams({
        userId: session!.userId,
        role: session!.role,
        managedPlugins: session!.managedPlugins.join(","),
      })
      const res = await fetch(`/api/access/pending?${params}`)
      return res.json()
    },
    enabled: !!session,
    refetchInterval: 3000,
  })

  const { data: users } = useQuery<UserInfo[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users")
      return res.json()
    },
  })

  const { data: plugins } = useQuery<Plugin[]>({
    queryKey: ["plugins"],
    queryFn: async () => {
      const res = await fetch("/api/plugins")
      return res.json()
    },
  })

  const { data: allPermissionTypes } = useQuery<PermissionType[]>({
    queryKey: ["all-permission-types"],
    queryFn: async () => {
      const res = await fetch("/api/plugins/permission-types")
      return res.json()
    },
  })

  const { data: requestPluginPermTypes } = useQuery<PermissionType[]>({
    queryKey: ["permission-types", selectedRequest?.pluginId],
    queryFn: async () => {
      const res = await fetch(`/api/plugins/permission-types?pluginId=${selectedRequest!.pluginId}`)
      return res.json()
    },
    enabled: !!selectedRequest?.pluginId,
  })

  const { data: grantPluginPermTypes } = useQuery<PermissionType[]>({
    queryKey: ["permission-types", grantPluginId],
    queryFn: async () => {
      const res = await fetch(`/api/plugins/permission-types?pluginId=${grantPluginId}`)
      return res.json()
    },
    enabled: !!grantPluginId,
  })

  // Mutations
  const resolveMutation = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: "approve" | "reject" }) => {
      const res = await fetch("/api/access/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          action,
          resolvedBy: session!.userId,
          grantedUnits: action === "approve" ? grantedUnits : undefined,
          grantedFactories: action === "approve" ? grantedFactories : undefined,
          grantedPermissionTypeId: action === "approve" && grantedPermissionTypeId ? grantedPermissionTypeId : undefined,
        }),
      })
      if (!res.ok) throw new Error("Falha ao resolver solicitacao")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-requests"] })
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      setResolveDialogOpen(false)
      setSelectedRequest(null)
      resetResolveForm()
    },
  })

  const grantAccessMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/access/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grantedBy: session!.userId,
          targetUserId: grantTargetUserId,
          pluginId: grantPluginId,
          units: grantUnits,
          factories: grantUnits.includes("Geral") ? [] : grantFactories,
          permissionTypeId: grantPermTypeId || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Falha ao conceder acesso")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accesses"] })
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      setGrantDialogOpen(false)
      resetGrantForm()
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, role, managedPlugins }: { userId: string; role?: string; managedPlugins?: string[] }) => {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role, managedPlugins }),
      })
      if (!res.ok) throw new Error("Falha ao atualizar usuario")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const createPermTypeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/plugins/permission-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pluginId: newPermPluginId, name: newPermName, description: newPermDesc }),
      })
      if (!res.ok) throw new Error("Falha ao criar tipo")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-permission-types"] })
      queryClient.invalidateQueries({ queryKey: ["permission-types"] })
      setNewPermName("")
      setNewPermDesc("")
      setNewPermPluginId("")
    },
  })

  const deletePermTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/plugins/permission-types?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Falha ao remover tipo")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-permission-types"] })
      queryClient.invalidateQueries({ queryKey: ["permission-types"] })
    },
  })

  const togglePublicMutation = useMutation({
    mutationFn: async ({ pluginId, isPublic }: { pluginId: string; isPublic: boolean }) => {
      const res = await fetch("/api/plugins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pluginId, isPublic }),
      })
      if (!res.ok) throw new Error("Falha ao atualizar plugin")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugins"] })
    },
  })

  if (!session) return null

  const isAdmin = session.role === "admin"
  const managedPluginsList = isAdmin
    ? plugins || []
    : (plugins || []).filter((p) => session.managedPlugins.includes(p.id))

  // Helpers
  function resetResolveForm() {
    setGrantedUnits([])
    setGrantedFactories([])
    setGrantedPermissionTypeId("")
  }

  function resetGrantForm() {
    setGrantTargetUserId("")
    setGrantPluginId("")
    setGrantUnits([])
    setGrantFactories([])
    setGrantPermTypeId("")
  }

  function openResolveDialog(request: EnrichedRequest) {
    setSelectedRequest(request)
    setGrantedUnits(request.units || ["Geral"])
    setGrantedFactories(request.factories || [])
    setGrantedPermissionTypeId(request.permissionTypeId || "")
    setResolveDialogOpen(true)
  }

  function toggleResolveUnit(unit: string) {
    if (unit === "Geral") {
      if (grantedUnits.includes("Geral")) {
        setGrantedUnits([])
      } else {
        setGrantedUnits(["Geral"])
        setGrantedFactories([])
      }
      return
    }
    setGrantedUnits((prev) => {
      const filtered = prev.filter((u) => u !== "Geral")
      return filtered.includes(unit) ? filtered.filter((u) => u !== unit) : [...filtered, unit]
    })
  }

  function toggleResolveFactory(factory: string) {
    setGrantedFactories((prev) =>
      prev.includes(factory) ? prev.filter((f) => f !== factory) : [...prev, factory]
    )
  }

  function toggleGrantUnit(unit: string) {
    if (unit === "Geral") {
      if (grantUnits.includes("Geral")) {
        setGrantUnits([])
      } else {
        setGrantUnits(["Geral"])
        setGrantFactories([])
      }
      return
    }
    setGrantUnits((prev) => {
      const filtered = prev.filter((u) => u !== "Geral")
      return filtered.includes(unit) ? filtered.filter((u) => u !== unit) : [...filtered, unit]
    })
  }

  function toggleGrantFactory(factory: string) {
    setGrantFactories((prev) =>
      prev.includes(factory) ? prev.filter((f) => f !== factory) : [...prev, factory]
    )
  }

  function getScopeLabel(units: string[], factories: string[]) {
    if (!units || units.length === 0) return "Nenhum"
    if (units.includes("Geral")) return "Geral"
    return `${units.join(", ")}${factories?.length ? ` | ${factories.join(", ")}` : ""}`
  }

  function getPermTypeName(permTypeId?: string | null) {
    if (!permTypeId || !allPermissionTypes) return null
    const pt = allPermissionTypes.find((p) => p.id === permTypeId)
    return pt?.name || null
  }

  const resolveIsGeneral = grantedUnits.includes("Geral")
  const grantIsGeneral = grantUnits.includes("Geral")

  // Users available for granting access (exclude the current user)
  const grantableUsers = (users || []).filter((u) => u.id !== session.userId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground text-balance">
            {isAdmin ? "Painel do Administrador" : "Painel do Manager"}
          </h2>
          <p className="mt-1 text-muted-foreground">
            Gerencie solicitacoes, permissoes e usuarios
          </p>
        </div>
        <Button
          onClick={() => { setGrantDialogOpen(true); resetGrantForm() }}
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
          <TabsTrigger value="permissions" className="gap-2">
            <KeyRound className="h-4 w-4" />
            <span className="hidden sm:inline">Tipos de Permissao</span>
          </TabsTrigger>
          <TabsTrigger value="plugins" className="gap-2">
            <Puzzle className="h-4 w-4" />
            <span className="hidden sm:inline">Plugins</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuarios</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* REQUESTS TAB */}
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
                        <TableHead className="text-muted-foreground">Tipo</TableHead>
                        <TableHead className="text-muted-foreground">Escopo</TableHead>
                        <TableHead className="text-muted-foreground">Data</TableHead>
                        <TableHead className="text-right text-muted-foreground">Acoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((req) => (
                        <TableRow key={req.id} className="border-border">
                          <TableCell className="font-medium text-card-foreground">{req.username}</TableCell>
                          <TableCell className="text-card-foreground">{req.pluginName}</TableCell>
                          <TableCell>
                            {req.permissionTypeName ? (
                              <Badge variant="outline" className="border-primary/30 text-primary">
                                {req.permissionTypeName}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30 text-xs">
                              {getScopeLabel(req.units, req.factories)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(req.createdAt).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" onClick={() => openResolveDialog(req)} className="bg-emerald-600 text-emerald-50 hover:bg-emerald-700">
                                <Check className="mr-1 h-3 w-3" />
                                Aprovar
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => resolveMutation.mutate({ requestId: req.id, action: "reject" })}>
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

        {/* PERMISSION TYPES TAB */}
        <TabsContent value="permissions" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <KeyRound className="h-5 w-5 text-primary" />
                Tipos de Permissao
              </CardTitle>
              <CardDescription>
                Crie e gerencie tipos de permissao para cada plugin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6">
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" />
                    Novo Tipo de Permissao
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Plugin</Label>
                      <Select value={newPermPluginId} onValueChange={setNewPermPluginId}>
                        <SelectTrigger className="bg-background border-input">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {managedPluginsList.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Nome</Label>
                      <Input value={newPermName} onChange={(e) => setNewPermName(e.target.value)} placeholder="Ex: Leitura" className="bg-background border-input" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Descricao</Label>
                      <Input value={newPermDesc} onChange={(e) => setNewPermDesc(e.target.value)} placeholder="Ex: Somente leitura" className="bg-background border-input" />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={() => createPermTypeMutation.mutate()}
                        disabled={!newPermPluginId || !newPermName.trim() || createPermTypeMutation.isPending}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        size="sm"
                      >
                        {createPermTypeMutation.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
                        Criar
                      </Button>
                    </div>
                  </div>
                </div>

                {managedPluginsList.map((plugin) => {
                  const types = (allPermissionTypes || []).filter((pt) => pt.pluginId === plugin.id)
                  if (types.length === 0) return null
                  return (
                    <div key={plugin.id}>
                      <h4 className="mb-2 text-sm font-semibold text-card-foreground">{plugin.name}</h4>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border">
                              <TableHead className="text-muted-foreground">Nome</TableHead>
                              <TableHead className="text-muted-foreground">Descricao</TableHead>
                              <TableHead className="text-right text-muted-foreground">Acao</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {types.map((pt) => (
                              <TableRow key={pt.id} className="border-border">
                                <TableCell className="font-medium text-card-foreground">
                                  <Badge variant="outline" className="border-primary/30 text-primary">{pt.name}</Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{pt.description}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deletePermTypeMutation.mutate(pt.id)}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )
                })}

                {managedPluginsList.every((plugin) => !(allPermissionTypes || []).some((pt) => pt.pluginId === plugin.id)) && (
                  <p className="py-4 text-center text-muted-foreground">
                    Nenhum tipo de permissao cadastrado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PLUGINS TAB */}
        <TabsContent value="plugins" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Puzzle className="h-5 w-5 text-primary" />
                Configuracao de Plugins
              </CardTitle>
              <CardDescription>
                Configure a visibilidade publica dos plugins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Plugin</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Permissoes</TableHead>
                      <TableHead className="text-right text-muted-foreground">Publico</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {managedPluginsList.map((plugin) => {
                      const types = (allPermissionTypes || []).filter((pt) => pt.pluginId === plugin.id)
                      return (
                        <TableRow key={plugin.id} className="border-border">
                          <TableCell className="font-medium text-card-foreground">{plugin.name}</TableCell>
                          <TableCell>
                            {plugin.isPublic ? (
                              <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30">
                                <Globe className="mr-1 h-3 w-3" />
                                Publico
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                Privado
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{types.length} tipo(s)</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant={plugin.isPublic ? "destructive" : "default"}
                              onClick={() => togglePublicMutation.mutate({ pluginId: plugin.id, isPublic: !plugin.isPublic })}
                              className={!plugin.isPublic ? "bg-emerald-600 text-emerald-50 hover:bg-emerald-700" : ""}
                            >
                              {plugin.isPublic ? "Tornar Privado" : "Tornar Publico"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* USERS TAB (admin only) */}
        {isAdmin && (
          <TabsContent value="users" className="mt-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <Users className="h-5 w-5 text-primary" />
                  Gerenciamento de Usuarios
                </CardTitle>
                <CardDescription>
                  Altere roles e atribua plugins gerenciados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!users?.length ? (
                  <p className="py-8 text-center text-muted-foreground">
                    Nenhum usuario encontrado
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead className="text-muted-foreground">Username</TableHead>
                          <TableHead className="text-muted-foreground">Role</TableHead>
                          <TableHead className="text-muted-foreground">Desde</TableHead>
                          <TableHead className="text-right text-muted-foreground">Acoes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id} className="border-border">
                            <TableCell className="font-medium text-card-foreground">
                              <div className="flex items-center gap-2">
                                {user.username}
                                {user.role === "admin" && <Shield className="h-3 w-3 text-primary" />}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="capitalize bg-primary/15 text-primary border-primary/30">
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {user.role !== "admin" && (
                                  <Select
                                    value={user.role}
                                    onValueChange={(role) => updateUserMutation.mutate({ userId: user.id, role })}
                                  >
                                    <SelectTrigger className="w-32 bg-background border-input">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">User</SelectItem>
                                      <SelectItem value="manager">Manager</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
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
        )}
      </Tabs>

      {/* APPROVE DIALOG */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Aprovar Acesso</DialogTitle>
            <DialogDescription>
              Voce pode conceder o acesso solicitado ou definir um escopo diferente
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="flex flex-col gap-4 pt-2">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-card-foreground">Usuario:</span> {selectedRequest.username}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-card-foreground">Plugin:</span> {selectedRequest.pluginName}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-card-foreground">Solicitado:</span>{" "}
                  {getScopeLabel(selectedRequest.units, selectedRequest.factories)}
                </p>
                {selectedRequest.permissionTypeName && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-card-foreground">Tipo:</span>{" "}
                    {selectedRequest.permissionTypeName}
                  </p>
                )}
              </div>

              {/* Permission type override */}
              {requestPluginPermTypes && requestPluginPermTypes.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Label className="text-card-foreground text-sm font-medium">Tipo de Permissao a Conceder</Label>
                  <Select value={grantedPermissionTypeId} onValueChange={setGrantedPermissionTypeId}>
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue placeholder="Manter solicitado..." />
                    </SelectTrigger>
                    <SelectContent>
                      {requestPluginPermTypes.map((pt) => (
                        <SelectItem key={pt.id} value={pt.id}>
                          {pt.name} - {pt.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Units */}
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground text-sm font-medium">Unidades a Conceder</Label>
                <div className="rounded-lg border border-input bg-background p-3 grid grid-cols-2 gap-2">
                  {AVAILABLE_UNITS.map((unit) => (
                    <label key={unit} className="flex items-center gap-2 cursor-pointer text-sm text-card-foreground">
                      <Checkbox
                        checked={grantedUnits.includes(unit)}
                        onCheckedChange={() => toggleResolveUnit(unit)}
                        disabled={unit !== "Geral" && resolveIsGeneral}
                      />
                      <span className={unit === "Geral" ? "font-semibold" : ""}>{unit}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Factories */}
              <div className="flex flex-col gap-2">
                <Label className={`text-sm font-medium ${resolveIsGeneral ? "text-muted-foreground" : "text-card-foreground"}`}>
                  Fabricas a Conceder
                  {resolveIsGeneral && <span className="ml-2 text-xs font-normal">(desabilitado para acesso geral)</span>}
                </Label>
                <div className={`rounded-lg border border-input bg-background p-3 grid grid-cols-2 gap-2 ${resolveIsGeneral ? "opacity-50" : ""}`}>
                  {AVAILABLE_FACTORIES.map((factory) => (
                    <label key={factory} className="flex items-center gap-2 cursor-pointer text-sm text-card-foreground">
                      <Checkbox
                        checked={grantedFactories.includes(factory)}
                        onCheckedChange={() => toggleResolveFactory(factory)}
                        disabled={resolveIsGeneral}
                      />
                      {factory}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-emerald-600 text-emerald-50 hover:bg-emerald-700"
                  onClick={() => resolveMutation.mutate({ requestId: selectedRequest.id, action: "approve" })}
                  disabled={resolveMutation.isPending || grantedUnits.length === 0}
                >
                  {resolveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Aprovar
                </Button>
                <Button variant="outline" className="border-border text-card-foreground" onClick={() => setResolveDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* GRANT ACCESS DIALOG */}
      <Dialog open={grantDialogOpen} onOpenChange={(open) => { setGrantDialogOpen(open); if (!open) resetGrantForm() }}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">
              Conceder Acesso
            </DialogTitle>
            <DialogDescription>
              {isAdmin
                ? "Conceda acesso a qualquer usuario em qualquer plugin"
                : "Conceda acesso a usuarios nos plugins que voce gerencia"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            {/* Target user */}
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground text-sm font-medium">Usuario</Label>
              <Select value={grantTargetUserId} onValueChange={setGrantTargetUserId}>
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="Selecione o usuario..." />
                </SelectTrigger>
                <SelectContent>
                  {grantableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.username}
                      <span className="ml-1 text-muted-foreground text-xs capitalize">({u.role})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Plugin selection */}
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground text-sm font-medium">Plugin</Label>
              <Select value={grantPluginId} onValueChange={(v) => { setGrantPluginId(v); setGrantPermTypeId("") }}>
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="Selecione o plugin..." />
                </SelectTrigger>
                <SelectContent>
                  {managedPluginsList.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Permission type */}
            {grantPluginPermTypes && grantPluginPermTypes.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground text-sm font-medium">Tipo de Permissao</Label>
                <Select value={grantPermTypeId} onValueChange={setGrantPermTypeId}>
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {grantPluginPermTypes.map((pt) => (
                      <SelectItem key={pt.id} value={pt.id}>
                        {pt.name} - {pt.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Units */}
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground text-sm font-medium">Unidades</Label>
              <div className="rounded-lg border border-input bg-background p-3 grid grid-cols-2 gap-2">
                {AVAILABLE_UNITS.map((unit) => (
                  <label key={unit} className="flex items-center gap-2 cursor-pointer text-sm text-card-foreground">
                    <Checkbox
                      checked={grantUnits.includes(unit)}
                      onCheckedChange={() => toggleGrantUnit(unit)}
                      disabled={unit !== "Geral" && grantIsGeneral}
                    />
                    <span className={unit === "Geral" ? "font-semibold" : ""}>{unit}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Factories */}
            <div className="flex flex-col gap-2">
              <Label className={`text-sm font-medium ${grantIsGeneral ? "text-muted-foreground" : "text-card-foreground"}`}>
                Fabricas
                {grantIsGeneral && <span className="ml-2 text-xs font-normal">(desabilitado para acesso geral)</span>}
              </Label>
              <div className={`rounded-lg border border-input bg-background p-3 grid grid-cols-2 gap-2 ${grantIsGeneral ? "opacity-50" : ""}`}>
                {AVAILABLE_FACTORIES.map((factory) => (
                  <label key={factory} className="flex items-center gap-2 cursor-pointer text-sm text-card-foreground">
                    <Checkbox
                      checked={grantFactories.includes(factory)}
                      onCheckedChange={() => toggleGrantFactory(factory)}
                      disabled={grantIsGeneral}
                    />
                    {factory}
                  </label>
                ))}
              </div>
            </div>

            {grantAccessMutation.isError && (
              <p className="text-sm text-destructive">{(grantAccessMutation.error as Error).message}</p>
            )}

            <Button
              onClick={() => grantAccessMutation.mutate()}
              disabled={grantAccessMutation.isPending || !grantTargetUserId || !grantPluginId || grantUnits.length === 0}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {grantAccessMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <UserPlus className="mr-2 h-4 w-4" />
              Conceder Acesso
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
