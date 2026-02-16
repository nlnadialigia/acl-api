"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import type { AccessRequest, Plugin, PluginRole, ScopeType, Unit } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as LucideIcons from "lucide-react";
import { Clock, Crown, ExternalLink, Loader2, Star } from "lucide-react";
import { useState } from "react";
import { Textarea } from "./ui/textarea";


interface PluginCardProps {
  plugin: Plugin;
  access?: AccessRequest;
  userId: string;
  onOpenPlugin: (pluginId: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function PluginCard({ plugin, access, userId, onOpenPlugin, isFavorite, onToggleFavorite }: PluginCardProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [selectedFactoryIds, setSelectedFactoryIds] = useState<string[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [justification, setJustification] = useState("");
  const [isGlobal, setIsGlobal] = useState(false);

  const { data: roles } = useQuery<PluginRole[]>({
    queryKey: ["plugin-roles", plugin.id],
    queryFn: () => apiFetch(`/admin/plugins/${plugin.id}/roles`),
    enabled: dialogOpen,
  });

  const { data: structure } = useQuery<Unit[]>({
    queryKey: ["structure"],
    queryFn: () => apiFetch("/plugins/structure"),
    enabled: dialogOpen,
  });

  const isApproved = access?.status === "APPROVED";
  const isPending = access?.status === "PENDING";

  const requestMutation = useMutation({
    mutationFn: () => {
      let scopeType: ScopeType;
      let scopeIds: string[];

      if (isGlobal) {
        scopeType = "GLOBAL";
        scopeIds = [];
      } else if (selectedFactoryIds.length > 0) {
        scopeType = "FACTORY";
        scopeIds = selectedFactoryIds;
      } else {
        scopeType = "UNIT";
        scopeIds = selectedUnitIds;
      }

      return apiFetch("/requests", {
        method: "POST",
        body: JSON.stringify({
          pluginId: plugin.id,
          roleId: selectedRoleId,
          scopeType,
          scopeIds,
          userJustification: justification,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accesses", userId] });
      setDialogOpen(false);
      setSelectedUnitIds([]);
      setSelectedFactoryIds([]);
      setJustification("");
      setIsGlobal(false);
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

  const availableFactories = structure?.filter(u => selectedUnitIds.includes(u.id))
    .flatMap(u => u.factories || []) || [];

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
            Acessar
          </Button>
        ) : isPending ? (
          <Button variant="secondary" size="sm" className="w-full cursor-not-allowed opacity-60" disabled>
            <Clock className="mr-2 h-4 w-4" />
            Aguardando Aprovação
          </Button>
        ) : plugin.isPublic ? (
          <Button
            size="sm"
            className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border-primary/20 transition-all"
            onClick={() => requestMutation.mutate()}
            disabled={requestMutation.isPending}
          >
            {requestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Solicitar Acesso
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
                {/* 1. SELEÇÃO DE ROLE */}
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

                {/* 2. SELEÇÃO DE UNIDADES */}
                <div className="flex flex-col gap-2">
                  <Label className="text-card-foreground text-xs font-bold uppercase tracking-wider flex justify-between">
                    2. Selecione as Unidades
                    <span className="text-[10px] normal-case font-normal text-muted-foreground">
                      {isGlobal ? "Todas" : `${selectedUnitIds.length} selecionadas`}
                    </span>
                  </Label>
                  <div className="rounded-lg border border-input bg-background/30 p-2 grid grid-cols-1 gap-1 max-h-[140px] overflow-y-auto">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-card-foreground hover:bg-primary/5 p-2 rounded-md transition-colors">
                      <Checkbox
                        checked={isGlobal}
                        onCheckedChange={(checked) => {
                          setIsGlobal(!!checked);
                          if (checked) {
                            setSelectedUnitIds([]);
                            setSelectedFactoryIds([]);
                          }
                        }}
                      />
                      Todas as unidades
                    </label>
                    {structure?.map((unit) => (
                      <label key={unit.id} className="flex items-center gap-2 cursor-pointer text-xs text-card-foreground hover:bg-primary/5 p-2 rounded-md transition-colors">
                        <Checkbox
                          checked={selectedUnitIds.includes(unit.id)}
                          disabled={isGlobal}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUnitIds([...selectedUnitIds, unit.id]);
                            } else {
                              setSelectedUnitIds(selectedUnitIds.filter(id => id !== unit.id));
                              setSelectedFactoryIds(selectedFactoryIds.filter(fId => 
                                !unit.factories?.some(f => f.id === fId)
                              ));
                            }
                          }}
                        />
                        {unit.name}
                      </label>
                    ))}
                  </div>
                </div>

                {/* 3. SELEÇÃO DE FÁBRICAS (se houver unidades selecionadas) */}
                {!isGlobal && selectedUnitIds.length > 0 && availableFactories.length > 0 && (
                  <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label className="text-card-foreground text-xs font-bold uppercase tracking-wider flex justify-between">
                      3. Selecione as Fábricas (Opcional)
                      <span className="text-[10px] normal-case font-normal text-muted-foreground">
                        {selectedFactoryIds.length} selecionadas
                      </span>
                    </Label>
                    <div className="rounded-lg border border-input bg-background/30 p-2 grid grid-cols-1 gap-1 max-h-[140px] overflow-y-auto">
                      {availableFactories.map((factory) => (
                        <label key={factory.id} className="flex items-center gap-2 cursor-pointer text-xs text-card-foreground hover:bg-primary/5 p-2 rounded-md transition-colors">
                          <Checkbox
                            checked={selectedFactoryIds.includes(factory.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedFactoryIds([...selectedFactoryIds, factory.id]);
                              } else {
                                setSelectedFactoryIds(selectedFactoryIds.filter(id => id !== factory.id));
                              }
                            }}
                          />
                          {factory.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. JUSTIFICATIVA */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="justification" className="text-card-foreground text-xs font-bold uppercase tracking-wider">
                    {!isGlobal && selectedUnitIds.length > 0 && availableFactories.length > 0 ? "4" : "3"}. Justificativa
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">(Opcional)</span>
                  </Label>
                  <Textarea
                    id="justification"
                    placeholder="Por que você precisa deste acesso?"
                    className="min-h-20 text-xs bg-background/50 resize-none focus-visible:ring-primary/20"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                  />
                </div>

                <Button
                  onClick={() => requestMutation.mutate()}
                  disabled={requestMutation.isPending || !selectedRoleId || (!isGlobal && selectedUnitIds.length === 0)}
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
