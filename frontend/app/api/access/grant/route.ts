import { NextResponse } from "next/server"
import { store } from "@/lib/store"

export async function POST(request: Request) {
  const { grantedBy, targetUserId, pluginId, units, factories, permissionTypeId } =
    await request.json()

  const granter = store.findUserById(grantedBy)
  if (!granter) {
    return NextResponse.json({ error: "Grantor nao encontrado" }, { status: 404 })
  }

  if (
    granter.role !== "admin" &&
    !(granter.role === "manager" && granter.managedPlugins.includes(pluginId))
  ) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 })
  }

  const targetUser = store.findUserById(targetUserId)
  if (!targetUser) {
    return NextResponse.json({ error: "Usuario alvo nao encontrado" }, { status: 404 })
  }

  const existing = store.getUserAccessForPlugin(targetUserId, pluginId)
  if (existing) {
    return NextResponse.json(
      { error: "Usuario ja possui solicitacao para este plugin" },
      { status: 409 }
    )
  }

  const plugin = store.plugins.find((p) => p.id === pluginId)
  const unitsList: string[] = units || ["Geral"]
  const factoriesList: string[] = factories || []
  const isGeneral = unitsList.includes("Geral")

  const accessRequest = {
    id: store.generateId("access"),
    userId: targetUserId,
    pluginId,
    permissionTypeId: permissionTypeId || undefined,
    units: unitsList,
    factories: isGeneral ? [] : factoriesList,
    status: "approved" as const,
    grantedUnits: unitsList,
    grantedFactories: isGeneral ? [] : factoriesList,
    grantedPermissionTypeId: permissionTypeId || undefined,
    createdAt: new Date().toISOString(),
    resolvedAt: new Date().toISOString(),
    resolvedBy: grantedBy,
  }

  store.accessRequests.push(accessRequest)

  const scopeLabel = isGeneral
    ? "Geral"
    : `Unidades: ${unitsList.join(", ")}${factoriesList.length ? ` | Fabricas: ${factoriesList.join(", ")}` : ""}`
  const permType = permissionTypeId ? store.getPermissionTypeById(permissionTypeId) : null
  const permLabel = permType ? ` (${permType.name})` : ""

  store.notifications.push({
    id: store.generateId("notif"),
    userId: targetUserId,
    type: "access_granted",
    message: `Voce recebeu acesso ao plugin "${plugin?.name}"${permLabel}. Escopo: ${scopeLabel}`,
    relatedRequestId: accessRequest.id,
    read: false,
    createdAt: new Date().toISOString(),
  })

  store.emailLogs.push({
    id: store.generateId("email"),
    to: `${targetUser.username}@portal.com`,
    subject: `Acesso concedido - ${plugin?.name}`,
    body: `O ${granter.role === "admin" ? "administrador" : "manager"} ${granter.username} concedeu acesso ao plugin "${plugin?.name}"${permLabel} com escopo ${scopeLabel}.`,
    sentAt: new Date().toISOString(),
  })

  return NextResponse.json(accessRequest)
}
