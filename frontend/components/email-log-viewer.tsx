"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Mail, Loader2 } from "lucide-react"
import type { EmailLog } from "@/lib/types"

export function EmailLogViewer() {
  const { data: emails, isLoading } = useQuery<EmailLog[]>({
    queryKey: ["emails"],
    queryFn: async () => {
      const res = await fetch("/api/emails")
      return res.json()
    },
    refetchInterval: 3000,
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground text-balance">
          Log de Emails
        </h2>
        <p className="mt-1 text-muted-foreground">
          Visualize todos os emails enviados pelo sistema (simulacao)
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <Mail className="h-5 w-5 text-primary" />
            Emails Enviados
          </CardTitle>
          <CardDescription>
            {emails?.length || 0} emails no log
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !emails?.length ? (
            <p className="py-8 text-center text-muted-foreground">
              Nenhum email enviado ainda
            </p>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="flex flex-col gap-3">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    className="rounded-lg border border-border bg-muted/30 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-primary/15 text-primary border-primary/30"
                      >
                        Para: {email.to}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(email.sentAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-card-foreground">
                      {email.subject}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {email.body}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
