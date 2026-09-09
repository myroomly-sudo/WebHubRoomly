// src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  AlertTriangle,
  Users,
  CreditCard,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/pisos", icon: Building2, label: "Pisos" },
  { href: "/habitaciones", icon: DoorOpen, label: "Habitaciones" },
  { href: "/incidencias", icon: AlertTriangle, label: "Incidencias" },
  { href: "/usuarios", icon: Users, label: "Usuarios" },
  { href: "/pagos", icon: CreditCard, label: "Pagos" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();

  return (
    <aside className="w-56 lg:w-60 flex-shrink-0 bg-sidebar-bg flex flex-col h-full border-r border-sidebar-border">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="grid grid-cols-2 gap-1 p-1.5 bg-white/10 rounded-xl flex-shrink-0">
            <div className="w-3 h-3 rounded-[4px] bg-roomly-sky" />
            <div className="w-3 h-3 rounded-[4px] bg-roomly-mint" />
            <div className="w-3 h-3 rounded-[4px] bg-roomly-lavender" />
            <div className="w-3 h-3 rounded-[4px] bg-roomly-peach" />
          </div>
          <div>
            <span className="text-white font-bold text-base tracking-tight">Roomly</span>
            <span className="block text-[10px] text-slate-500 font-medium uppercase tracking-widest">Hub</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">
          Gestión
        </p>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn("sidebar-item group", active && "sidebar-item-active")}
            >
              <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-roomly-sky" : "text-slate-500 group-hover:text-slate-300")} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 text-roomly-sky/60" />}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
        </div>
        <button
          onClick={signOut}
          className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-900/20"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
