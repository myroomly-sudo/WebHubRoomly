// src/components/layout/Header.tsx
"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getInitials } from "@/lib/utils";

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/pisos": "Gestión de Pisos",
  "/habitaciones": "Gestión de Habitaciones",
  "/incidencias": "Incidencias",
  "/usuarios": "Usuarios",
  "/pagos": "Pagos",
};

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuth();

  const title = Object.entries(ROUTE_TITLES).find(([key]) =>
    pathname === key || (key !== "/dashboard" && pathname.startsWith(key))
  )?.[1] ?? "Roomly Hub";

  const email = user?.email ?? "";
  const initials = getInitials(email.split("@")[0]);

  return (
    <header className="h-14 border-b border-gray-200 bg-white px-6 flex items-center justify-between flex-shrink-0">
      <h1 className="text-base font-semibold text-roomly-charcoal">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Search hint */}
        <button className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
          <Search className="w-3.5 h-3.5" />
          <span>Buscar…</span>
          <kbd className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded ml-1 font-mono">⌘K</kbd>
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-roomly-navy text-white flex items-center justify-center text-xs font-bold">
          {initials}
        </div>
      </div>
    </header>
  );
}
