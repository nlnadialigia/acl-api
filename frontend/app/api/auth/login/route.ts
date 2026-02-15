import { NextResponse } from "next/server"
import { store } from "@/lib/store"

export async function POST(request: Request) {
  const { username, password } = await request.json()

  const user = store.findUserByUsername(username)
  if (!user || user.password !== password) {
    return NextResponse.json(
      { error: "Credenciais invalidas" },
      { status: 401 }
    )
  }

  return NextResponse.json({
    userId: user.id,
    username: user.username,
    role: user.role,
    managedPlugins: user.managedPlugins,
  })
}
