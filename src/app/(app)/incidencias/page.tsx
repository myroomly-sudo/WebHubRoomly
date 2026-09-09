// src/app/(app)/incidencias/page.tsx
"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Search, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getIncidents, updateIncident } from "@/lib/firestore";
import type { Incident, IncidentStatus } from "@/types";
import Badge, { incidentStatusBadge, incidentPriorityBadge } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";

type StatusFilter = "all" | IncidentStatus;

export default function IncidenciasPage() {
  const { agencyId } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editIncident, setEditIncident] = useState<Incident | null>(null);
  const [form, setForm] = useState<{ status: IncidentStatus; agencyNotes: string }>({
    status: "open",
    agencyNotes: "",
  });

  const load = async () => {
    if (!agencyId) return;
    const data = await getIncidents(agencyId);
    setIncidents(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const openEdit = (inc: Incident) => {
    setEditIncident(inc);
    setForm({ status: inc.status, agencyNotes: inc.agencyNotes ?? "" });
  };

  const handleSave = async () => {
    if (!editIncident) return;
    await updateIncident(editIncident.id, {
      status: form.status,
      agencyNotes: form.agencyNotes,
      ...(form.status === "resolved" || form.status === "closed"
        ? { resolvedAt: new Date() as unknown as Incident["resolvedAt"] }
        : {}),
    });
    setEditIncident(null);
    await load();
  };

  const filtered = incidents.filter((i) => {
    const matchSearch =
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      (i.propertyName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (i.tenantName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: incidents.length,
    open: incidents.filter((i) => i.status === "open").length,
    in_progress: incidents.filter((i) => i.status === "in_progress").length,
    resolved: incidents.filter((i) => i.status === "resolved").length,
    closed: incidents.filter((i) => i.status === "closed").length,
  };

  const TAB_LABELS: Record<StatusFilter, string> = {
    all: `Todas (${counts.all})`,
    open: `Abiertas (${counts.open})`,
    in_progress: `En curso (${counts.in_progress})`,
    resolved: `Resueltas (${counts.resolved})`,
    closed: `Cerradas (${counts.closed})`,
  };

  return (
    <div className="max-w-[1400px] space-y-6">
      <div className="page-header">
        <div>
          <h2 className="section-title">Incidencias</h2>
          <p className="text-sm text-gray-400 mt-0.5">{incidents.length} incidencias registradas</p>
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
          placeholder="Buscar incidencia, piso o inquilino…"
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
          icon={AlertTriangle}
          title="Sin incidencias"
          description="No hay incidencias que coincidan con los filtros."
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Incidencia</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Piso</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Prioridad</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Fecha</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="w-12 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((inc) => {
                const sb = incidentStatusBadge(inc.status);
                const pb = incidentPriorityBadge(inc.priority);
                return (
                  <tr key={inc.id} className="table-row-hover">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-800">{inc.title}</p>
                      <p className="text-xs text-gray-400">{inc.tenantName ?? "—"}</p>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-gray-600 text-xs">
                      {inc.propertyName ?? "—"}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <Badge variant={pb.variant}>{pb.label}</Badge>
                    </td>
                    <td className="px-5 py-4 hidden xl:table-cell text-gray-500 text-xs">
                      {formatDate(inc.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={sb.variant} dot>{sb.label}</Badge>
                    </td>
                    <td className="px-2 py-4">
                      <button
                        onClick={() => openEdit(inc)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!editIncident} onClose={() => setEditIncident(null)} title="Gestionar incidencia" maxWidth="lg">
        {editIncident && (
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-gray-800">{editIncident.title}</p>
              <p className="text-sm text-gray-500 mt-1">{editIncident.description}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
              <select
                className="select-field"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as IncidentStatus })}
              >
                <option value="open">Abierta</option>
                <option value="in_progress">En curso</option>
                <option value="resolved">Resuelta</option>
                <option value="closed">Cerrada</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas internas de la agencia</label>
              <textarea
                className="input-field min-h-[90px]"
                value={form.agencyNotes}
                onChange={(e) => setForm({ ...form, agencyNotes: e.target.value })}
                placeholder="Notas visibles solo en el Hub, no para el inquilino…"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditIncident(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSave} className="btn-primary">Guardar</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
