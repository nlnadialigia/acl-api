import { NextResponse } from "next/server"
import { store } from "@/lib/store"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "userId obrigatorio" }, { status: 400 })
  }

  const accesses = store.getUserAccesses(userId)
  return NextResponse.json(accesses)
}

export async function POST(request: Request) {
  const { userId, pluginId, units, factories, permissionTypeId } = await request.json()

  const existing = store.getUserAccessForPlugin(userId, pluginId)
  if (existing) {
    return NextResponse.json(
      { error: "Ja existe uma solicitacao para este plugin" },
      { status: 409 }
    )
  }

  const plugin = store.plugins.find((p) => p.id === pluginId)
  const user = store.findUserById(userId)

  const unitsList: string[] = units || ["Geral"]
  const factoriesList: string[] = factories || []
  const isGeneral = unitsList.includes("Geral")

  const accessRequest = {
    id: store.generateId("access"),
    userId,
    pluginId,
    permissionTypeId: permissionTypeId || undefined,
    units: unitsList,
    factories: isGeneral ? [] : factoriesList,
    status: plugin?.isPublic ? ("approved" as const) : ("pending" as const),
    grantedUnits: plugin?.isPublic ? unitsList : undefined,
    grantedFactories: plugin?.isPublic ? (isGeneral ? [] : factoriesList) : undefined,
    grantedPermissionTypeId: plugin?.isPublic ? (permissionTypeId || undefined) : undefined,
    createdAt: new Date().toISOString(),
    resolvedAt: plugin?.isPublic ? new Date().toISOString() : undefined,
    resolvedBy: plugin?.isPublic ? "system" : undefined,
  }

  store.accessRequests.push(accessRequest)

  const scopeLabel = isGeneral ? "Geral" : `Unidades: ${unitsList.join(", ")} | Fabricas: ${factoriesList.join(", ")}`
  const permType = permissionTypeId ? store.getPermissionTypeById(permissionTypeId) : null
  const permLabel = permType ? ` | Tipo: ${permType.name}` : ""

  if (plugin?.isPublic) {
    store.notifications.push({
      id: store.generateId("notif"),
      userId,
      type: "access_granted",
      message: `Seu acesso ao plugin "${plugin.name}" foi concedido automaticamente. Escopo: ${scopeLabel}${permLabel}`,
      relatedRequestId: accessRequest.id,
      read: false,
      createdAt: new Date().toISOString(),
    })
    return NextResponse.json({ ...accessRequest, autoApproved: true })
  }

  const managers = store.getPluginManagers(pluginId)
  const admins = store.getAdmins()
  const notifyUsers = [...managers, ...admins]

  for (const target of notifyUsers) {
    store.notifications.push({
      id: store.generateId("notif"),
      userId: target.id,
      type: "access_request",
      message: `${user?.username} solicitou acesso ao plugin "${plugin?.name}" - Escopo: ${scopeLabel}${permLabel}`,
      relatedRequestId: accessRequest.id,
      read: false,
      createdAt: new Date().toISOString(),
    })

    store.emailLogs.push({
      id: store.generateId("email"),
      to: `${target.username}@portal.com`,
      subject: `Nova solicitacao de acesso - ${plugin?.name}`,
      body: `O usuario ${user?.username} solicitou acesso ao plugin "${plugin?.name}" com escopo ${scopeLabel}${permLabel}. Acesse o portal para aprovar ou rejeitar.`,
      sentAt: new Date().toISOString(),
    })
  }

  return NextResponse.json(accessRequest)
}
