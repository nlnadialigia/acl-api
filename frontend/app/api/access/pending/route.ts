import { NextResponse } from "next/server"
import { store } from "@/lib/store"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")
  const role = searchParams.get("role")
  const managedPlugins = searchParams.get("managedPlugins")

  if (!userId || !role) {
    return NextResponse.json(
      { error: "userId e role obrigatorios" },
      { status: 400 }
    )
  }

  let requests

  if (role === "admin") {
    requests = store.getAllPendingRequests()
  } else if (role === "manager" && managedPlugins) {
    const pluginIds = managedPlugins.split(",")
    requests = store.getPendingRequestsForManager(pluginIds)
  } else {
    return NextResponse.json([])
  }

  const enriched = requests.map((r) => {
    const user = store.findUserById(r.userId)
    const plugin = store.plugins.find((p) => p.id === r.pluginId)
    const permType = r.permissionTypeId ? store.getPermissionTypeById(r.permissionTypeId) : null
    return {
      ...r,
      username: user?.username || "Desconhecido",
      pluginName: plugin?.name || "Desconhecido",
      permissionTypeName: permType?.name || null,
      units: r.units || [],
      factories: r.factories || [],
    }
  })

  return NextResponse.json(enriched)
}
