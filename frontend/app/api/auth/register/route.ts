import { NextResponse } from "next/server"
import { store } from "@/lib/store"

export async function POST(request: Request) {
  const { username, password } = await request.json()

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username e senha sao obrigatorios" },
      { status: 400 }
    )
  }

  if (store.findUserByUsername(username)) {
    return NextResponse.json(
      { error: "Username ja existe" },
      { status: 409 }
    )
  }

  const user = {
    id: store.generateId("user"),
    username,
    password,
    role: "user" as const,
    managedPlugins: [] as string[],
    createdAt: new Date().toISOString(),
  }

  store.users.push(user)

  return NextResponse.json({
    userId: user.id,
    username: user.username,
    role: user.role,
    managedPlugins: user.managedPlugins,
  })
}
