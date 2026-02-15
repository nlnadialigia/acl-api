"use client"

import { useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft, LogOut } from "lucide-react"
import { getPluginIcon } from "@/lib/plugin-icons"
import type { Plugin } from "@/lib/types"

const motivationalQuotes = [
  "O sucesso e a soma de pequenos esforcos repetidos dia apos dia.",
  "A unica maneira de fazer um excelente trabalho e amar o que voce faz.",
  "Nao espere por oportunidades, crie-as.",
  "O futuro pertence aqueles que acreditam na beleza de seus sonhos.",
  "Cada dia e uma nova chance para mudar sua vida.",
  "Acredite que voce pode e ja tera percorrido metade do caminho.",
  "A persistencia e o caminho do exito.",
  "Grandes coisas nunca vem de zonas de conforto.",
]

interface PluginPageProps {
  plugin: Plugin
  onBack: () => void
}

export function PluginPage({ plugin, onBack }: PluginPageProps) {
  const { logout } = useAuth()
  const Icon = getPluginIcon(plugin.icon)

  const quote = useMemo(() => {
    const index = Math.abs(plugin.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) % motivationalQuotes.length
    return motivationalQuotes[index]
  }, [plugin.id])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Voltar para plugins"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-base font-semibold text-foreground">
              {plugin.name}
            </h1>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4">
        <div className="flex max-w-lg flex-col items-center gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <Icon className="h-10 w-10 text-primary" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-foreground text-balance">
              Bem-vindo ao {plugin.name}
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground text-pretty italic">
              {`"${quote}"`}
            </p>
          </div>
          <div className="h-1 w-16 rounded-full bg-primary/30" />
          <p className="text-sm text-muted-foreground">
            {plugin.description}
          </p>
        </div>
      </main>
    </div>
  )
}
