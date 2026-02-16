"use client";

import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Checkbox} from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {Label} from "@/components/ui/label";
import {apiFetch} from "@/lib/api-client";
import type {AccessRequest, Plugin, PluginRole, ScopeType, Unit} from "@/lib/types";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import * as LucideIcons from "lucide-react";
import {Clock, Crown, ExternalLink, Loader2, Star} from "lucide-react";
import {useState} from "react";


interface PluginCardProps {
  plugin: Plugin;
  access?: AccessRequest;
  userId: string;
  onOpenPlugin: (pluginId: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function PluginCard({plugin, access, userId, onOpenPlugin, isFavorite, onToggleFavorite}: PluginCardProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scopeType, setScopeType] = useState<ScopeType>("GLOBAL");
  const [selectedScopeIds, setSelectedScopeIds] = useState<string[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [justification, setJustification] = useState("");

  const {data: roles} = useQuery<PluginRole[]>({
    queryKey: ["plugin-roles", plugin.id],
    queryFn: () => apiFetch(`/admin/plugins/${plugin.id}/roles`),
    enabled: dialogOpen,
  });

  const {data: structure} = useQuery<Unit[]>({
    queryKey: ["structure"],
    queryFn: () => apiFetch("/plugins/structure"),
    enabled: dialogOpen,
  });

  const isApproved = access?.status === "APPROVED";
  const isPending = access?.status === "PENDING";

  const requestMutation = useMutation({
    mutationFn: () => apiFetch("/requests", {
      method: "POST",
      body: JSON.stringify({
        pluginId: plugin.id,
        roleId: selectedRoleId,
        scopeType,
        scopeIds: scopeType === "GLOBAL" ? [] : selectedScopeIds,
        userJustification: justification,
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["accesses", userId]});
      setDialogOpen(false);
      // Reset state
      setSelectedScopeIds([]);
      setJustification("");
      // If it was a public plugin, open it immediately
      if (plugin.isPublic) {
        onOpenPlugin(plugin.id);
      }
    },
  });

  function getScopeLabel() {
    if (!access) return "";
    if (access.scopeType === "GLOBAL") return "Global";
    return `${access.scopeType}: ${access.scopeId}`;
  }

  const IconComponent = (plugin.icon && (LucideIcons as any)[plugin.icon]) || Crown;

  const currentOptions = scopeType === "UNIT"
    ? structure?.map(u => ({id: u.name, name: u.name})) || []
    : scopeType === "FACTORY"
      ? structure?.flatMap(u => u.factories?.map(f => ({id: f.name, name: f.name})) || []) || []
      : [];

  return (
    <Card className="group relative flex flex-col border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <CardHeader className="pb-3 px-5 pt-5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
            <IconComponent className="h-6 w-6 text-primary" />
          </div>

          <div className="flex items-center gap-2">
            {isPending && (
              <Badge variant="secondary" className="bg-amber-500/15 text-amber-500 border-amber-500/20 px-2 py-0.5">
                <Clock className="mr-1 h-3 w-3" />
                Pendente
              </Badge>
            )}

            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-full ${isFavorite ? 'text-[#FF69B4] hover:text-[#FF1493] bg-[#FF69B4]/10' : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted'}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite?.();
              }}
            >
              <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <CardTitle className="text-base font-semibold text-card-foreground leading-none min-h-[1.25rem]">
            {plugin.name}
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed line-clamp-2 h-8 text-muted-foreground/80">
            {plugin.description}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="mt-auto px-5 pb-5 pt-0">
        {isApproved ? (
          <Button
            className="w-full bg-emerald-600 text-emerald-50 hover:bg-emerald-700 shadow-sm shadow-emerald-900/10"
            size="sm"
            onClick={() => onOpenPlugin(plugin.id)}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Acessar Plugin
          </Button>
        ) : isPending ? (
          <Button variant="secondary" size="sm" className="w-full cursor-not-allowed opacity-60" disabled>
            <Clock className="mr-2 h-4 w-4" />
            Aguardando Aprovação
          </Button>
        ) : plugin.isPublic ? (
          <Button
            size="sm"
            className="w-full bg-primary hover:bg-primary/90 text-white shadow-sm shadow-primary/10"
            onClick={() => requestMutation.mutate()}
            disabled={requestMutation.isPending}
          >
            {requestMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            Ativar Acesso Express
          </Button>
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border-primary/20 transition-all">
                Solicitar Acesso
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-card-foreground">
                  Solicitar Acesso - {plugin.name}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs">
                  Siga os passos abaixo para configurar sua solicitação.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-5 pt-4">
                {/* 1. SELEÇÃO DE ROLE (PRIORIDADE) */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="role-select" className="text-card-foreground text-xs font-bold uppercase tracking-wider">1. Selecione seu Papel (Role)</Label>
                  <select
                    id="role-select"
                    className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                  >
                    <option value="">Selecione um papel...</option>
                    {roles?.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {/* 2. SELEÇÃO DE ABRANGÊNCIA */}
                <div className="flex flex-col gap-3">
                  <Label className="text-card-foreground text-xs font-bold uppercase tracking-wider">2. Nível de Abrangência</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["GLOBAL", "UNIT", "FACTORY"] as ScopeType[]).map((type) => (
                      <Button
                        key={type}
                        variant={scopeType === type ? "default" : "outline"}
                        size="sm"
                        className="text-[10px] font-extrabold tracking-tight px-0 h-9 transition-all"
                        onClick={() => {
                          setScopeType(type);
                          setSelectedScopeIds([]);
                        }}
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 2.1 MULTI-SELEÇÃO DE ESCOPO */}
                {scopeType !== "GLOBAL" && (
                  <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label className="text-card-foreground text-xs font-bold uppercase tracking-wider flex justify-between">
                      {scopeType === "UNIT" ? "3. Selecione as Unidades" : "3. Selecione as Fábricas"}
                      <span className="text-[10px] normal-case font-normal text-muted-foreground">{selectedScopeIds.length} selecionados</span>
                    </Label>
                    <div className="rounded-lg border border-input bg-background/30 p-2 grid grid-cols-1 gap-1 max-h-[140px] overflow-y-auto">
                      {currentOptions.length === 0 ? (
                        <p className="text-[10px] text-center py-4 text-muted-foreground italic">Nenhum item encontrado</p>
                      ) : (
                        currentOptions.map((opt) => (
                          <label key={opt.id} className="flex items-center gap-2 cursor-pointer text-xs text-card-foreground hover:bg-primary/5 p-2 rounded-md transition-colors">
                            <Checkbox
                              checked={selectedScopeIds.includes(opt.id)}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedScopeIds([...selectedScopeIds, opt.id]);
                                else setSelectedScopeIds(selectedScopeIds.filter(id => id !== opt.id));
                              }}
                            />
                            {opt.name}
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* 4. JUSTIFICATIVA */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="justification" className="text-card-foreground text-xs font-bold uppercase tracking-wider">
                    {scopeType === "GLOBAL" ? "3. Justificativa" : "4. Justificativa"}
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">(Opcional)</span>
                  </Label>
                  <Textarea
                    id="justification"
                    placeholder="Por que você precisa deste acesso?"
                    className="min-h-[80px] text-xs bg-background/50 resize-none focus-visible:ring-primary/20"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                  />
                </div>

                <Button
                  onClick={() => requestMutation.mutate()}
                  disabled={requestMutation.isPending || !selectedRoleId || (scopeType !== "GLOBAL" && selectedScopeIds.length === 0)}
                  className="w-full bg-primary hover:bg-primary/90 text-white mt-2 font-bold py-6 shadow-lg shadow-primary/20"
                >
                  {requestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar Solicitação
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
