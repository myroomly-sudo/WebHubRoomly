"use client";

import { useEffect, useState } from "react";
import { Users, Search, Building2, ChevronDown, Mail, Calendar } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDate, getInitials } from "@/lib/utils";

interface FirestoreUser {
  id: string;
  email: string;
  username: string;
  propertyId: string;
  createdAt: string | Date | { toDate: () => Date };
  avatarUrl?: string;
}

interface PropertyBasic {
  id: string;
  name: string;
  address?: string;
  propertyCode: string;
  maxUsers: number;
}

export default function UsuariosPage() {
  const { agencyId } = useAuth();
  const [properties, setProperties] = useState<PropertyBasic[]>([]);
  const [usersByProperty, setUsersByProperty] = useState<Record<string, FirestoreUser[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [expandedProps, setExpandedProps] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!agencyId) return;

    // 1. Fetch properties for this agency
    const propsSnap = await getDocs(
      query(collection(db, "properties"), where("agencyId", "==", agencyId))
    );
    const props: PropertyBasic[] = propsSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<PropertyBasic, "id">),
    }));
    setProperties(props);

    // 2. Fetch users for each property from the "users" collection
    const map: Record<string, FirestoreUser[]> = {};
    await Promise.all(
      props.map(async (p) => {
        try {
          const usersSnap = await getDocs(
            query(
              collection(db, "users"),
              where("propertyId", "==", p.id)
            )
          );
          map[p.id] = usersSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<FirestoreUser, "id">),
          }));
        } catch {
          map[p.id] = [];
        }
      })
    );

    setUsersByProperty(map);
    setExpandedProps(new Set(props.map((p) => p.id)));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const toggleExpand = (id: string) => {
    setExpandedProps((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const formatUserDate = (date: FirestoreUser["createdAt"]): string => {
    if (!date) return "—";
    if (typeof date === "string") return formatDate(new Date(date));
    if (typeof date === "object" && "toDate" in date) return formatDate(date.toDate());
    return formatDate(date as Date);
  };

  const totalUsers = Object.values(usersByProperty).flat().length;

  const filteredProperties = properties.filter(
    (p) => propertyFilter === "all" || p.id === propertyFilter
  );

  const filterUsers = (users: FirestoreUser[]) =>
    users.filter(
      (u) =>
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-roomly-charcoal">Usuarios</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {totalUsers} inquilinos registrados en {properties.length} pisos
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email…"
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm pl-9
                       focus:outline-none focus:ring-2 focus:ring-roomly-navy/20 focus:border-roomly-navy
                       transition-all bg-white w-64"
          />
        </div>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm pl-9 pr-8
                       focus:outline-none focus:ring-2 focus:ring-roomly-navy/20 focus:border-roomly-navy
                       transition-all bg-white appearance-none cursor-pointer w-52"
          >
            <option value="all">Todos los pisos</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl h-32 animate-pulse" />
          ))}
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-700 mb-1">Sin pisos</h3>
          <p className="text-sm text-gray-400">Crea un piso para empezar a ver inquilinos.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProperties.map((prop) => {
            const users = filterUsers(usersByProperty[prop.id] ?? []);
            const isExpanded = expandedProps.has(prop.id);
            const maxUsers = prop.maxUsers ?? 10;

            return (
              <div
                key={prop.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Property header */}
                <button
                  onClick={() => toggleExpand(prop.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-9 h-9 bg-sky-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-sky-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{prop.name}</p>
                    <p className="text-xs text-gray-400">
                      {prop.address ?? "Sin dirección"} · {users.length}/{maxUsers} inquilinos
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 hidden sm:block">
                      Código:{" "}
                      <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                        {prop.propertyCode}
                      </code>
                    </span>
                    {/* Occupancy bar */}
                    <div className="hidden md:flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-roomly-sky rounded-full"
                          style={{ width: `${Math.min((users.length / maxUsers) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">
                        {Math.round((users.length / maxUsers) * 100)}%
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                {/* Users table */}
                {isExpanded && (
                  <>
                    {users.length === 0 ? (
                      <div className="px-5 py-8 border-t border-gray-50 text-center">
                        <Users className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                        <p className="text-sm text-gray-400">
                          Sin inquilinos{search ? " que coincidan con la búsqueda" : " registrados aún"}.
                        </p>
                      </div>
                    ) : (
                      <table className="w-full text-sm border-t border-gray-100">
                        <thead>
                          <tr className="bg-gray-50/50">
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Inquilino
                            </th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                              Email
                            </th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                              Se unió
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {users.map((user) => {
                            const initials = getInitials(user.username ?? user.email ?? "?");
                            return (
                              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-roomly-lavender/30 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                      {initials}
                                    </div>
                                    <span className="font-medium text-gray-800">
                                      {user.username ?? "Sin nombre"}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 hidden md:table-cell">
                                  <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                                    <Mail className="w-3.5 h-3.5 text-gray-300" />
                                    {user.email}
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 hidden lg:table-cell">
                                  <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                                    <Calendar className="w-3.5 h-3.5 text-gray-300" />
                                    {formatUserDate(user.createdAt)}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
