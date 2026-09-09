// src/app/(app)/layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="grid grid-cols-2 gap-1.5 animate-pulse">
            <div className="w-5 h-5 rounded-lg bg-roomly-sky" />
            <div className="w-5 h-5 rounded-lg bg-roomly-mint" />
            <div className="w-5 h-5 rounded-lg bg-roomly-lavender" />
            <div className="w-5 h-5 rounded-lg bg-roomly-peach" />
          </div>
          <span className="text-sm text-gray-400 font-medium">Cargando…</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
