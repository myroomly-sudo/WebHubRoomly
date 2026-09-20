// src/app/(app)/pisos/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Building2, Search, Plus, MoreHorizontal, Pencil, Copy, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  getProperties,
  createProperty,
  updateProperty,
  deleteProperty,
} from "@/lib/firestore";
import type { Property } from "@/types";
import Badge, { propertyStatusBadge } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { generatePropertyCode, generatePropertyPassword } from "@/lib/utils";

type StatusFilter = "all" | "active" | "inactive";

export default function PisosPage() {
  const { agencyId } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const [editProperty, setEditProperty] = useState<Property | null>(null);
  const [form, setForm] = useState<Partial<Property>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", address: "", city: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!agencyId) return;
    const p = await getProperties(agencyId);
    setProperties(p);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const openEdit = (p: Property) => {
    setEditProperty(p);
    setForm({
      name: p.name,
      address: p.address,
      city: p.city,
      status: p.status,
      maxUsers: p.maxUsers,
      houseRules: p.houseRules,
    });
    setMenuOpen(null);
  };

  const handleSaveEdit = async () => {
    if (!editProperty) return;
    await updateProperty(editProperty.id, form);
    setEditProperty(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este piso? Esta acción no se puede deshacer.")) return;
    await deleteProperty(id);
    setMenuOpen(null);
    await load();
  };

  const handleCreate = async () => {
    if (!agencyId || !createForm.name.trim()) return;
    setSaving(true);
    await createProperty({
      agencyId,
      name: createForm.name,
      address: createForm.address,
      city: createForm.city,
      status: "active",
      propertyCode: generatePropertyCode(),
      propertyPassword: generatePropertyPassword(),
      maxUsers: 10,
      currentUsers: 0,
    });
    setSaving(false);
    setCreateOpen(false);
    setCreateForm({ name: "", address: "", city: "" });
    await load();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
  };

  const filtered = properties.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase()) ||
      p.propertyCode.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: properties.length,
    active: properties.filter((p) => p.status === "active").length,
    inactive: properties.filter((p) => p.status === "inactive").length,
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
          <h2 className="section-title">Pisos</h2>
          <p className="text-sm text-gray-400 mt-0.5">{properties.length} pisos gestionados</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo piso
        </button>
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

      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar piso, ciudad o código…"
          className="input-field pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Sin pisos"
          description="No hay pisos que coincidan con los filtros."
          action={
            <button onClick={() => setCreateOpen(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Crear el primero
            </button>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Piso</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Código</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Contraseña</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Usuarios</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="w-12 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => {
                const sb = propertyStatusBadge(p.status);
                return (
                  <tr key={p.id} className="table-row-hover">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.address}, {p.city}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <button
                        onClick={() => copyToClipboard(p.propertyCode)}
                        className="inline-flex items-center gap-1.5 font-mono text-xs bg-gray-100 px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Copiar código"
                      >
                        {p.propertyCode} <Copy className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <button
                        onClick={() => copyToClipboard(p.propertyPassword)}
                        className="inline-flex items-center gap-1.5 font-mono text-xs bg-gray-100 px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Copiar contraseña"
                      >
                        {p.propertyPassword} <Copy className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="px-5 py-4 hidden xl:table-cell text-gray-600">
                      {p.currentUsers}/{p.maxUsers}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={sb.variant} dot>{sb.label}</Badge>
                    </td>
                    <td className="px-2 py-4 relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === p.id ? null : p.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {menuOpen === p.id && (
                        <div className="absolute right-4 top-12 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[140px] py-1.5 text-sm">
                          <button
                            onClick={() => openEdit(p)}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-gray-700"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Editar
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-red-50 text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
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

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo piso">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
            <input
              className="input-field"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="Piso Centro Madrid"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Dirección</label>
            <input
              className="input-field"
              value={createForm.address}
              onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ciudad</label>
            <input
              className="input-field"
              value={createForm.city}
              onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
            />
          </div>
          <p className="text-xs text-gray-400">
            El código y la contraseña de la vivienda se generan automáticamente al crear el piso.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setCreateOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleCreate} disabled={saving || !createForm.name.trim()} className="btn-primary">
              {saving ? "Creando…" : "Crear piso"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editProperty} onClose={() => setEditProperty(null)} title="Editar piso">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
            <input
              className="input-field"
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Dirección</label>
              <input
                className="input-field"
                value={form.address ?? ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ciudad</label>
              <input
                className="input-field"
                value={form.city ?? ""}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
              <select
                className="select-field"
                value={form.status ?? "active"}
                onChange={(e) => setForm({ ...form, status: e.target.value as Property["status"] })}
              >
 "use client";

import { useEffect, useState } from "react";
import {
  Building2, Plus, Search, MoreHorizontal,
  Pencil, Trash2, Users, Copy, CheckCheck, DoorOpen,
} from "lucide-react";
import {
  collection, query, where, getDocs, addDoc, updateDoc,
  deleteDoc, doc, Timestamp, writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import Badge, { propertyStatusBadge } from "@/components/ui/Badge";
import { generatePropertyCode, generatePropertyPassword } from "@/lib/utils";

interface Property {
  id: string;
  agencyId: string;
  name: string;
  address: string;
  city: string;
  status: "active" | "inactive";
  propertyCode: string;
  propertyPassword: string;
  code?: string;
  passwordHash?: string;
  active?: boolean;
  maxUsers: number;
  currentUsers: number;
  roomCount?: number;
  houseRules?: string;
  createdAt: unknown;
  updatedAt: unknown;
}

const DEFAULT_FORM = {
  name: "",
  address: "",
  city: "",
  houseRules: "",
  roomCount: 4,
};

export default function PisosPage() {
  const { agencyId } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Property | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  const load = async () => {
    if (!agencyId) return;
    const snap = await getDocs(
      query(collection(db, "properties"), where("agencyId", "==", agencyId))
    );
    setProperties(
      snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Property))
        .sort((a, b) => {
          const aT = (a.createdAt as any)?.toDate?.()?.getTime() ?? 0;
          const bT = (b.createdAt as any)?.toDate?.()?.getTime() ?? 0;
          return bT - aT;
        })
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, [agencyId]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  };

  const openEdit = (p: Property) => {
    setEditTarget(p);
    setForm({
      name: p.name,
      address: p.address,
      city: p.city,
      houseRules: p.houseRules ?? "",
      roomCount: p.roomCount ?? 0,
    });
    setMenuOpen(null);
    setShowModal(true);
  };

  const createRoomsForProperty = async (propertyId: string, roomCount: number) => {
    const batch = writeBatch(db);
    for (let i = 1; i <= roomCount; i++) {
      const roomRef = doc(collection(db, "rooms"));
      batch.set(roomRef, {
        propertyId,
        agencyId,
        name: `Habitación ${i}`,
        number: String(i),
        status: "free",
        enabled: true,
        monthlyRent: 0,
        currentTenantId: null,
        currentTenantName: null,
        floor: 1,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }
    await batch.commit();
  };

  const handleSave = async () => {
    if (!agencyId || !form.name || !form.address) return;
    setSaving(true);
    try {
      if (editTarget) {
        await updateDoc(doc(db, "properties", editTarget.id), {
          name: form.name,
          address: form.address,
          city: form.city,
          houseRules: form.houseRules,
          roomCount: form.roomCount,
          updatedAt: Timestamp.now(),
        });
      } else {
        const code = generatePropertyCode();
        const password = generatePropertyPassword();
        const newPropRef = await addDoc(collection(db, "properties"), {
          agencyId,
          name: form.name,
          address: form.address,
          city: form.city,
          houseRules: form.houseRules,
          roomCount: form.roomCount,
          maxUsers: form.roomCount, // maxUsers = roomCount por defecto
          propertyCode: code,
          propertyPassword: password,
          code,
          passwordHash: password,
          active: true,
          currentUsers: 0,
          status: "active",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        if (form.roomCount > 0) {
          await createRoomsForProperty(newPropRef.id, form.roomCount);
        }
      }
      setShowModal(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este piso? Esta acción no se puede deshacer.")) return;
    await deleteDoc(doc(db, "properties", id));
    setMenuOpen(null);
    await load();
  };

  const handleToggleStatus = async (p: Property) => {
    await updateDoc(doc(db, "properties", p.id), {
      status: p.status === "active" ? "inactive" : "active",
      active: p.status !== "active",
      updatedAt: Timestamp.now(),
    });
    setMenuOpen(null);
    await load();
  };

  const copyCode = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedCode(value);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filtered = properties.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-[1400px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-roomly-charcoal">Pisos</h2>
          <p className="text-sm text-gray-400 mt-0.5">{properties.length} propiedades registradas</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo piso
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, dirección…" className="input-field pl-9" />
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2} title="Sin pisos registrados" description="Crea tu primer piso para empezar a gestionar inquilinos."
          action={<button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Nuevo piso</button>} />
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Piso</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Ciudad</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acceso</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Inquilinos / Hab.</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="w-12 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => {
                const sb = propertyStatusBadge(p.status);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-sky-50 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-sky-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[200px]">{p.address}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-gray-600">{p.city}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400 w-16">Código</span>
                          <code className="text-xs bg-gray-100 px-2 py-0.5 rounded-lg font-mono font-semibold text-gray-700">{p.propertyCode}</code>
                          <button onClick={() => copyCode(p.propertyCode)} className="p-1 text-gray-400 hover:text-gray-600">
                            {copiedCode === p.propertyCode ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400 w-16">Contraseña</span>
                          <code className="text-xs bg-amber-50 px-2 py-0.5 rounded-lg font-mono font-semibold text-amber-700">{p.propertyPassword ?? "—"}</code>
                          {p.propertyPassword && (
                            <button onClick={() => copyCode(p.propertyPassword)} className="p-1 text-gray-400 hover:text-gray-600">
                              {copiedCode === p.propertyPassword ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-3 text-gray-600 text-xs">
                        <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-gray-400" />{p.currentUsers}/{p.maxUsers}</div>
                        <div className="flex items-center gap-1"><DoorOpen className="w-3.5 h-3.5 text-gray-400" />{p.roomCount ?? "—"}</div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><Badge variant={sb.variant} dot>{sb.label}</Badge></td>
                    <td className="px-2 py-4 relative">
                      <button onClick={() => setMenuOpen(menuOpen === p.id ? null : p.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {menuOpen === p.id && (
                        <div className="absolute right-4 top-12 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[160px] py-1.5 text-sm">
                          <button onClick={() => openEdit(p)} className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-gray-700">
                            <Pencil className="w-3.5 h-3.5" /> Editar
                          </button>
                          <button onClick={() => handleToggleStatus(p)} className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-gray-700">
                            <Building2 className="w-3.5 h-3.5" />{p.status === "active" ? "Desactivar" : "Activar"}
                          </button>
                          <div className="border-t border-gray-100 my-1" />
                          <button onClick={() => handleDelete(p.id)} className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-red-50 text-red-600">
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
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

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editTarget ? "Editar piso" : "Nuevo piso"}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del piso *</label>
            <input className="input-field" placeholder="ej. Piso Centro Madrid" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Dirección *</label>
            <input className="input-field" placeholder="Calle Mayor 12, 3ºB" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ciudad</label>
            <input className="input-field" placeholder="Madrid" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nº de habitaciones</label>
            <input type="number" min={0} max={20} className="input-field"
              value={form.roomCount}
              onChange={(e) => setForm({ ...form, roomCount: Number(e.target.value) })}
              disabled={!!editTarget}
            />
            {editTarget
              ? <p className="text-xs text-gray-400 mt-1">Las habitaciones se gestionan desde la sección Habitaciones.</p>
              : <p className="text-xs text-gray-400 mt-1">Se crean automáticamente. El máximo de inquilinos se ajusta al mismo valor.</p>
            }
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Normas de convivencia</label>
            <textarea className="input-field resize-none h-24" placeholder="Escribe las normas…"
              value={form.houseRules} onChange={(e) => setForm({ ...form, houseRules: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? "Guardando…" : editTarget ? "Guardar cambios" : "Crear piso"}
            </button>
          </div>
        </div>
      </Modal>

      {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />}
    </div>
  );
}
