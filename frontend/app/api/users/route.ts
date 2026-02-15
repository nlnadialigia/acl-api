import { NextResponse } from "next/server"
import { store } from "@/lib/store"

export async function GET() {
  const users = store.users.map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    managedPlugins: u.managedPlugins,
    createdAt: u.createdAt,
  }))
  return NextResponse.json(users)
}

export async function PATCH(request: Request) {
  const { userId, role, managedPlugins } = await request.json()

  const user = store.findUserById(userId)
  if (!user) {
    return NextResponse.json(
      { error: "Usuario nao encontrado" },
      { status: 404 }
    )
  }

  if (role) user.role = role
  if (managedPlugins !== undefined) user.managedPlugins = managedPlugins

  return NextResponse.json({
    id: user.id,
    username: user.username,
    role: user.role,
    managedPlugins: user.managedPlugins,
  })
}
