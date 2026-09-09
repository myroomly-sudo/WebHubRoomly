// src/app/(app)/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  DoorOpen,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getDashboardStats, getIncidents, getPayments } from "@/lib/firestore";
import type { DashboardStats, Incident, Payment } from "@/types";
import KpiCard from "@/components/ui/KpiCard";
import Badge, { incidentStatusBadge, paymentStatusBadge } from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export default function DashboardPage() {
  const { agencyId } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) return;
    (async () => {
      const [s, incidents, payments] = await Promise.all([
        getDashboardStats(agencyId),
        getIncidents(agencyId, { status: "open" }),
        getPayments(agencyId, { status: "pending" }),
      ]);
      setStats(s);
      setRecentIncidents(incidents.slice(0, 5));
      setRecentPayments(payments.slice(0, 5));
      setLoading(false);
    })();
  }, [agencyId]);

  if (loading || !stats) {
    return (
      <div className="max-w-[1400px] space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] space-y-6">
      <div className="page-header">
        <div>
          <h2 className="section-title">Dashboard</h2>
          <p className="text-sm text-gray-400 mt-0.5">Resumen general de la agencia</p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Pisos activos"
          value={`${stats.activeProperties}/${stats.totalProperties}`}
          icon={Building2}
          iconColor="text-sky-600"
          iconBg="bg-sky-50"
        />
        <KpiCard
          title="Ocupación"
          value={`${stats.occupancyRate.toFixed(0)}%`}
          subtitle={`${stats.occupiedRooms} ocupadas · ${stats.freeRooms} libres`}
          icon={DoorOpen}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
        <KpiCard
          title="Incidencias abiertas"
          value={stats.openIncidents}
          icon={AlertTriangle}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
        />
        <KpiCard
          title="Ingresos del mes"
          value={formatCurrency(stats.monthlyRevenue)}
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <KpiCard
          title="Total habitaciones"
          value={stats.totalRooms}
          icon={DoorOpen}
          iconColor="text-roomly-navy"
          iconBg="bg-slate-100"
        />
        <KpiCard
          title="Pagos pendientes"
          value={stats.pendingPayments}
          icon={CreditCard}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <KpiCard
          title="Pagos atrasados"
          value={stats.overduePayments}
          icon={CreditCard}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <KpiCard
          title="Pisos totales"
          value={stats.totalProperties}
          icon={CheckCircle2}
          iconColor="text-gray-600"
          iconBg="bg-gray-100"
        />
      </div>

      {/* Recent lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm">Incidencias abiertas recientes</h3>
            <Link href="/incidencias" className="text-xs font-semibold text-roomly-navy hover:underline">
              Ver todas
            </Link>
          </div>
          {recentIncidents.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="Sin incidencias abiertas"
              description="Todo está en orden por ahora."
            />
          ) : (
            <div className="divide-y divide-gray-50">
              {recentIncidents.map((inc) => {
                const sb = incidentStatusBadge(inc.status);
                return (
                  <div key={inc.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{inc.title}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {inc.propertyName ?? "—"} · {formatDate(inc.createdAt)}
                      </p>
                    </div>
                    <Badge variant={sb.variant} dot>{sb.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payments */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm">Pagos pendientes recientes</h3>
            <Link href="/pagos" className="text-xs font-semibold text-roomly-navy hover:underline">
              Ver todos
            </Link>
          </div>
          {recentPayments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Sin pagos pendientes"
              description="No hay pagos pendientes por cobrar."
            />
          ) : (
            <div className="divide-y divide-gray-50">
              {recentPayments.map((p) => {
                const sb = paymentStatusBadge(p.status);
                return (
                  <div key={p.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.concept}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {p.tenantName ?? "—"} · vence {formatDate(p.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold text-gray-700">
                        {formatCurrency(p.amount)}
                      </span>
                      <Badge variant={sb.variant} dot>{sb.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
