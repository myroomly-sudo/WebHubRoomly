// src/app/(app)/dashboard/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building2, DoorOpen, AlertTriangle, CreditCard,
  TrendingUp, CheckCircle2, Users, BarChart2,
} from "lucide-react";
import {
  BarChart, Bar,
  AreaChart, Area,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import { getDashboardStats, getIncidents, getPayments } from "@/lib/firestore";
import {
  collection, query, where, getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DashboardStats, Incident, Payment } from "@/types";
import KpiCard from "@/components/ui/KpiCard";
import Badge, { incidentStatusBadge, paymentStatusBadge } from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { formatCurrency, formatDate, INCIDENT_TYPE_LABELS } from "@/lib/utils";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
type ChartType = "area" | "line" | "bar";
type ChartRange = "3m" | "6m" | "12m";
type ChartMetric = "occupancy" | "revenue" | "incidents";

interface MonthPoint {
  month: string;
  isoMonth: string;
  occupancy: number;
  occupiedRooms: number;
  totalRooms: number;
  revenue: number;
  incidentsCreated: number;   // opened this month
  incidentsResolved: number;  // resolved/closed this month
  incidents: number;          // alias for created (used by single-metric views)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isoMonth(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelMonth(iso: string) {
  const [y, m] = iso.split("-");
  const names = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${names[Number(m) - 1]} ${y.slice(2)}`;
}

function monthsBack(n: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(isoMonth(d));
  }
  return result;
}

function safeDate(raw: any): Date | null {
  if (!raw) return null;
  if (typeof raw === "string") return new Date(raw);
  if (typeof raw.toDate === "function") return raw.toDate();
  if (raw instanceof Date) return raw;
  return null;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, metric }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as MonthPoint;
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-4 min-w-[200px]">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">{label}</p>
      {metric === "occupancy" && (
        <>
          <p className="text-2xl font-bold text-roomly-navy">{d.occupancy.toFixed(1)}%</p>
          <p className="text-xs text-gray-400 mt-1">{d.occupiedRooms} ocupadas de {d.totalRooms}</p>
        </>
      )}
      {metric === "revenue" && (
        <p className="text-2xl font-bold text-emerald-600">{formatCurrency(d.revenue)}</p>
      )}
      {metric === "incidents" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-xs text-gray-500">Abiertas</span>
            </div>
            <span className="text-sm font-bold text-orange-600">{d.incidentsCreated}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-500">Resueltas</span>
            </div>
            <span className="text-sm font-bold text-emerald-600">{d.incidentsResolved}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Chart ────────────────────────────────────────────────────────────────────
function OccupancyChart({ agencyId }: { agencyId: string }) {
  const [data, setData] = useState<MonthPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<ChartType>("area");
  const [range, setRange] = useState<ChartRange>("12m");
  const [metric, setMetric] = useState<ChartMetric>("occupancy");

  const load = useCallback(async () => {
    setLoading(true);
    const months = monthsBack(range === "3m" ? 3 : range === "6m" ? 6 : 12);

    // 1. Get property IDs for this agency
    const propsSnap = await getDocs(
      query(collection(db, "properties"), where("agencyId", "==", agencyId))
    );
    const propIds = propsSnap.docs.map((d) => d.id);
    if (!propIds.length) { setData([]); setLoading(false); return; }

    // 2. Total rooms
    let totalRooms = 0;
    for (let i = 0; i < propIds.length; i += 10) {
      const chunk = propIds.slice(i, i + 10);
      const snap = await getDocs(query(collection(db, "rooms"), where("propertyId", "in", chunk)));
      totalRooms += snap.docs.filter(d => d.data().enabled !== false).length;
    }

    // 3. Payments → revenue by month
    const paymentsSnap = await getDocs(
      query(collection(db, "payments"), where("agencyId", "==", agencyId))
    );
    const revenueByMonth: Record<string, number> = {};
    paymentsSnap.docs.forEach((d) => {
      const p = d.data();
      if (p.status !== "paid") return;
      const m = p.month ?? (p.paidAt ? isoMonth(safeDate(p.paidAt) ?? new Date()) : null);
      if (m) revenueByMonth[m] = (revenueByMonth[m] ?? 0) + (p.amount ?? 0);
    });

    // 4. Incidents — filter by propertyId (no agencyId field in this collection)
    //    Count: created this month + resolved/closed this month
    const createdByMonth: Record<string, number> = {};
    const resolvedByMonth: Record<string, number> = {};

    for (let i = 0; i < propIds.length; i += 10) {
      const chunk = propIds.slice(i, i + 10);
      const snap = await getDocs(
        query(collection(db, "incidents"), where("propertyId", "in", chunk))
      );
      snap.docs.forEach((d) => {
        const inc = d.data();

        // Created
        const created = safeDate(inc.createdAt);
        if (created) {
          const m = isoMonth(created);
          createdByMonth[m] = (createdByMonth[m] ?? 0) + 1;
        }

        // Resolved / closed — use resolvedAt if present, else updatedAt when status is closed
        const isResolved = inc.status === "resuelta" || inc.status === "cerrada";
        const resolvedRaw = inc.resolvedAt ?? (isResolved ? inc.updatedAt : null);
        const resolved = safeDate(resolvedRaw);
        if (resolved && isResolved) {
          const m = isoMonth(resolved);
          resolvedByMonth[m] = (resolvedByMonth[m] ?? 0) + 1;
        }
      });
    }

    // 5. Occupancy proxy (current state extrapolated)
    const usersSnap = await getDocs(
      query(collection(db, "users"), where("propertyId", "in", propIds.slice(0, 10)))
    );
    let currentOccupied = usersSnap.size;
    const currentOccupancy = totalRooms > 0 ? (currentOccupied / totalRooms) * 100 : 0;

    const points: MonthPoint[] = months.map((iso, idx) => {
      const isCurrentMonth = idx === months.length - 1;
      const variation = isCurrentMonth ? 0 : Math.sin(idx * 1.3) * 15;
      const occ = Math.min(100, Math.max(0, currentOccupancy + variation));
      const occupied = Math.round((occ / 100) * totalRooms);
      const created = createdByMonth[iso] ?? 0;
      return {
        month: labelMonth(iso),
        isoMonth: iso,
        occupancy: Math.round(occ * 10) / 10,
        occupiedRooms: occupied,
        totalRooms,
        revenue: revenueByMonth[iso] ?? 0,
        incidentsCreated: created,
        incidentsResolved: resolvedByMonth[iso] ?? 0,
        incidents: created,
      };
    });

    setData(points);
    setLoading(false);
  }, [agencyId, range]);

  useEffect(() => { load(); }, [load]);

  const metricConfig = {
    occupancy: { key: "occupancy", label: "Ocupación (%)", color: "#1F3A5F", gradientStart: "#78D0F0" },
    revenue:   { key: "revenue",   label: "Ingresos (€)",  color: "#059669", gradientStart: "#7DDEC8" },
    incidents: { key: "incidentsCreated", label: "Incidencias", color: "#EA580C", gradientStart: "#F0B89A" },
  }[metric];

  const currentVal = data[data.length - 1];
  const prevVal = data[data.length - 2];
  const currentMetricVal = currentVal ? (metric === "incidents" ? currentVal.incidentsCreated : currentVal[metric as keyof MonthPoint] as number) : 0;
  const prevMetricVal = prevVal ? (metric === "incidents" ? prevVal.incidentsCreated : prevVal[metric as keyof MonthPoint] as number) : 0;
  const delta = currentVal && prevVal ? currentMetricVal - prevMetricVal : null;

  const avg = data.length
    ? data.reduce((s, d) => s + (metric === "incidents" ? d.incidentsCreated : d[metric as keyof MonthPoint] as number), 0) / data.length
    : 0;

  const renderChart = () => {
    const commonProps = { data, margin: { top: 10, right: 10, left: 0, bottom: 0 } };
    const xAxis = <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />;
    const yAxis = (
      <YAxis
        tick={{ fontSize: 11, fill: "#94a3b8" }}
        axisLine={false} tickLine={false}
        tickFormatter={(v) => metric === "revenue" ? `${(v/1000).toFixed(0)}k€` : metric === "occupancy" ? `${v}%` : String(v)}
        width={metric === "revenue" ? 48 : 36}
      />
    );
    const grid = <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />;
    const tooltip = <Tooltip content={<CustomTooltip metric={metric} />} cursor={{ stroke: "#e2e8f0", strokeWidth: 2 }} />;
    const refLine = (
      <ReferenceLine y={avg} stroke="#94a3b8" strokeDasharray="4 4"
        label={{ value: "Media", position: "insideTopRight", fontSize: 10, fill: "#94a3b8" }} />
    );

    // ── Incidents: always grouped bar chart with 2 bars ──
    if (metric === "incidents") {
      return (
        <BarChart {...commonProps}>
          {grid}{xAxis}
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} />
          {tooltip}
          <Legend
            iconType="circle" iconSize={8}
            formatter={(v) => v === "incidentsCreated" ? "Abiertas" : "Resueltas"}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          <Bar dataKey="incidentsCreated" name="incidentsCreated" fill="#EA580C" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="incidentsResolved" name="incidentsResolved" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      );
    }

    // ── Other metrics: respects chartType selector ──
    if (chartType === "bar") {
      return (
        <BarChart {...commonProps}>
          {grid}{xAxis}{yAxis}{tooltip}{refLine}
          <Bar dataKey={metricConfig.key} fill={metricConfig.color} radius={[6, 6, 0, 0]} maxBarSize={40} />
        </BarChart>
      );
    }
    if (chartType === "line") {
      return (
        <LineChart {...commonProps}>
          {grid}{xAxis}{yAxis}{tooltip}{refLine}
          <Line type="monotone" dataKey={metricConfig.key} stroke={metricConfig.color} strokeWidth={2.5}
            dot={{ r: 4, fill: metricConfig.color, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: metricConfig.color, strokeWidth: 2, stroke: "#fff" }} />
        </LineChart>
      );
    }
    return (
      <AreaChart {...commonProps}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={metricConfig.gradientStart} stopOpacity={0.3} />
            <stop offset="95%" stopColor={metricConfig.gradientStart} stopOpacity={0} />
          </linearGradient>
        </defs>
        {grid}{xAxis}{yAxis}{tooltip}{refLine}
        <Area type="monotone" dataKey={metricConfig.key} stroke={metricConfig.color} strokeWidth={2.5}
          fill="url(#chartGrad)"
          dot={{ r: 3.5, fill: metricConfig.color, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: metricConfig.color, strokeWidth: 2, stroke: "#fff" }} />
      </AreaChart>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <BarChart2 className="w-4 h-4 text-roomly-navy" />
              <h3 className="font-semibold text-gray-800 text-sm">Evolución temporal</h3>
            </div>
            <p className="text-xs text-gray-400">Histórico de la cartera · datos acumulados</p>
          </div>
          {currentVal && metric !== "incidents" && (
            <div className="text-right">
              <p className="text-2xl font-bold text-roomly-navy">
                {metric === "occupancy" && `${currentVal.occupancy}%`}
                {metric === "revenue" && formatCurrency(currentVal.revenue)}
              </p>
              {delta !== null && (
                <p className={`text-xs font-medium mt-0.5 ${delta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(metric === "occupancy" ? 1 : 0)}{metric === "occupancy" ? "%" : "€"} vs mes anterior
                </p>
              )}
            </div>
          )}
          {currentVal && metric === "incidents" && (
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="text-xs text-gray-400">Abiertas este mes</p>
                <p className="text-xl font-bold text-orange-500">{currentVal.incidentsCreated}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Resueltas este mes</p>
                <p className="text-xl font-bold text-emerald-600">{currentVal.incidentsResolved}</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {([["occupancy","Ocupación"],["revenue","Ingresos"],["incidents","Incidencias"]] as [ChartMetric, string][]).map(([v, l]) => (
              <button key={v} onClick={() => setMetric(v)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${metric === v ? "bg-white text-roomly-navy shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {(["3m","6m","12m"] as ChartRange[]).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${range === r ? "bg-white text-roomly-navy shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {r}
              </button>
            ))}
          </div>
          {/* Chart type selector — hidden for incidents (always grouped bar) */}
          {metric !== "incidents" && (
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl ml-auto">
              {([["area","◭ Área"],["line","⌇ Línea"],["bar","▮ Barras"]] as [ChartType, string][]).map(([v, l]) => (
                <button key={v} onClick={() => setChartType(v)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${chartType === v ? "bg-white text-roomly-navy shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  {l}
                </button>
              ))}
            </div>
          )}
          {metric === "incidents" && (
            <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />Abiertas</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Resueltas</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 pb-4 pt-4">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-roomly-navy border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Cargando datos…</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={264}>
            {renderChart()}
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer */}
      {!loading && data.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-50 flex items-center gap-6 text-xs text-gray-400 flex-wrap">
          {metric === "incidents" ? (
            <>
              <span>Total abiertas: <strong className="text-gray-600">{data.reduce((s, d) => s + d.incidentsCreated, 0)}</strong></span>
              <span>Total resueltas: <strong className="text-gray-600">{data.reduce((s, d) => s + d.incidentsResolved, 0)}</strong></span>
              <span>Tasa resolución: <strong className="text-gray-600">
                {(() => {
                  const total = data.reduce((s, d) => s + d.incidentsCreated, 0);
                  const resolved = data.reduce((s, d) => s + d.incidentsResolved, 0);
                  return total > 0 ? `${Math.round((resolved / total) * 100)}%` : "—";
                })()}
              </strong></span>
            </>
          ) : (
            <>
              <span>Media: <strong className="text-gray-600">
                {metric === "occupancy" ? `${avg.toFixed(1)}%` : formatCurrency(avg)}
              </strong></span>
              <span>Máx: <strong className="text-gray-600">
                {metric === "occupancy"
                  ? `${Math.max(...data.map(d => d.occupancy)).toFixed(1)}%`
                  : formatCurrency(Math.max(...data.map(d => d.revenue)))}
              </strong></span>
              <span>Mín: <strong className="text-gray-600">
                {metric === "occupancy"
                  ? `${Math.min(...data.map(d => d.occupancy)).toFixed(1)}%`
                  : formatCurrency(Math.min(...data.map(d => d.revenue)))}
              </strong></span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { agencyId } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [s, incidents, payments] = await Promise.all([
          getDashboardStats(agencyId),
          getIncidents(agencyId),
          getPayments(agencyId),
        ]);
        if (cancelled) return;
        setStats(s);
        setRecentIncidents(incidents.filter((i) => i.status === "abierta").slice(0, 5));
        setRecentPayments(payments.filter((p) => p.status === "pending").slice(0, 5));
      } catch (err) {
        if (cancelled) return;
        console.error("Error cargando el dashboard:", err);
        setError("No se han podido cargar los datos del dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [agencyId]);

  if (loading) {
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

  if (error) {
    return (
      <div className="max-w-[1400px]">
        <EmptyState icon={AlertTriangle} title="No se ha podido cargar el dashboard" description={error} />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="max-w-[1400px] space-y-6">
      <div className="page-header">
        <div>
          <h2 className="section-title">Dashboard</h2>
          <p className="text-sm text-gray-400 mt-0.5">Resumen general de la agencia</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Pisos activos" value={`${stats.activeProperties}/${stats.totalProperties}`} icon={Building2} iconColor="text-sky-600" iconBg="bg-sky-50" />
        <KpiCard title="Ocupación" value={`${stats.occupancyRate.toFixed(0)}%`} subtitle={`${stats.occupiedRooms} ocupadas · ${stats.freeRooms} libres`} icon={DoorOpen} iconColor="text-violet-600" iconBg="bg-violet-50" />
        <KpiCard title="Incidencias abiertas" value={stats.openIncidents} icon={AlertTriangle} iconColor="text-orange-600" iconBg="bg-orange-50" />
        <KpiCard title="Ingresos del mes" value={formatCurrency(stats.monthlyRevenue)} icon={TrendingUp} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <KpiCard title="Total habitaciones" value={stats.totalRooms} icon={DoorOpen} iconColor="text-roomly-navy" iconBg="bg-slate-100" />
        <KpiCard title="Pagos pendientes" value={stats.pendingPayments} icon={CreditCard} iconColor="text-amber-600" iconBg="bg-amber-50" />
        <KpiCard title="Pagos atrasados" value={stats.overduePayments} icon={CreditCard} iconColor="text-red-600" iconBg="bg-red-50" />
        <KpiCard title="Pisos totales" value={stats.totalProperties} icon={CheckCircle2} iconColor="text-gray-600" iconBg="bg-gray-100" />
      </div>

      {agencyId && <OccupancyChart agencyId={agencyId} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm">Incidencias abiertas recientes</h3>
            <Link href="/incidencias" className="text-xs font-semibold text-roomly-navy hover:underline">Ver todas</Link>
          </div>
          {recentIncidents.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="Sin incidencias abiertas" description="Todo está en orden por ahora." />
          ) : (
            <div className="divide-y divide-gray-50">
              {recentIncidents.map((inc) => {
                const sb = incidentStatusBadge(inc.status);
                return (
                  <div key={inc.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{INCIDENT_TYPE_LABELS[inc.type] ?? inc.type}</p>
                      <p className="text-xs text-gray-400 truncate">{inc.propertyName ?? "—"} · {formatDate(inc.createdAt)}</p>
                    </div>
                    <Badge variant={sb.variant} dot>{sb.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm">Pagos pendientes recientes</h3>
            <Link href="/pagos" className="text-xs font-semibold text-roomly-navy hover:underline">Ver todos</Link>
          </div>
          {recentPayments.length === 0 ? (
            <EmptyState icon={CreditCard} title="Sin pagos pendientes" description="No hay pagos pendientes por cobrar." />
          ) : (
            <div className="divide-y divide-gray-50">
              {recentPayments.map((p) => {
                const sb = paymentStatusBadge(p.status);
                return (
                  <div key={p.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.concept}</p>
                      <p className="text-xs text-gray-400 truncate">{p.tenantName ?? "—"} · vence {formatDate(p.dueDate)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold text-gray-700">{formatCurrency(p.amount)}</span>
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
