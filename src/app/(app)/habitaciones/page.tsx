"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  DoorOpen, Search, Filter, MoreHorizontal, Pencil,
  ToggleLeft, ToggleRight, User, UserX,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  collection, query, where, onSnapshot, updateDoc, runTransaction,
  doc, serverTimestamp, getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Badge, { roomStatusBadge } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import ExcelExportButton from "@/components/ui/ExcelExportButton";
import { formatCurrency } from "@/lib/utils";

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

interface Tenant {
  id: string;
  username: string;
  email: string;
  propertyId: string;
}

type RoomStatusFilter = "all" | "occupied" | "free" | "pending_payment" | "disabled";

export default function HabitacionesPage() {
  const { agencyId } = useAuth();
  const searchParams = useSearchParams();

  // Apply ?piso= filter immediately on mount
  useEffect(() => {
    const pisoParam = searchParams.get("piso");
    if (pisoParam) setPropertyFilter(pisoParam);
  }, []);  // empty deps = runs once on mount
  const [rooms, setRooms] = useState<Room[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenantsByProperty, setTenantsByProperty] = useState<Record<string, Tenant[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RoomStatusFilter>("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Room>>({});
  const [saving, setSaving] = useState(false);

  // ── Tenants loader (getDocs, not realtime) ──────────────────────
  const loadTenantsAndProps = useCallback(async (propIds: string[]) => {
    if (!propIds.length) return;

    // Properties
    // (already loaded via onSnapshot above, but we need them for tenant lookup)

    // Tenants grouped by property
    const map: Record<string, Tenant[]> = {};
    for (let i = 0; i < propIds.length; i += 10) {
      const chunk = propIds.slice(i, i + 10);
      const snap = await new Promise<any>((res) => {
        const q = query(collection(db, "users"), where("propertyId", "in", chunk));
        import("firebase/firestore").then(({ getDocs }) => getDocs(q).then(res));
      });
      snap.docs.forEach((d: any) => {
        const t = { id: d.id, ...d.data() } as Tenant;
        if (!map[t.propertyId]) map[t.propertyId] = [];
        map[t.propertyId].push(t);
      });
    }
    setTenantsByProperty(map);
  }, []);

  // ── Real-time listener for properties ──────────────────────────
  useEffect(() => {
    if (!agencyId) return;
    const q = query(collection(db, "properties"), where("agencyId", "==", agencyId));
    const unsub = onSnapshot(q, (snap) => {
      const props = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Property));
      setProperties(props);
      loadTenantsAndProps(props.map((p) => p.id));
    });
    return unsub;
  }, [agencyId, loadTenantsAndProps]);

  // ── Real-time listener for rooms ───────────────────────────────
  useEffect(() => {
    if (!agencyId || !properties.length) return;
    const propIds = properties.map((p) => p.id);
    const unsubs: (() => void)[] = [];
    const roomMap = new Map<string, Room>();

    for (let i = 0; i < propIds.length; i += 10) {
      const chunk = propIds.slice(i, i + 10);
      const q = query(collection(db, "rooms"), where("propertyId", "in", chunk));
      const unsub = onSnapshot(q, (snap) => {
        snap.docs.forEach((d) => {
          const data = d.data();
          roomMap.set(d.id, { id: d.id, ...data, enabled: data.enabled !== false } as Room);
        });
        snap.docChanges().forEach((change) => {
          if (change.type === "removed") roomMap.delete(change.doc.id);
        });
        const sorted = Array.from(roomMap.values()).sort((a, b) => {
          if (a.propertyId !== b.propertyId) return a.propertyId.localeCompare(b.propertyId);
          return Number(a.number) - Number(b.number);
        });
        setRooms(sorted);
        setLoading(false);
      });
      unsubs.push(unsub);
    }

    if (!propIds.length) setLoading(false);
    return () => unsubs.forEach((u) => u());
  }, [agencyId, properties]);

  const propertyName = (id: string) => properties.find((p) => p.id === id)?.name ?? "—";

  const openEdit = (room: Room) => {
    setEditRoom(room);
    setForm({
      name: room.name,
      number: room.number,
      status: room.status,
      monthlyRent: room.monthlyRent,
      floor: room.floor,
      description: room.description ?? "",
      currentTenantId: room.currentTenantId ?? "",
      currentTenantName: room.currentTenantName ?? "",
    });
    setMenuOpen(null);
  };

  const handleTenantChange = (tenantId: string) => {
    const propertyId = editRoom?.propertyId ?? "";
    const tenant = tenantsByProperty[propertyId]?.find((t) => t.id === tenantId);
    setForm((f) => ({
      ...f,
      currentTenantId: tenantId || null,
      currentTenantName: tenant?.username ?? null,
    }));
  };

  const handleStatusChange = (status: Room["status"]) => {
    if (status !== "occupied") {
      setForm((f) => ({ ...f, status, currentTenantId: null, currentTenantName: null }));
    } else {
      setForm((f) => ({ ...f, status }));
    }
  };

  // ── Save via transaction to avoid race conditions ───────────────
  const handleSave = async () => {
    if (!editRoom) return;
    setSaving(true);
    try {
      const roomRef = doc(db, "rooms", editRoom.id);
      if (form.status === "occupied" && form.currentTenantId) {
        // Use transaction to guarantee atomicity
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(roomRef);
          const current = snap.data();
          // If room was already taken by someone else, abort
          if (
            current?.status === "occupied" &&
            current?.currentTenantId !== editRoom.currentTenantId &&
            current?.currentTenantId !== form.currentTenantId
          ) {
            throw new Error("La habitación acaba de ser ocupada por otro inquilino.");
          }
          tx.update(roomRef, {
            name: form.name,
            number: form.number,
            description: form.description ?? "",
            status: "occupied",
            currentTenantId: form.currentTenantId,
            currentTenantName: form.currentTenantName,
            monthlyRent: form.monthlyRent,
            floor: form.floor,
            updatedAt: serverTimestamp(),
          });
        });
      } else {
        await updateDoc(roomRef, {
          name: form.name,
          number: form.number,
          description: form.description ?? "",
          status: form.status ?? "free",
          currentTenantId: null,
          currentTenantName: null,
          monthlyRent: form.monthlyRent,
          floor: form.floor,
          updatedAt: serverTimestamp(),
        });
      }
      setEditRoom(null);
    } catch (e: any) {
      alert(e.message ?? "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  // ── Release room ────────────────────────────────────────────────
  const handleReleaseRoom = async (room: Room) => {
    if (!confirm(`¿Liberar la habitación "${room.name}"? Se desvinculará el inquilino actual.`)) return;
    setMenuOpen(null);
    await updateDoc(doc(db, "rooms", room.id), {
      status: "free",
      currentTenantId: null,
      currentTenantName: null,
      updatedAt: serverTimestamp(),
    });
  };

  // ── Toggle enabled ──────────────────────────────────────────────
  const toggleRoomEnabled = async (room: Room) => {
    setMenuOpen(null);
    const roomSnap = await getDoc(doc(db, "rooms", room.id));
    const currentEnabled = roomSnap.exists() ? roomSnap.data().enabled !== false : true;
    const newEnabled = !currentEnabled;
    await updateDoc(doc(db, "rooms", room.id), { enabled: newEnabled, updatedAt: serverTimestamp() });

    const propRef = doc(db, "properties", room.propertyId);
    const propSnap = await getDoc(propRef);
    if (propSnap.exists()) {
      const updatedRooms = rooms
        .filter((r) => r.propertyId === room.propertyId)
        .map((r) => (r.id === room.id ? { ...r, enabled: newEnabled } : r));
      const enabledCount = updatedRooms.filter((r) => r.enabled).length;
      await updateDoc(propRef, { maxUsers: enabledCount, updatedAt: serverTimestamp() });
    }
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

  // Auto-apply filters and open assign modal from URL params
  useEffect(() => {
    const pisoParam = searchParams.get("piso");
    const asignarParam = searchParams.get("asignar");
    if (pisoParam) setPropertyFilter(pisoParam);
    if (asignarParam && pisoParam && rooms.length && Object.keys(tenantsByProperty).length) {
      // Find a free room in this property to open edit modal pre-filled for this tenant
      const freeRoom = rooms.find((r) => r.propertyId === pisoParam && r.status === "free" && r.enabled);
      const tenant = tenantsByProperty[pisoParam]?.find((t) => t.id === asignarParam);
      if (freeRoom && tenant) {
        setEditRoom(freeRoom);
        setForm({
          name: freeRoom.name,
          number: freeRoom.number,
          status: "occupied",
          monthlyRent: freeRoom.monthlyRent,
          floor: freeRoom.floor,
          description: freeRoom.description ?? "",
          currentTenantId: tenant.id,
          currentTenantName: tenant.username,
        });
      }
    }
  }, [searchParams, rooms, tenantsByProperty]);

  const tenantsForEditRoom = editRoom ? (tenantsByProperty[editRoom.propertyId] ?? []) : [];
  // Tenants not currently assigned to any room in this property
  const occupiedTenantIds = new Set(
    rooms.filter((r) => r.propertyId === editRoom?.propertyId && r.status === "occupied" && r.id !== editRoom?.id)
      .map((r) => r.currentTenantId).filter(Boolean)
  );
  const availableTenants = tenantsForEditRoom.filter((t) => !occupiedTenantIds.has(t.id));

  return (
    <div className="max-w-[1400px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-roomly-charcoal">Habitaciones</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {rooms.filter((r) => r.enabled).length} activas · {counts.disabled} inhabilitadas · {rooms.length} total
          </p>
        </div>
        <ExcelExportButton
          filename="habitaciones"
          data={filtered.map((r) => ({
            nombre: r.name,
            numero: r.number,
            piso: propertyName(r.propertyId),
            descripcion: r.description ?? "",
            inquilino: r.currentTenantName ?? "",
            alquiler: r.monthlyRent,
            estado: r.enabled ? (r.status === "occupied" ? "Ocupada" : r.status === "free" ? "Libre" : "Pago pendiente") : "Inhabilitada",
            planta: r.floor ?? "",
          }))}
          columns={[
            { header: "Nombre", key: "nombre" },
            { header: "Número", key: "numero" },
            { header: "Piso", key: "piso" },
            { header: "Descripción", key: "descripcion" },
            { header: "Inquilino", key: "inquilino" },
            { header: "Alquiler (€)", key: "alquiler" },
            { header: "Estado", key: "estado" },
            { header: "Planta", key: "planta" },
          ]}
        />
      </div>

      {/* Status tabs */}
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

      {/* Filters */}
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

      {/* Inquilinos sin habitación — per property */}
      {propertyFilter !== "all" && (() => {
        const propTenants = tenantsByProperty[propertyFilter] ?? [];
        const occupiedIds = new Set(rooms.filter(r => r.propertyId === propertyFilter && r.status === "occupied").map(r => r.currentTenantId).filter(Boolean));
        const unassigned = propTenants.filter(t => !occupiedIds.has(t.id));
        if (!unassigned.length) return null;
        const freeRooms = rooms.filter(r => r.propertyId === propertyFilter && r.status === "free" && r.enabled);
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-3">
              ⚠ {unassigned.length} inquilino{unassigned.length > 1 ? "s" : ""} sin habitación asignada
            </p>
            <div className="space-y-2">
              {unassigned.map((t) => (
                <div key={t.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t.username}</p>
                    <p className="text-xs text-gray-400">{t.email}</p>
                  </div>
                  <button
                    disabled={!freeRooms.length}
                    onClick={() => {
                      const freeRoom = freeRooms[0];
                      if (!freeRoom) return;
                      setEditRoom(freeRoom);
                      setForm({
                        name: freeRoom.name,
                        number: freeRoom.number,
                        status: "occupied",
                        monthlyRent: freeRoom.monthlyRent,
                        floor: freeRoom.floor,
                        description: freeRoom.description ?? "",
                        currentTenantId: t.id,
                        currentTenantName: t.username,
                      });
                    }}
                    className="text-xs font-semibold text-roomly-navy bg-roomly-navy/10 px-3 py-1.5 rounded-lg hover:bg-roomly-navy/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {freeRooms.length ? "Asignar habitación" : "Sin hab. libres"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Table */}
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
                  <tr key={room.id} className={`transition-colors ${isDisabled ? "bg-gray-50/50" : "hover:bg-gray-50"}`}>
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
                    <td className="px-2 py-4 relative" style={{opacity: 1}}>
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
                          {!isDisabled && room.status === "occupied" && (
                            <button onClick={() => handleReleaseRoom(room)} className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-amber-50 text-amber-600">
                              <UserX className="w-3.5 h-3.5" /> Liberar habitación
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

      {/* Edit Modal */}
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
              onChange={(e) => handleStatusChange(e.target.value as Room["status"])}>
              <option value="free">Libre</option>
              <option value="occupied">Ocupada</option>
              <option value="pending_payment">Pago pendiente</option>
            </select>
          </div>

          {/* Inquilino — solo cuando estado es "occupied" */}
          {form.status === "occupied" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  Inquilino
                </span>
              </label>
              {availableTenants.length === 0 && !form.currentTenantId ? (
                <div className="input-field text-gray-400 text-sm bg-gray-50 cursor-not-allowed">
                  Todos los inquilinos del piso ya tienen habitación asignada
                </div>
              ) : (
                <select
                  className="input-field appearance-none cursor-pointer"
                  value={form.currentTenantId ?? ""}
                  onChange={(e) => handleTenantChange(e.target.value)}
                >
                  <option value="">Sin asignar</option>
                  {/* Show current tenant even if already assigned elsewhere */}
                  {form.currentTenantId && !availableTenants.find(t => t.id === form.currentTenantId) && (
                    <option value={form.currentTenantId}>{form.currentTenantName ?? form.currentTenantId}</option>
                  )}
                  {availableTenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.username} — {t.email}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Solo aparecen inquilinos sin habitación asignada en este piso.
              </p>
            </div>
          )}

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
