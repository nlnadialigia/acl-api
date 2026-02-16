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
import type {AccessRequest, Plugin, ScopeType} from "@/lib/types";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import * as LucideIcons from "lucide-react";
import {Check, Clock, Crown, ExternalLink, Loader2} from "lucide-react";
import {useState} from "react";

const AVAILABLE_UNITS = ["Unidade SP", "Unidade RJ", "Unidade MG"];
const AVAILABLE_FACTORIES = ["Fabrica Norte", "Fabrica Sul"];

interface PluginCardProps {
  plugin: Plugin;
  access?: AccessRequest;
  userId: string;
  onOpenPlugin: (pluginId: string) => void;
}

export function PluginCard({plugin, access, userId, onOpenPlugin}: PluginCardProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scopeType, setScopeType] = useState<ScopeType>("GLOBAL");
  const [scopeId, setScopeId] = useState<string>("");

  const isApproved = access?.status === "APPROVED";
  const isPending = access?.status === "PENDING";

  const requestMutation = useMutation({
    mutationFn: () => apiFetch("/requests", {
      method: "POST",
      body: JSON.stringify({
        pluginId: plugin.id,
        scopeType,
        scopeId: scopeType === "GLOBAL" ? undefined : scopeId,
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["accesses", userId]});
      setDialogOpen(false);
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

  return (
    <Card className="group relative flex flex-col border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
            <IconComponent className="h-5 w-5 text-primary" />
          </div>
          {isApproved && (
            <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30">
              <Check className="mr-1 h-3 w-3" />
              {getScopeLabel()}
            </Badge>
          )}
          {isPending && (
            <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30">
              <Clock className="mr-1 h-3 w-3" />
              Pendente
            </Badge>
          )}
        </div>
        <CardTitle className="mt-3 text-base text-card-foreground">{plugin.name}</CardTitle>
        <CardDescription className="text-sm leading-relaxed">{plugin.description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto pt-0">
        {isApproved ? (
          <Button
            className="w-full bg-emerald-600 text-emerald-50 hover:bg-emerald-700"
            size="sm"
            onClick={() => onOpenPlugin(plugin.id)}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Acessar
          </Button>
        ) : isPending ? (
          <Button variant="secondary" size="sm" className="w-full cursor-not-allowed" disabled>
            <Clock className="mr-2 h-4 w-4" />
            Solicitacao Pendente
          </Button>
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className={`w-full ${plugin.isPublic ? "bg-blue-600 hover:bg-blue-700" : "bg-primary hover:bg-primary/90"} text-white`}>
                {plugin.isPublic ? "Ativar Acesso" : "Solicitar Acesso"}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-card-foreground">
                  Solicitar Acesso - {plugin.name}
                </DialogTitle>
                <DialogDescription>
                  Selecione o nível de acesso desejado para este plugin.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-5 pt-2">
                <div className="flex flex-col gap-3">
                  <Label className="text-card-foreground text-sm font-medium">Tipo de Escopo</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["GLOBAL", "UNIT", "FACTORY"] as ScopeType[]).map((type) => (
                      <Button
                        key={type}
                        variant={scopeType === type ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setScopeType(type);
                          setScopeId("");
                        }}
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>

                {scopeType !== "GLOBAL" && (
                  <div className="flex flex-col gap-2">
                    <Label className="text-card-foreground text-sm font-medium">
                      {scopeType === "UNIT" ? "Selecione a Unidade" : "Selecione a Fábrica"}
                    </Label>
                    <div className="rounded-lg border border-input bg-background p-3 grid grid-cols-1 gap-2">
                      {(scopeType === "UNIT" ? AVAILABLE_UNITS : AVAILABLE_FACTORIES).map((id) => (
                        <label key={id} className="flex items-center gap-2 cursor-pointer text-sm text-card-foreground">
                          <Checkbox
                            checked={scopeId === id}
                            onCheckedChange={() => setScopeId(id)}
                          />
                          {id}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => requestMutation.mutate()}
                  disabled={requestMutation.isPending || (scopeType !== "GLOBAL" && !scopeId)}
                  className={`w-full ${plugin.isPublic ? "bg-blue-600 hover:bg-blue-700" : "bg-primary hover:bg-primary/90"} text-white`}
                >
                  {requestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {plugin.isPublic ? "Ativar Agora" : "Confirmar Solicitacao"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
