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

  // Queries
  const {data: pendingRequests, isLoading: requestsLoading} = useQuery<AccessRequest[]>({
    queryKey: ["pending-requests"],
    queryFn: () => apiFetch("/requests"),
    enabled: !!session,
    refetchInterval: 5000,
  });

  const {data: users} = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiFetch("/users"), // Assumindo endpoint de lista de usuários
    enabled: session?.role === "PORTAL_ADMIN",
  });

  const {data: plugins} = useQuery<Plugin[]>({
    queryKey: ["plugins"],
    queryFn: () => apiFetch("/plugins"),
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
    </div>
  );
}
