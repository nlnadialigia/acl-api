"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogIn, UserPlus, Loader2, Shield } from "lucide-react"

export function LoginForm() {
  const { login } = useAuth()
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (isRegister && password !== confirmPassword) {
      setError("As senhas nao coincidem")
      setLoading(false)
      return
    }

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login"
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Erro desconhecido")
        setLoading(false)
        return
      }

      login({
        userId: data.userId,
        username: data.username,
        role: data.role,
        managedPlugins: data.managedPlugins,
      })
    } catch {
      setError("Erro de conexao com o servidor")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground text-balance">
              ACL Portal
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerenciamento de acessos e plugins
            </p>
          </div>
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-card-foreground">
              {isRegister ? "Criar Conta" : "Entrar"}
            </CardTitle>
            <CardDescription>
              {isRegister
                ? "Preencha os dados para criar sua conta"
                : "Use suas credenciais para acessar o portal"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username" className="text-card-foreground">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu username"
                  required
                  className="bg-background border-input"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-card-foreground">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  className="bg-background border-input"
                />
              </div>

              {isRegister && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirm-password" className="text-card-foreground">
                    Confirmar Senha
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme sua senha"
                    required
                    className="bg-background border-input"
                  />
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive font-medium">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isRegister ? (
                  <UserPlus className="mr-2 h-4 w-4" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                {isRegister ? "Criar Conta" : "Entrar"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister)
                    setError("")
                    setConfirmPassword("")
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  {isRegister
                    ? "Ja tem uma conta? Faca login"
                    : "Nao tem conta? Criar uma agora"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Contas de teste: admin/admin123 | manager/manager123
          </p>
        </div>
      </div>
    </div>
  )
}
