"use client"

import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { NotificationBell } from "@/components/notification-bell"
import { Shield, LogOut, Settings, Mail } from "lucide-react"

interface DashboardHeaderProps {
  onShowAdmin: () => void
  onShowEmails: () => void
  showAdmin: boolean
  showEmails: boolean
}

export function DashboardHeader({
  onShowAdmin,
  onShowEmails,
  showAdmin,
  showEmails,
}: DashboardHeaderProps) {
  const { session, logout } = useAuth()

  if (!session) return null

  const isPrivileged = session.role === "admin" || session.role === "manager"

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">
              ACL Portal
            </h1>
            <p className="text-xs text-muted-foreground">
              Gerenciamento de Plugins
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPrivileged && (
            <>
              <Button
                variant={showAdmin ? "default" : "ghost"}
                size="sm"
                onClick={onShowAdmin}
                className={
                  showAdmin
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }
              >
                <Settings className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Painel</span>
              </Button>
              <Button
                variant={showEmails ? "default" : "ghost"}
                size="sm"
                onClick={onShowEmails}
                className={
                  showEmails
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }
              >
                <Mail className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Emails</span>
              </Button>
            </>
          )}

          <NotificationBell />

          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5">
            <span className="text-sm font-medium text-foreground">
              {session.username}
            </span>
            <Badge
              variant="secondary"
              className="text-xs capitalize bg-primary/15 text-primary border-primary/30"
            >
              {session.role}
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
