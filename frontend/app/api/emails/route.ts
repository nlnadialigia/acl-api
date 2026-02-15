import { NextResponse } from "next/server"
import { store } from "@/lib/store"

export async function GET() {
  const emails = store.emailLogs.sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  )
  return NextResponse.json(emails)
}
