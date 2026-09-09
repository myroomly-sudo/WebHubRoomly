// src/app/(app)/habitaciones/page.tsx
"use client";

import { useEffect, useState } from "react";
import { DoorOpen, Search, Filter, MoreHorizontal, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getAllRooms, getProperties, updateRoom } from "@/lib/firestore";
import type { Room, Property } from "@/types";
import Badge, { roomStatusBadge } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";

type RoomStatusFilter = "all" | "occupied" | "free" | "pending_payment";

export default function HabitacionesPage() {
  const { agencyId } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RoomStatusFilter>("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Room>>({});

  const load = async () => {
    if (!agencyId) return;
    const [r, p] = await Promise.all([
      getAllRooms(agencyId),
      getProperties(agencyId),
    ]);
    setRooms(r);
    setProperties(p);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const propertyName = (id: string) =>
    properties.find((p) => p.id === id)?.name ?? "—";

  const openEdit = (room: Room) => {
    setEditRoom(room);
    setForm({
      name: room.name,
      number: room.number,
      status: room.status,
      monthlyRent: room.monthlyRent,
      floor: room.floor,
      squareMeters: room.squareMeters,
    });
    setMenuOpen(null);
  };

  const handleSave = async () => {
    if (!editRoom) return;
    await updateRoom(editRoom.id, form);
    setEditRoom(null);
    await load();
  };

  const filtered = rooms.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.number.toLowerCase().includes(search.toLowerCase()) ||
      (r.currentTenantName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchProperty = propertyFilter === "all" || r.propertyId === propertyFilter;
    return matchSearch && matchStatus && matchProperty;
  });

  const counts = {
    all: rooms.length,
    occupied: rooms.filter((r) => r.status === "occupied").length,
    free: rooms.filter((r) => r.status === "free").length,
    pending_payment: rooms.filter((r) => r.status === "pending_payment").length,
  };

  const TAB_LABELS: Record<RoomStatusFilter, string> = {
    all: `Todas (${counts.all})`,
    occupied: `Ocupadas (${counts.occupied})`,
    free: `Libres (${counts.free})`,
    pending_payment: `Pago pendiente (${counts.pending_payment})`,
  };

  return (
    <div className="max-w-[1400px] space-y-6">
      <div className="page-header">
        <div>
          <h2 className="section-title">Habitaciones</h2>
          <p className="text-sm text-gray-400 mt-0.5">{rooms.length} habitaciones en total</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(Object.keys(TAB_LABELS) as RoomStatusFilter[]).map((key) => (
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

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar habitación o inquilino…"
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

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="Sin habitaciones"
          description="No hay habitaciones que coincidan con los filtros."
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Habitación</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Piso</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Inquilino</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Alquiler/mes</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="w-12 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((room) => {
                const sb = roomStatusBadge(room.status);
                return (
                  <tr key={room.id} className="table-row-hover">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center text-xs font-bold text-violet-600">
                          {room.number}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{room.name}</p>
                          {room.floor !== undefined && (
                            <p className="text-xs text-gray-400">Planta {room.floor}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-gray-600 text-xs">
                      {propertyName(room.propertyId)}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell text-gray-600">
                      {room.currentTenantName ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4 hidden xl:table-cell font-medium text-gray-700">
                      {room.monthlyRent ? formatCurrency(room.monthlyRent) : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={sb.variant} dot>{sb.label}</Badge>
                    </td>
                    <td className="px-2 py-4 relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === room.id ? null : room.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {menuOpen === room.id && (
                        <div className="absolute right-4 top-12 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[140px] py-1.5 text-sm">
                          <button
                            onClick={() => openEdit(room)}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-gray-700"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Editar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        open={!!editRoom}
        onClose={() => setEditRoom(null)}
        title="Editar habitación"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
              <input
                className="input-field"
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Número</label>
              <input
                className="input-field"
                value={form.number ?? ""}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
            <select
              className="select-field"
              value={form.status ?? "free"}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as Room["status"] })
              }
            >
              <option value="free">Libre</option>
              <option value="occupied">Ocupada</option>
              <option value="pending_payment">Pago pendiente</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Alquiler mensual (€)</label>
              <input
                type="number"
                className="input-field"
                value={form.monthlyRent ?? ""}
                onChange={(e) => setForm({ ...form, monthlyRent: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Planta</label>
              <input
                type="number"
                className="input-field"
                value={form.floor ?? ""}
                onChange={(e) => setForm({ ...form, floor: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditRoom(null)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} className="btn-primary">Guardar</button>
          </div>
        </div>
      </Modal>

      {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />}
    </div>
  );
}
