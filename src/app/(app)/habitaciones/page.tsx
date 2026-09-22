"use client";

import { useEffect, useState } from "react";
import {
  DoorOpen, Search, Filter, MoreHorizontal, Pencil,
  ToggleLeft, ToggleRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  collection, query, where, getDocs, updateDoc,
  doc, Timestamp, getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Badge, { roomStatusBadge } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { formatCurrency, cn } from "@/lib/utils";

interface Room {
  id: string;
  propertyId: string;
  name: string;
  number: string;
  status: "occupied" | "free" | "pending_payment";
  enabled: boolean;
  monthlyRent: number;
  currentTenantId?: string | null;
  currentTenantName?: string | null;
  floor?: number;
  description?: string;
}

interface Property {
  id: string;
  name: string;
  address?: string;
  propertyCode: string;
  roomCount?: number;
  maxUsers: number;
}

type RoomStatusFilter = "all" | "occupied" | "free" | "pending_payment" | "disabled";

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
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!agencyId) return;
    const propsSnap = await getDocs(
      query(collection(db, "properties"), where("agencyId", "==", agencyId))
    );
    const props = propsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Property));
    setProperties(props);

    const propertyIds = props.map((p) => p.id);
    if (!propertyIds.length) { setLoading(false); return; }

    const allRooms: Room[] = [];
    for (let i = 0; i < propertyIds.length; i += 10) {
      const chunk = propertyIds.slice(i, i + 10);
      const snap = await getDocs(query(collection(db, "rooms"), where("propertyId", "in", chunk)));
      snap.docs.forEach((d) => allRooms.push({ id: d.id, enabled: true, ...d.data() } as Room));
    }
    allRooms.sort((a, b) => {
      if (a.propertyId !== b.propertyId) return a.propertyId.localeCompare(b.propertyId);
      return Number(a.number) - Number(b.number);
    });
    setRooms(allRooms);
    setLoading(false);
  };

  useEffect(() => { load(); }, [agencyId]);

  const propertyName = (id: string) => properties.find((p) => p.id === id)?.name ?? "—";

  const openEdit = (room: Room) => {
    setEditRoom(room);
    setForm({ name: room.name, number: room.number, status: room.status, monthlyRent: room.monthlyRent, floor: room.floor, description: room.description ?? "" });
    setMenuOpen(null);
  };

  const handleSave = async () => {
    if (!editRoom) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "rooms", editRoom.id), { ...form, updatedAt: Timestamp.now() });
      setEditRoom(null);
      await load();
    } finally { setSaving(false); }
  };

  const toggleRoomEnabled = async (room: Room) => {
    const newEnabled = !room.enabled;
    setMenuOpen(null);
    await updateDoc(doc(db, "rooms", room.id), { enabled: newEnabled, updatedAt: Timestamp.now() });

    // Recalculate maxUsers for this property
    const propRef = doc(db, "properties", room.propertyId);
    const propSnap = await getDoc(propRef);
    if (propSnap.exists()) {
      const updatedRooms = rooms
        .filter((r) => r.propertyId === room.propertyId)
        .map((r) => (r.id === room.id ? { ...r, enabled: newEnabled } : r));
      const enabledCount = updatedRooms.filter((r) => r.enabled).length;
      await updateDoc(propRef, { maxUsers: enabledCount, updatedAt: Timestamp.now() });
    }
    await load();
  };

  const filtered = rooms.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.number.toLowerCase().includes(search.toLowerCase()) ||
      (r.currentTenantName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "disabled" ? !r.enabled : r.status === statusFilter && r.enabled);
    const matchProp = propertyFilter === "all" || r.propertyId === propertyFilter;
    return matchSearch && matchStatus && matchProp;
  });

  const counts = {
    all: rooms.length,
    occupied: rooms.filter((r) => r.status === "occupied" && r.enabled).length,
    free: rooms.filter((r) => r.status === "free" && r.enabled).length,
    pending_payment: rooms.filter((r) => r.status === "pending_payment" && r.enabled).length,
    disabled: rooms.filter((r) => !r.enabled).length,
  };

  const TAB_LABELS: Record<RoomStatusFilter, string> = {
    all: `Todas (${counts.all})`,
    occupied: `Ocupadas (${counts.occupied})`,
    free: `Libres (${counts.free})`,
    pending_payment: `Pago pendiente (${counts.pending_payment})`,
    disabled: `Inhabilitadas (${counts.disabled})`,
  };

  return (
    <div className="max-w-[1400px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-roomly-charcoal">Habitaciones</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {rooms.filter((r) => r.enabled).length} activas · {counts.disabled} inhabilitadas · {rooms.length} total
          </p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        {(Object.keys(TAB_LABELS) as RoomStatusFilter[]).map((key) => (
          <button key={key} onClick={() => setStatusFilter(key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              statusFilter === key ? "bg-white text-roomly-navy shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar habitación o inquilino…" className="input-field pl-9 w-64" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)}
            className="input-field pl-9 w-52 appearance-none cursor-pointer">
            <option value="all">Todos los pisos</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={DoorOpen}
          title={rooms.length === 0 ? "Sin habitaciones" : "Sin resultados"}
          description={rooms.length === 0 ? "Las habitaciones se crean automáticamente al crear un piso." : "No hay habitaciones que coincidan con los filtros."} />
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Habitación</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Piso</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Inquilino</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Alquiler/mes</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="w-12 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((room) => {
                const sb = roomStatusBadge(room.status);
                const isDisabled = !room.enabled;
                return (
                  <tr key={room.id} className={`transition-colors ${isDisabled ? "bg-gray-50/50 opacity-60" : "hover:bg-gray-50"}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isDisabled ? "bg-gray-100 text-gray-400" : "bg-violet-50 text-violet-600"}`}>
                          {room.number}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{room.name}</p>
                          {isDisabled
                            ? <p className="text-xs text-red-400 font-medium">Inhabilitada</p>
                            : room.description
                              ? <p className="text-xs text-gray-400">{room.description}</p>
                              : room.floor !== undefined && <p className="text-xs text-gray-400">Planta {room.floor}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-gray-600 text-xs">{propertyName(room.propertyId)}</td>
                    <td className="px-5 py-4 hidden lg:table-cell text-gray-600">
                      {room.currentTenantName ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell font-medium text-gray-700">
                      {room.monthlyRent > 0 ? formatCurrency(room.monthlyRent) : <span className="text-gray-300">Sin precio</span>}
                    </td>
                    <td className="px-5 py-4">
                      {isDisabled
                        ? <Badge variant="gray">Inhabilitada</Badge>
                        : <Badge variant={sb.variant} dot>{sb.label}</Badge>}
                    </td>
                    <td className="px-2 py-4 relative">
                      <button onClick={() => setMenuOpen(menuOpen === room.id ? null : room.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {menuOpen === room.id && (
                        <div className="absolute right-4 top-12 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[180px] py-1.5 text-sm">
                          {!isDisabled && (
                            <button onClick={() => openEdit(room)} className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-gray-700">
                              <Pencil className="w-3.5 h-3.5" /> Editar
                            </button>
                          )}
                          <button onClick={() => toggleRoomEnabled(room)}
                            className={`w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 ${isDisabled ? "text-emerald-600" : "text-red-500"}`}>
                            {isDisabled
                              ? <><ToggleRight className="w-3.5 h-3.5" /> Habilitar</>
                              : <><ToggleLeft className="w-3.5 h-3.5" /> Inhabilitar</>}
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

      <Modal open={!!editRoom} onClose={() => setEditRoom(null)} title="Editar habitación">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
              <input className="input-field" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Número</label>
              <input className="input-field" value={form.number ?? ""} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
            <input className="input-field" placeholder="ej. Suite exterior, Habitación doble…"
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
            <select className="input-field appearance-none cursor-pointer" value={form.status ?? "free"}
              onChange={(e) => setForm({ ...form, status: e.target.value as Room["status"] })}>
              <option value="free">Libre</option>
              <option value="occupied">Ocupada</option>
              <option value="pending_payment">Pago pendiente</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Alquiler mensual (€)</label>
              <input type="number" className="input-field" value={form.monthlyRent ?? ""}
                onChange={(e) => setForm({ ...form, monthlyRent: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Planta</label>
              <input type="number" className="input-field" value={form.floor ?? ""}
                onChange={(e) => setForm({ ...form, floor: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditRoom(null)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </Modal>

      {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />}
    </div>
  );
}

