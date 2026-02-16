"use client";

import {Dashboard} from "@/components/dashboard";
import {LoginForm} from "@/components/login-form";
import {useAuth} from "@/lib/auth-context";
import {Loader2} from "lucide-react";

export default function Home() {
  const {isAuthenticated, loading} = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return <Dashboard />;
}
