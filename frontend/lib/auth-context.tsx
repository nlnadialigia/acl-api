"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import type { AuthSession } from "./types"

interface AuthContextType {
  session: AuthSession | null
  login: (session: AuthSession) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)

  const login = useCallback((newSession: AuthSession) => {
    setSession(newSession)
  }, [])

  const logout = useCallback(() => {
    setSession(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ session, login, logout, isAuthenticated: !!session }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
