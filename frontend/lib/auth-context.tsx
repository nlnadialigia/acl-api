"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {AuthSession} from "./types";

interface AuthContextType {
  session: AuthSession | null;
  login: (session: AuthSession) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({children}: {children: ReactNode;}) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedSession = localStorage.getItem("acl-session");
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch (e) {
        localStorage.removeItem("acl-session");
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((newSession: AuthSession) => {
    setSession(newSession);
    localStorage.setItem("acl-session", JSON.stringify(newSession));
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    localStorage.removeItem("acl-session");
  }, []);

  return (
    <AuthContext.Provider
      value={{session, login, logout, isAuthenticated: !!session, loading}}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
