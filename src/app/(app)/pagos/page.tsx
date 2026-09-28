// src/app/(app)/pagos/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CreditCard, Search, CheckCircle2, Plus, AlertCircle,
  Clock, ChevronDown, Sparkles, RotateCcw, Bell,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  getPayments, markPaymentPaid, markPaymentPending,
  markPaymentOverdue, createPayment, generateMonthlyPayments,
  getProperties, getAllRooms,
} from "@/lib/firestore";
import type { Payment, PaymentStatus } from "@/types";
import Badge, { paymentStatusBadge } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";
import { formatCurrency, formatDate } from "@/lib/utils";

type StatusFilter = "all" | PaymentStatus;

interface Property { id: string; name: string; }
interface Room {
  id: string; propertyId: string; name: string; number: string;
  status: string; monthlyRent: number;
  currentTenantId?: string | null; currentTenantName?: string | null;
}

// Generate list of last 12 months for selector
function getMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function PagosPage() {
  const { agencyId } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Modal: crear pago individual
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    propertyId: "", roomId: "", amount: "", month: currentMonth(),
    concept: "", dueDay: "5",
  });
  const [creating, setCreating] = useState(false);

  // Modal: generar mensualidades
  const [showGenerate, setShowGenerate] = useState(false);
  const [genProperty, setGenProperty] = useState("");
  const [genMonth, setGenMonth] = useState(currentMonth());
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<number | null>(null);

  const monthOptions = getMonthOptions();

  const load = useCallback(async () => {
    if (!agencyId) return;
    const [pays, props] = await Promise.all([
      getPayments(agencyId),
      getProperties(agencyId),
    ]);
    setPayments(pays);
    setProperties(props);
    const allRooms = await getAllRooms(agencyId);
    setRooms(allRooms as Room[]);
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { load(); }, [load]);

  // Auto-fill amount when room changes
  const selectedRoom = rooms.find((r) => r.id === createForm.roomId);
  useEffect(() => {
    if (selectedRoom?.monthlyRent) {
      setCreateForm((f) => ({ ...f, amount: String(selectedRoom.monthlyRent) }));
    }
  }, [createForm.roomId]);

  const roomsForProperty = rooms.filter(
    (r) => r.propertyId === createForm.propertyId && r.status === "occupied"
  );

  const handleMarkPaid = async (id: string) => {
    setMarkingId(id);
    await markPaymentPaid(id);
    await load();
    setMarkingId(null);
  };

  const handleMarkPending = async (id: string) => {
    setMarkingId(id);
    await markPaymentPending(id);
    await load();
    setMarkingId(null);
  };

  const handleMarkOverdue = async (id: string) => {
    setMarkingId(id);
    await markPaymentOverdue(id);
    await load();
    setMarkingId(null);
  };

  const handleCreate = async () => {
    if (!agencyId || !createForm.propertyId || !createForm.roomId || !createForm.amount) return;
    setCreating(true);
    const room = rooms.find((r) => r.id === createForm.roomId);
    const prop = properties.find((p) => p.id === createForm.propertyId);
    const [year, month] = createForm.month.split("-").map(Number);
    const dueDate = new Date(year, month - 1, Number(createForm.dueDay));

    await createPayment({
      agencyId,
      propertyId: createForm.propertyId,
      propertyName: prop?.name ?? "",
      roomId: createForm.roomId,
      roomNumber: room?.number ?? "",
      roomName: room?.name ?? "",
      tenantId: room?.currentTenantId ?? "",
      tenantName: room?.currentTenantName ?? "",
      amount: Number(createForm.amount),
      dueDate,
      concept: createForm.concept || `Alquiler ${createForm.month}`,
      month: createForm.month,
    });

    setShowCreate(false);
    setCreateForm({ propertyId: "", roomId: "", amount: "", month: currentMonth(), concept: "", dueDay: "5" });
    setCreating(false);
    await load();
  };

  const handleGenerate = async () => {
    if (!agencyId || !genProperty) return;
    setGenerating(true);
    setGenResult(null);
    const prop = properties.find((p) => p.id === genProperty);
    const count = await generateMonthlyPayments(agencyId, genProperty, prop?.name ?? "", genMonth);
    setGenResult(count);
    setGenerating(false);
    await load();
  };

  const filtered = payments.filter((p) => {
    const matchSearch =
      (p.concept ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.tenantName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.propertyName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchProp = propertyFilter === "all" || p.propertyId === propertyFilter;
    const matchMonth = monthFilter === "all" || p.month === monthFilter;
    return matchSearch && matchStatus && matchProp && matchMonth;
  });

  const counts = {
    all: payments.length,
    paid: payments.filter((p) => p.status === "paid").length,
    pending: payments.filter((p) => p.status === "pending").length,
    overdue: payments.filter((p) => p.status === "overdue").length,
  };

  const totalPending = payments
    .filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const tenantNotified = payments.filter((p) => p.tenantNotified && p.status !== "paid").length;

  const TAB_LABELS: Record<StatusFilter, string> = {
    all: `Todos (${counts.all})`,
    pending: `Pendientes (${counts.pending})`,
    overdue: `Atrasados (${counts.overdue})`,
    paid: `Pagados (${counts.paid})`,
  };

  return (
    <div className="max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title">Pagos</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {payments.length} pagos registrados · {formatCurrency(totalPending)} por cobrar
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGenerate(true)}
            className="btn-secondary"
          >
            <Sparkles className="w-4 h-4" />
            Generar mensualidades
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Nuevo pago
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Cobrado" value={formatCurrency(totalPaid)} icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <KpiCard title="Por cobrar" value={formatCurrency(totalPending)} icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-500" />
        <KpiCard title="Atrasados" value={counts.overdue} icon={AlertCircle} iconBg="bg-red-50" iconColor="text-red-500" />
        <KpiCard
          title="Declarados por inquilino"
          value={tenantNotified}
          icon={Bell}
          iconBg="bg-violet-50"
          iconColor="text-violet-500"
          subtitle="pendientes de confirmar"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        {(Object.keys(TAB_LABELS) as StatusFilter[]).map((key) => (
          <button key={key} onClick={() => setStatusFilter(key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              statusFilter === key ? "bg-white text-roomly-navy shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar inquilino, piso…" className="input-field pl-9 w-56" />
        </div>
        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)}
            className="input-field pr-8 appearance-none w-48 cursor-pointer">
            <option value="all">Todos los pisos</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}
            className="input-field pr-8 appearance-none w-48 cursor-pointer">
            <option value="all">Todos los meses</option>
            {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={CreditCard} title="Sin pagos" description="Crea pagos individuales o genera las mensualidades del mes." />
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Inquilino</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Piso / Habitación</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Mes</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Vencimiento</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Importe</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="w-44 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => {
                const sb = paymentStatusBadge(p.status);
                return (
                  <tr key={p.id} className={`table-row-hover ${p.tenantNotified && p.status !== "paid" ? "bg-violet-50/30" : ""}`}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-800">{p.tenantName ?? "—"}</p>
                      <p className="text-xs text-gray-400">{p.concept}</p>
                      {p.tenantNotified && p.status !== "paid" && (
                        <div className="flex items-center gap-1 mt-1">
                          <Bell className="w-3 h-3 text-violet-500" />
                          <span className="text-[10px] text-violet-600 font-medium">Inquilino declara pagado</span>
                        </div>
                      )}
                      {p.tenantNote && (
                        <p className="text-[10px] text-gray-400 italic mt-0.5">"{p.tenantNote}"</p>
                      )}
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-gray-600 text-xs">
                      <p>{p.propertyName ?? "—"}</p>
                      <p className="text-gray-400">{p.roomName ?? (p.roomNumber ? `Hab. ${p.roomNumber}` : "—")}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell text-gray-500 text-xs font-medium">{p.month}</td>
                    <td className="px-5 py-4 hidden md:table-cell text-gray-500 text-xs">{formatDate(p.dueDate)}</td>
                    <td className="px-5 py-4 font-semibold text-gray-800">{formatCurrency(p.amount)}</td>
                    <td className="px-5 py-4"><Badge variant={sb.variant} dot>{sb.label}</Badge></td>
                    <td className="px-2 py-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {p.status !== "paid" && (
                          <button onClick={() => handleMarkPaid(p.id)} disabled={markingId === p.id}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {markingId === p.id ? "…" : "Pagado"}
                          </button>
                        )}
                        {p.status === "paid" && (
                          <button onClick={() => handleMarkPending(p.id)} disabled={markingId === p.id}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1.5 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50">
                            <RotateCcw className="w-3.5 h-3.5" />
                            Revertir
                          </button>
                        )}
                        {p.status === "pending" && (
                          <button onClick={() => handleMarkOverdue(p.id)} disabled={markingId === p.id}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Atrasado
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-gray-50 flex justify-between items-center bg-gray-50/50">
            <span className="text-xs text-gray-400">{filtered.length} registros</span>
            <span className="text-sm font-semibold text-gray-700">
              Total: {formatCurrency(filtered.reduce((s, p) => s + p.amount, 0))}
            </span>
          </div>
        </div>
      )}

      {/* Modal: Nuevo pago */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo pago">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Piso *</label>
            <select className="input-field appearance-none cursor-pointer"
              value={createForm.propertyId}
              onChange={(e) => setCreateForm({ ...createForm, propertyId: e.target.value, roomId: "" })}>
              <option value="">Selecciona un piso…</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Habitación *</label>
            <select className="input-field appearance-none cursor-pointer"
              value={createForm.roomId}
              onChange={(e) => setCreateForm({ ...createForm, roomId: e.target.value })}
              disabled={!createForm.propertyId}>
              <option value="">Selecciona una habitación…</option>
              {roomsForProperty.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.currentTenantName ?? "Sin inquilino"} ({formatCurrency(r.monthlyRent)}/mes)
                </option>
              ))}
            </select>
            {createForm.propertyId && roomsForProperty.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No hay habitaciones ocupadas en este piso.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mes *</label>
              <select className="input-field appearance-none cursor-pointer"
                value={createForm.month}
                onChange={(e) => setCreateForm({ ...createForm, month: e.target.value })}>
                {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Día de vencimiento</label>
              <input type="number" min={1} max={28} className="input-field"
                value={createForm.dueDay}
                onChange={(e) => setCreateForm({ ...createForm, dueDay: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Importe (€) *</label>
            <input type="number" min={0} className="input-field"
              value={createForm.amount}
              onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
              placeholder="Se rellena automáticamente con el precio de la habitación" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Concepto</label>
            <input className="input-field"
              value={createForm.concept}
              onChange={(e) => setCreateForm({ ...createForm, concept: e.target.value })}
              placeholder={`Alquiler ${createForm.month}`} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleCreate} disabled={creating || !createForm.propertyId || !createForm.roomId || !createForm.amount} className="btn-primary">
              {creating ? "Creando…" : "Crear pago"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Generar mensualidades */}
      <Modal open={showGenerate} onClose={() => { setShowGenerate(false); setGenResult(null); }} title="Generar mensualidades">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Genera automáticamente un pago pendiente para cada habitación ocupada del piso seleccionado. Si ya existe un pago para ese mes y habitación, no se duplica.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Piso *</label>
            <select className="input-field appearance-none cursor-pointer"
              value={genProperty}
              onChange={(e) => setGenProperty(e.target.value)}>
              <option value="">Selecciona un piso…</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mes *</label>
            <select className="input-field appearance-none cursor-pointer"
              value={genMonth}
              onChange={(e) => setGenMonth(e.target.value)}>
              {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          {genResult !== null && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium ${genResult > 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
              {genResult > 0
                ? `✓ Se han creado ${genResult} pago${genResult > 1 ? "s" : ""} correctamente.`
                : "No se han creado nuevos pagos (ya existían todos o no hay habitaciones ocupadas)."}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowGenerate(false); setGenResult(null); }} className="btn-secondary">Cerrar</button>
            {genResult === null && (
              <button onClick={handleGenerate} disabled={generating || !genProperty} className="btn-primary">
                <Sparkles className="w-4 h-4" />
                {generating ? "Generando…" : "Generar pagos"}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
