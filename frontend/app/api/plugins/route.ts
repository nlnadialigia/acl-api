import { NextResponse } from "next/server"
import { store } from "@/lib/store"

export async function GET() {
  return NextResponse.json(store.plugins)
}

export async function PATCH(request: Request) {
  const { pluginId, isPublic } = await request.json()

  const plugin = store.plugins.find((p) => p.id === pluginId)
  if (!plugin) {
    return NextResponse.json(
      { error: "Plugin nao encontrado" },
      { status: 404 }
    )
  }

  if (typeof isPublic === "boolean") {
    plugin.isPublic = isPublic
  }

  return NextResponse.json(plugin)
}
