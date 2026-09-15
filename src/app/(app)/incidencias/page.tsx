// src/app/(app)/incidencias/page.tsx
"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Search, Pencil, ImageIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getIncidents, updateIncident, getProperties } from "@/lib/firestore";
import type { Incident, IncidentStatus, Property } from "@/types";
import Badge, { incidentStatusBadge, incidentSeverityBadge } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { formatDate, INCIDENT_TYPE_LABELS } from "@/lib/utils";

type StatusFilter = "all" | IncidentStatus;

export default function IncidenciasPage() {
  const { agencyId } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [editIncident, setEditIncident] = useState<Incident | null>(null);
  const [form, setForm] = useState<{ status: IncidentStatus; agencyNotes: string }>({
    status: "abierta",
    agencyNotes: "",
  });
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const load = async () => {
    if (!agencyId) return;
    const [data, props] = await Promise.all([getIncidents(agencyId), getProperties(agencyId)]);
    setIncidents(data);
    setProperties(props);
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
      ...(form.status === "resuelta" || form.status === "cerrada"
        ? { resolvedAt: new Date().toISOString() }
        : { resolvedAt: undefined }),
    });
    setEditIncident(null);
    await load();
  };

  const filtered = incidents.filter((i) => {
    const typeLabel = INCIDENT_TYPE_LABELS[i.type] ?? i.type;
    const matchSearch =
      typeLabel.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase()) ||
      (i.propertyName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (i.createdByUsername ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    const matchProperty = propertyFilter === "all" || i.propertyId === propertyFilter;
    return matchSearch && matchStatus && matchProperty;
  });

  const counts = {
    all: incidents.length,
    abierta: incidents.filter((i) => i.status === "abierta").length,
    en_curso: incidents.filter((i) => i.status === "en_curso").length,
    resuelta: incidents.filter((i) => i.status === "resuelta").length,
    cerrada: incidents.filter((i) => i.status === "cerrada").length,
  };

  const TAB_LABELS: Record<StatusFilter, string> = {
    all: `Todas (${counts.all})`,
    abierta: `Abiertas (${counts.abierta})`,
    en_curso: `En curso (${counts.en_curso})`,
    resuelta: `Resueltas (${counts.resuelta})`,
    cerrada: `Cerradas (${counts.cerrada})`,
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

      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar incidencia, piso o inquilino…"
            className="input-field pl-9 w-64"
          />
        </div>
        <select
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          className="select-field w-52"
        >
          <option value="all">Todos los pisos</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
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
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Severidad</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Fecha</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="w-12 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((inc) => {
                const sb = incidentStatusBadge(inc.status);
                const sevb = incidentSeverityBadge(inc.severity);
                return (
                  <tr key={inc.id} className="table-row-hover">
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        {inc.imageUrls?.length > 0 ? (
                          <button
                            onClick={() => setLightboxUrl(inc.imageUrls[0])}
                            className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0"
                            title="Ver foto"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={inc.imageUrls[0]}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            {inc.imageUrls.length > 1 && (
                              <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[10px] font-semibold px-1 rounded-tl-md">
                                +{inc.imageUrls.length - 1}
                              </span>
                            )}
                          </button>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800">
                            {INCIDENT_TYPE_LABELS[inc.type] ?? inc.type}
                          </p>
                          <p className="text-xs text-gray-400 truncate max-w-xs">{inc.description}</p>
                          <p className="text-[11px] text-gray-300 mt-0.5">{inc.createdByUsername}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-gray-600 text-xs">
                      {inc.propertyName ?? "—"}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <Badge variant={sevb.variant}>{sevb.label}</Badge>
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
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={incidentSeverityBadge(editIncident.severity).variant}>
                {incidentSeverityBadge(editIncident.severity).label}
              </Badge>
              <span className="text-xs text-gray-400">
                {editIncident.propertyName} · reportada por {editIncident.createdByUsername} el{" "}
                {formatDate(editIncident.createdAt)}
              </span>
            </div>

            <div>
              <p className="font-semibold text-gray-800">
                {INCIDENT_TYPE_LABELS[editIncident.type] ?? editIncident.type}
              </p>
              <p className="text-sm text-gray-500 mt-1">{editIncident.description}</p>
            </div>

            {editIncident.imageUrls?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {editIncident.imageUrls.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover cursor-pointer border border-gray-100"
                    onClick={() => setLightboxUrl(url)}
                  />
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
              <select
                className="select-field"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as IncidentStatus })}
              >
                <option value="abierta">Abierta</option>
                <option value="en_curso">En curso</option>
                <option value="resuelta">Resuelta</option>
                <option value="cerrada">Cerrada</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nota de la agencia
              </label>
              <textarea
                className="input-field min-h-[90px]"
                value={form.agencyNotes}
                onChange={(e) => setForm({ ...form, agencyNotes: e.target.value })}
                placeholder="El inquilino verá esta nota en la app…"
              />
              <p className="text-xs text-gray-400 mt-1">
                Esta nota es visible para el inquilino en su app.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditIncident(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSave} className="btn-primary">Guardar</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Visor de foto a pantalla completa */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-6"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-full object-contain rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
