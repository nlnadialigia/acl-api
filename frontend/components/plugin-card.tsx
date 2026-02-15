"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ExternalLink, Clock, Check, Loader2 } from "lucide-react"
import { getPluginIcon } from "@/lib/plugin-icons"
import { AVAILABLE_UNITS, AVAILABLE_FACTORIES } from "@/lib/store"
import type { Plugin, AccessRequest, PermissionType } from "@/lib/types"

interface PluginCardProps {
  plugin: Plugin
  access?: AccessRequest
  userId: string
  onOpenPlugin: (pluginId: string) => void
}

export function PluginCard({ plugin, access, userId, onOpenPlugin }: PluginCardProps) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUnits, setSelectedUnits] = useState<string[]>([])
  const [selectedFactories, setSelectedFactories] = useState<string[]>([])
  const [permissionTypeId, setPermissionTypeId] = useState<string>("")

  const Icon = getPluginIcon(plugin.icon)

  const isGeneral = selectedUnits.includes("Geral")
  const canSubmit = selectedUnits.length > 0

  const { data: permissionTypes } = useQuery<PermissionType[]>({
    queryKey: ["permission-types", plugin.id],
    queryFn: async () => {
      const res = await fetch(`/api/plugins/permission-types?pluginId=${plugin.id}`)
      return res.json()
    },
    enabled: dialogOpen,
  })

  const requestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          pluginId: plugin.id,
          units: selectedUnits,
          factories: isGeneral ? [] : selectedFactories,
          permissionTypeId: permissionTypeId || undefined,
        }),
      })
      if (!res.ok) throw new Error("Falha ao solicitar acesso")
      return res.json()
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["accesses", userId] })
      setDialogOpen(false)
      resetForm()
      if (data.autoApproved) {
        onOpenPlugin(plugin.id)
      }
    },
  })

  function resetForm() {
    setSelectedUnits([])
    setSelectedFactories([])
    setPermissionTypeId("")
  }

  function toggleUnit(unit: string) {
    if (unit === "Geral") {
      if (isGeneral) {
        setSelectedUnits([])
      } else {
        setSelectedUnits(["Geral"])
        setSelectedFactories([])
      }
      return
    }
    // If selecting a specific unit, remove "Geral"
    setSelectedUnits((prev) => {
      const filtered = prev.filter((u) => u !== "Geral")
      return filtered.includes(unit)
        ? filtered.filter((u) => u !== unit)
        : [...filtered, unit]
    })
  }

  function toggleFactory(factory: string) {
    setSelectedFactories((prev) =>
      prev.includes(factory) ? prev.filter((f) => f !== factory) : [...prev, factory]
    )
  }

  const status = access?.status
  const isApproved = status === "approved"
  const isPending = status === "pending"

  function getScopeLabel() {
    if (!access) return ""
    const units = access.grantedUnits || access.units
    if (units.includes("Geral")) return "Geral"
    return units.join(", ")
  }

  return (
    <Card className="group relative flex flex-col border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
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
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Solicitar Acesso
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-card-foreground">
                  Solicitar Acesso - {plugin.name}
                </DialogTitle>
                <DialogDescription>
                  Selecione as unidades, fabricas e o tipo de permissao desejado
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-5 pt-2">
                {/* Permission type */}
                {permissionTypes && permissionTypes.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <Label className="text-card-foreground text-sm font-medium">Tipo de Permissao</Label>
                    <Select value={permissionTypeId} onValueChange={setPermissionTypeId}>
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Selecione o tipo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {permissionTypes.map((pt) => (
                          <SelectItem key={pt.id} value={pt.id}>
                            <span className="font-medium">{pt.name}</span>
                            {pt.description && (
                              <span className="ml-1 text-muted-foreground text-xs">- {pt.description}</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Units multi-select */}
                <div className="flex flex-col gap-2">
                  <Label className="text-card-foreground text-sm font-medium">Unidades</Label>
                  <div className="rounded-lg border border-input bg-background p-3 grid grid-cols-2 gap-2">
                    {AVAILABLE_UNITS.map((unit) => (
                      <label
                        key={unit}
                        className="flex items-center gap-2 cursor-pointer text-sm text-card-foreground"
                      >
                        <Checkbox
                          checked={selectedUnits.includes(unit)}
                          onCheckedChange={() => toggleUnit(unit)}
                          disabled={unit !== "Geral" && isGeneral}
                        />
                        <span className={unit === "Geral" ? "font-semibold" : ""}>{unit}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Factories multi-select */}
                <div className="flex flex-col gap-2">
                  <Label className={`text-sm font-medium ${isGeneral ? "text-muted-foreground" : "text-card-foreground"}`}>
                    Fabricas
                    {isGeneral && <span className="ml-2 text-xs font-normal">(desabilitado para acesso geral)</span>}
                  </Label>
                  <div className={`rounded-lg border border-input bg-background p-3 grid grid-cols-2 gap-2 ${isGeneral ? "opacity-50" : ""}`}>
                    {AVAILABLE_FACTORIES.map((factory) => (
                      <label
                        key={factory}
                        className="flex items-center gap-2 cursor-pointer text-sm text-card-foreground"
                      >
                        <Checkbox
                          checked={selectedFactories.includes(factory)}
                          onCheckedChange={() => toggleFactory(factory)}
                          disabled={isGeneral}
                        />
                        {factory}
                      </label>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => requestMutation.mutate()}
                  disabled={requestMutation.isPending || !canSubmit}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {requestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar Solicitacao
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}
