import { NextResponse } from "next/server"
import { store } from "@/lib/store"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "userId obrigatorio" }, { status: 400 })
  }

  const notifications = store.getUserNotifications(userId)
  const unreadCount = store.getUnreadNotificationCount(userId)

  return NextResponse.json({ notifications, unreadCount })
}

export async function PATCH(request: Request) {
  const { notificationId, userId, markAll } = await request.json()

  if (markAll && userId) {
    store.notifications
      .filter((n) => n.userId === userId)
      .forEach((n) => {
        n.read = true
      })
    return NextResponse.json({ success: true })
  }

  const notification = store.notifications.find((n) => n.id === notificationId)
  if (!notification) {
    return NextResponse.json(
      { error: "Notificacao nao encontrada" },
      { status: 404 }
    )
  }

  notification.read = true
  return NextResponse.json(notification)
}
