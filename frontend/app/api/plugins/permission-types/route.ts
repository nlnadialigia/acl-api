import { NextResponse } from "next/server"
import { store } from "@/lib/store"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const pluginId = searchParams.get("pluginId")

  if (pluginId) {
    return NextResponse.json(store.getPermissionTypesForPlugin(pluginId))
  }

  return NextResponse.json(store.permissionTypes)
}

export async function POST(request: Request) {
  const { pluginId, name, description } = await request.json()

  if (!pluginId || !name) {
    return NextResponse.json(
      { error: "pluginId e name obrigatorios" },
      { status: 400 }
    )
  }

  const permType = {
    id: store.generateId("perm"),
    pluginId,
    name,
    description: description || "",
  }

  store.permissionTypes.push(permType)
  return NextResponse.json(permType)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "id obrigatorio" }, { status: 400 })
  }

  const idx = store.permissionTypes.findIndex((pt) => pt.id === id)
  if (idx === -1) {
    return NextResponse.json(
      { error: "Tipo de permissao nao encontrado" },
      { status: 404 }
    )
  }

  store.permissionTypes.splice(idx, 1)
  return NextResponse.json({ success: true })
}
