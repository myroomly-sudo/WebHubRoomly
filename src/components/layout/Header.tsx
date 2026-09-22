"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, X, Users, AlertTriangle, CheckCheck, Clock, UserCircle, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getInitials } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/pisos": "Gestión de Pisos",
  "/habitaciones": "Gestión de Habitaciones",
  "/incidencias": "Incidencias",
  "/usuarios": "Usuarios",
  "/pagos": "Pagos",
};

interface HubNotification {
  id: string;
  type: "new_user" | "new_incident" | string;
  message: string;
  read: boolean;
  propertyId?: string;
  propertyName?: string;
  targetId?: string;
  createdAt: Timestamp | Date | string;
  agencyId: string;
}

function timeAgo(date: HubNotification["createdAt"]): string {
  let d: Date;
  if (!date) return "";
  if (typeof date === "string") d = new Date(date);
  else if (date instanceof Date) d = date;
  else d = (date as Timestamp).toDate();

  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

function useDateTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const date = now.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = now.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return { date, time };
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { date, time } = useDateTime();

  const [notifications, setNotifications] = useState<HubNotification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const title = Object.entries(ROUTE_TITLES).find(([key]) =>
    pathname === key || (key !== "/dashboard" && pathname.startsWith(key))
  )?.[1] ?? "Roomly Hub";

  const email = user?.email ?? "";
  const initials = getInitials(email.split("@")[0]);
  const agencyId = user?.uid;

  useEffect(() => {
    if (!agencyId || !user) return;

    let unsub: (() => void) | undefined;

    const timer = setTimeout(() => {
      try {
        const q = query(
          collection(db, "hubNotifications"),
          where("agencyId", "==", agencyId),
          orderBy("createdAt", "desc")
        );
        unsub = onSnapshot(
          q,
          (snap) => {
            setNotifications(
              snap.docs.map((d) => ({ id: d.id, ...d.data() } as HubNotification))
            );
          },
          (error) => {
            console.log("Notifications listener error:", error.code);
          }
        );
      } catch (e) {
        console.log("Notifications setup error:", e);
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
      unsub?.();
    };
  }, [agencyId, user]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (notif: HubNotification) => {
    await updateDoc(doc(db, "hubNotifications", notif.id), { read: true });
    if (notif.type === "new_user") router.push("/usuarios");
    else if (notif.type === "new_incident") router.push("/incidencias");
    setOpen(false);
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(
      unread.map((n) => updateDoc(doc(db, "hubNotifications", n.id), { read: true }))
    );
  };

  const getIcon = (type: string) => {
    if (type === "new_user") return <Users className="w-4 h-4 text-sky-500" />;
    if (type === "new_incident") return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    return <Bell className="w-4 h-4 text-gray-400" />;
  };

  const getIconBg = (type: string) => {
    if (type === "new_user") return "bg-sky-50";
    if (type === "new_incident") return "bg-orange-50";
    return "bg-gray-100";
  };

  return (
    <header className="h-14 border-b border-gray-200 bg-white px-6 flex items-center justify-between flex-shrink-0">
      <h1 className="text-base font-semibold text-roomly-charcoal">{title}</h1>

      <div className="flex items-center gap-3">

        {/* Fecha y hora en tiempo real */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl">
          <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500 capitalize">{date}</span>
          <span className="text-xs font-semibold text-roomly-navy tabular-nums">{time}</span>
        </div>

        {/* Notifications */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setOpen(!open)}
            className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">Notificaciones</span>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-semibold">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-roomly-navy font-medium hover:underline flex items-center gap-1 mr-2"
                    >
                      <CheckCheck className="w-3 h-3" />
                      Marcar todas
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                    <p className="text-sm text-gray-400">Sin notificaciones</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => markAsRead(notif)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        !notif.read ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${getIconBg(notif.type)}`}>
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${!notif.read ? "font-semibold text-gray-800" : "text-gray-600"}`}>
                          {notif.message}
                        </p>
                        {notif.propertyName && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{notif.propertyName}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(notif.createdAt)}</p>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar + Profile dropdown */}
        <div className="relative" ref={avatarRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-8 h-8 rounded-full bg-roomly-navy text-white flex items-center justify-center text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
          >
            {initials}
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-11 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              {/* User info */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-roomly-navy text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{email}</p>
                    <p className="text-xs text-gray-400">Administrador</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="py-1.5">
                <button
                  onClick={() => { router.push("/perfil"); setProfileOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <UserCircle className="w-4 h-4 text-gray-400" />
                  Mi perfil
                </button>
              </div>

              <div className="border-t border-gray-100 py-1.5">
                <button
                  onClick={() => { signOut(); setProfileOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

