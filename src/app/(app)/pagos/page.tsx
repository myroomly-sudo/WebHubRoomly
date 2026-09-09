// src/app/(app)/pagos/page.tsx
"use client";

import { useEffect, useState } from "react";
import { CreditCard, Search, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getPayments, markPaymentPaid } from "@/lib/firestore";
import type { Payment, PaymentStatus } from "@/types";
import Badge, { paymentStatusBadge } from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";

type StatusFilter = "all" | PaymentStatus;

export default function PagosPage() {
  const { agencyId } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = async () => {
    if (!agencyId) return;
    const data = await getPayments(agencyId);
    setPayments(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const handleMarkPaid = async (id: string) => {
    setMarkingId(id);
    await markPaymentPaid(id);
    await load();
    setMarkingId(null);
  };

  const filtered = payments.filter((p) => {
    const matchSearch =
      p.concept.toLowerCase().includes(search.toLowerCase()) ||
      (p.tenantName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.propertyName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: payments.length,
    paid: payments.filter((p) => p.status === "paid").length,
    pending: payments.filter((p) => p.status === "pending").length,
    overdue: payments.filter((p) => p.status === "overdue").length,
  };

  const TAB_LABELS: Record<StatusFilter, string> = {
    all: `Todos (${counts.all})`,
    pending: `Pendientes (${counts.pending})`,
    overdue: `Atrasados (${counts.overdue})`,
    paid: `Pagados (${counts.paid})`,
  };

  const totalPending = payments
    .filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="max-w-[1400px] space-y-6">
      <div className="page-header">
        <div>
          <h2 className="section-title">Pagos</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {payments.length} pagos · {formatCurrency(totalPending)} por cobrar
          </p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        {(Object.keys(TAB_LABELS) as StatusFilter[]).map((key) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              statusFilter === key
                ? "bg-white text-roomly-navy shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar concepto, inquilino o piso…"
          className="input-field pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Sin pagos"
          description="No hay pagos que coincidan con los filtros."
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Concepto</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Piso / Habitación</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Vencimiento</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Importe</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="w-32 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => {
                const sb = paymentStatusBadge(p.status);
                return (
                  <tr key={p.id} className="table-row-hover">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-800">{p.concept}</p>
                      <p className="text-xs text-gray-400">{p.tenantName ?? "—"}</p>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-gray-600 text-xs">
                      {p.propertyName ?? "—"} {p.roomNumber ? `· Hab. ${p.roomNumber}` : ""}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell text-gray-500 text-xs">
                      {formatDate(p.dueDate)}
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-700">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={sb.variant} dot>{sb.label}</Badge>
                    </td>
                    <td className="px-2 py-4">
                      {p.status !== "paid" && (
                        <button
                          onClick={() => handleMarkPaid(p.id)}
                          disabled={markingId === p.id}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {markingId === p.id ? "Marcando…" : "Marcar pagado"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
