import { NextResponse } from "next/server"
import { store } from "@/lib/store"

export async function POST(request: Request) {
  const { requestId, action, resolvedBy, grantedUnits, grantedFactories, grantedPermissionTypeId } =
    await request.json()

  const accessRequest = store.accessRequests.find((r) => r.id === requestId)
  if (!accessRequest) {
    return NextResponse.json(
      { error: "Solicitacao nao encontrada" },
      { status: 404 }
    )
  }

  const resolver = store.findUserById(resolvedBy)
  if (!resolver) {
    return NextResponse.json(
      { error: "Resolvedor nao encontrado" },
      { status: 404 }
    )
  }

  if (
    resolver.role !== "admin" &&
    !(
      resolver.role === "manager" &&
      resolver.managedPlugins.includes(accessRequest.pluginId)
    )
  ) {
    return NextResponse.json(
      { error: "Sem permissao para resolver esta solicitacao" },
      { status: 403 }
    )
  }

  accessRequest.status = action === "approve" ? "approved" : "rejected"
  accessRequest.resolvedAt = new Date().toISOString()
  accessRequest.resolvedBy = resolvedBy

  if (action === "approve") {
    accessRequest.grantedUnits = grantedUnits || accessRequest.units
    accessRequest.grantedFactories = grantedFactories || accessRequest.factories
    accessRequest.grantedPermissionTypeId =
      grantedPermissionTypeId || accessRequest.permissionTypeId
  }

  const user = store.findUserById(accessRequest.userId)
  const plugin = store.plugins.find((p) => p.id === accessRequest.pluginId)

  const finalUnits = accessRequest.grantedUnits || accessRequest.units
  const finalFactories = accessRequest.grantedFactories || accessRequest.factories
  const isGeneral = finalUnits.includes("Geral")
  const scopeLabel = isGeneral
    ? "Geral"
    : `Unidades: ${finalUnits.join(", ")}${finalFactories.length ? ` | Fabricas: ${finalFactories.join(", ")}` : ""}`

  store.notifications.push({
    id: store.generateId("notif"),
    userId: accessRequest.userId,
    type: action === "approve" ? "access_granted" : "access_rejected",
    message:
      action === "approve"
        ? `Seu acesso ao plugin "${plugin?.name}" foi concedido! Escopo: ${scopeLabel}`
        : `Sua solicitacao de acesso ao plugin "${plugin?.name}" foi rejeitada.`,
    relatedRequestId: accessRequest.id,
    read: false,
    createdAt: new Date().toISOString(),
  })

  store.emailLogs.push({
    id: store.generateId("email"),
    to: `${user?.username}@portal.com`,
    subject:
      action === "approve"
        ? `Acesso concedido - ${plugin?.name}`
        : `Solicitacao rejeitada - ${plugin?.name}`,
    body:
      action === "approve"
        ? `Seu acesso ao plugin "${plugin?.name}" foi aprovado com escopo ${scopeLabel}. Voce ja pode acessar o plugin.`
        : `Sua solicitacao de acesso ao plugin "${plugin?.name}" foi rejeitada. Entre em contato com o administrador para mais informacoes.`,
    sentAt: new Date().toISOString(),
  })

  return NextResponse.json(accessRequest)
}
