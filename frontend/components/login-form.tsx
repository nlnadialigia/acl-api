"use client";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {useAuth} from "@/lib/auth-context";
import {Loader2, LogIn, Shield, UserPlus} from "lucide-react";
import {useState} from "react";

export function LoginForm() {
  const {login} = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isRegister && password !== confirmPassword) {
      setError("As senhas nao coincidem");
      setLoading(false);
      return;
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      const endpoint = isRegister ? "/users/register" : "/auth/login";

      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(isRegister ? {email, name} : {email}),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Credenciais inválidas");
        return;
      }

      // If login, data is { access_token, user: { id, email, name, role } }
      login({
        userId: data.user?.id || "temp-id",
        email: data.user?.email || email,
        username: data.user?.name || name || email.split('@')[0],
        role: data.user?.role || "USER",
        token: data.access_token,
      });
    } catch (err) {
      setError("Erro de conexao com o servidor");
    } finally {
      setLoading(false);
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
              Gereciamento de acessos e plugins
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
                : "Digite seu e-mail para acessar o portal"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-card-foreground">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  required
                  className="bg-background border-input"
                />
              </div>

              {isRegister && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name" className="text-card-foreground">
                    Nome Completo
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    required
                    className="bg-background border-input"
                  />
                </div>
              )}

              {!isRegister && (
                <p className="text-xs text-muted-foreground italic">
                  * No MVP, a senha ainda não é validada. Use qualquer email cadastrado.
                </p>
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
                    setIsRegister(!isRegister);
                    setError("");
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

        {!isRegister && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Tente: admin@exemplo.com | manager@exemplo.com
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
