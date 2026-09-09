// src/app/(app)/usuarios/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Users, Search, Filter, MoreHorizontal, UserX, UserCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getAllTenants, getProperties, updateTenant } from "@/lib/firestore";
import type { Tenant, Property } from "@/types";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { formatDate, getInitials } from "@/lib/utils";

type StatusFilter = "all" | "active" | "inactive";

export default function UsuariosPage() {
  const { agencyId } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const load = async () => {
    if (!agencyId) return;
    const [t, p] = await Promise.all([getAllTenants(agencyId), getProperties(agencyId)]);
    setTenants(t);
    setProperties(p);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const propertyName = (id: string) => properties.find((p) => p.id === id)?.name ?? "—";

  const toggleActive = async (tenant: Tenant) => {
    await updateTenant(tenant.id, { isActive: !tenant.isActive });
    setMenuOpen(null);
    await load();
  };

  const filtered = tenants.filter((t) => {
    const matchSearch =
      t.username.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? t.isActive : !t.isActive);
    const matchProperty = propertyFilter === "all" || t.propertyId === propertyFilter;
    return matchSearch && matchStatus && matchProperty;
  });

  const counts = {
    all: tenants.length,
    active: tenants.filter((t) => t.isActive).length,
    inactive: tenants.filter((t) => !t.isActive).length,
  };

  const TAB_LABELS: Record<StatusFilter, string> = {
    all: `Todos (${counts.all})`,
    active: `Activos (${counts.active})`,
    inactive: `Inactivos (${counts.inactive})`,
  };

  return (
    <div className="max-w-[1400px] space-y-6">
      <div className="page-header">
        <div>
          <h2 className="section-title">Usuarios</h2>
          <p className="text-sm text-gray-400 mt-0.5">{tenants.length} inquilinos registrados</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(Object.keys(TAB_LABELS) as StatusFilter[]).map((key) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === key
                ? "bg-white text-roomly-navy shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuario o email…"
            className="input-field pl-9 w-64"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="select-field pl-9 w-52"
          >
            <option value="all">Todos los pisos</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin usuarios"
          description="No hay inquilinos que coincidan con los filtros. Los usuarios se dan de alta desde la app móvil."
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Piso</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Se unió</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="w-12 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((t) => (
                <tr key={t.id} className="table-row-hover">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-roomly-navy text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {getInitials(t.username)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{t.username}</p>
                        <p className="text-xs text-gray-400">{t.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell text-gray-600 text-xs">
                    {propertyName(t.propertyId)}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell text-gray-500 text-xs">
                    {formatDate(t.joinedAt)}
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={t.isActive ? "green" : "gray"} dot>
                      {t.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-2 py-4 relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === t.id ? null : t.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuOpen === t.id && (
                      <div className="absolute right-4 top-12 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[160px] py-1.5 text-sm">
                        <button
                          onClick={() => toggleActive(t)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-gray-700"
                        >
                          {t.isActive ? (
                            <>
                              <UserX className="w-3.5 h-3.5" /> Desactivar
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" /> Activar
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />}
    </div>
  );
}
