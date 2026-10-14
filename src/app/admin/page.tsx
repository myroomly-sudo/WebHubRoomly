// src/app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Building2, Plus, Mail, Phone, MapPin, CreditCard,
  CheckCircle2, Loader2, Users, Eye, EyeOff, Trash2,
} from "lucide-react";
import {
  collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";

// ── Superadmin credentials (change these) ──────────────────────────────────
const SUPERADMIN_EMAIL = "roomly.superadmin@roomly.app";
const SUPERADMIN_PASSWORD = "roomly2026!";

interface Agency {
  id: string;
  email: string;
  agencyName?: string;
  contactName?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  taxId?: string;
  bankAccountHolder?: string;
  bankIban?: string;
  bankName?: string;
  status: "active" | "inactive" | "pending";
  createdAt: unknown;
}

const DEFAULT_FORM = {
  email: "",
  agencyName: "",
  contactName: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  taxId: "",
  bankAccountHolder: "",
  bankIban: "",
  bankName: "",
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  // Simple local auth for superadmin panel
  const handleAuth = () => {
    if (authEmail === SUPERADMIN_EMAIL && authPassword === SUPERADMIN_PASSWORD) {
      setAuthed(true);
      setAuthError("");
    } else {
      setAuthError("Credenciales incorrectas.");
    }
  };

  const loadAgencies = async () => {
    setLoading(true);
    const snap = await getDocs(query(collection(db, "agencies"), orderBy("createdAt", "desc")));
    setAgencies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Agency)));
    setLoading(false);
  };

  useEffect(() => { if (authed) loadAgencies(); }, [authed]);

  const handleCreate = async () => {
    if (!form.email || !form.agencyName) {
      setError("El nombre de la agencia y el email son obligatorios.");
      return;
    }
    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const { setDoc } = await import("firebase/firestore");

      // Guardar datos de la agencia en Firestore con email como ID provisional
      // La cuenta de Firebase Auth la crea el superadmin manualmente en Firebase Console
      // El documento usa el email como ID hasta que se cree la cuenta Auth
      const agencyRef = doc(collection(db, "agencies"));
      await setDoc(agencyRef, {
        id: agencyRef.id,
        email: form.email,
        agencyName: form.agencyName,
        contactName: form.contactName || "",
        phone: form.phone || "",
        address: form.address || "",
        city: form.city || "",
        postalCode: form.postalCode || "",
        taxId: form.taxId || "",
        bankAccountHolder: form.bankAccountHolder || "",
        bankIban: form.bankIban || "",
        bankName: form.bankName || "",
        status: "pending", // pending hasta que se cree la cuenta Auth
        createdAt: Timestamp.now(),
      });

      setSuccess(`✓ Datos de "${form.agencyName}" guardados. Ahora crea la cuenta en Firebase Console (Authentication → Add user) con el email ${form.email} y envíale el email de restablecimiento de contraseña.`);
      setPendingEmail(form.email);
      setForm(DEFAULT_FORM);
      setShowModal(false);
      await loadAgencies();
    } catch (e: any) {
      setError(`Error: ${e.message ?? "Error desconocido"}`);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (agency: Agency) => {
    const newStatus = agency.status === "active" ? "inactive" : "active";
    await updateDoc(doc(db, "agencies", agency.id), { status: newStatus });
    await loadAgencies();
  };

  const handleResendEmail = async (email: string) => {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
    await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
      }
    );
    alert(`Email de restablecimiento enviado a ${email}`);
  };

  // ── Login screen ───────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-roomly-navy flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-roomly-charcoal">Roomly Superadmin</h1>
            <p className="text-sm text-gray-400 mt-1">Panel de administración de agencias</p>
          </div>
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
            {authError && (
              <div className="bg-red-50 text-red-600 text-sm px-3.5 py-2.5 rounded-xl border border-red-100">{authError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" className="input-field" value={authEmail}
                onChange={e => setAuthEmail(e.target.value)} placeholder="superadmin@roomly.app" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} className="input-field pr-10"
                  value={authPassword} onChange={e => setAuthPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAuth()} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button onClick={handleAuth} className="btn-primary w-full justify-center">
              Acceder
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main admin panel ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-roomly-charcoal">Panel de Agencias</h1>
            <p className="text-sm text-gray-400 mt-0.5">{agencies.length} agencias registradas</p>
          </div>
          <button onClick={() => { setShowModal(true); setError(null); setSuccess(null); }} className="btn-primary">
            <Plus className="w-4 h-4" /> Nueva agencia
          </button>
        </div>

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
            {pendingEmail && (
              <div className="bg-white border border-emerald-200 rounded-xl p-3 text-emerald-800 text-xs space-y-1 ml-6">
                <p className="font-semibold">Pasos para activar la agencia:</p>
                <p>1. Ve a <a href="https://console.firebase.google.com" target="_blank" className="underline font-medium">Firebase Console</a> → Authentication → Users → Add user</p>
                <p>2. Introduce el email <strong>{pendingEmail}</strong> y una contraseña temporal cualquiera</p>
                <p>3. Copia el UID generado y actualiza el campo <code>id</code> del documento en Firestore → agencies</p>
                <p>4. Pulsa el botón de sobre ✉ en la tabla para enviarle el email de restablecimiento</p>
              </div>
            )}
          </div>
        )}

        {/* Agencies table */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : agencies.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="font-medium">Sin agencias registradas</p>
              <p className="text-sm mt-1">Crea la primera agencia para empezar.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Agencia</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contacto</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ciudad</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="px-2 w-32" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {agencies.map(agency => (
                  <tr key={agency.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-800">{agency.agencyName ?? "—"}</p>
                      <p className="text-xs text-gray-400">{agency.email}</p>
                      {agency.taxId && <p className="text-xs text-gray-400">CIF: {agency.taxId}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-gray-700">{agency.contactName || "—"}</p>
                      {agency.phone && <p className="text-xs text-gray-400">{agency.phone}</p>}
                    </td>
                    <td className="px-5 py-4 text-gray-600">{agency.city || "—"}</td>
                    <td className="px-5 py-4">
                      <Badge variant={(agency.status === "active" ? "green" : "gray") as any} dot>
                        {agency.status === "active" ? "Activa" : agency.status === "pending" ? "Pendiente" : "Inactiva"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResendEmail(agency.email)}
                          title="Reenviar email de contraseña"
                          className="p-1.5 text-gray-400 hover:text-roomly-navy hover:bg-sky-50 rounded-lg transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(agency)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                            agency.status === "active"
                              ? "text-red-600 bg-red-50 hover:bg-red-100"
                              : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                          }`}
                        >
                          {agency.status === "active" ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal: nueva agencia */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nueva agencia" maxWidth="lg">
        <div className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3.5 py-2.5 rounded-xl border border-red-100">{error}</div>
          )}

          {/* Datos obligatorios */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datos obligatorios</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de la agencia *</label>
              <input className="input-field" placeholder="Roomly Housing S.L."
                value={form.agencyName} onChange={e => setForm({ ...form, agencyName: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email de acceso *</label>
              <input type="email" className="input-field" placeholder="contacto@agencia.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              <p className="text-xs text-gray-400 mt-1">Recibirá un email para establecer su contraseña.</p>
            </div>
          </div>

          {/* Datos de contacto */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datos de contacto</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de contacto</label>
                <input className="input-field" placeholder="Ej. María García"
                  value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono</label>
                <input className="input-field" placeholder="+34 600 000 000"
                  value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Datos de la agencia */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datos de la agencia</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Dirección</label>
                <input className="input-field" placeholder="Calle Mayor 1"
                  value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ciudad</label>
                <input className="input-field" placeholder="Madrid"
                  value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Código postal</label>
                <input className="input-field" placeholder="28001"
                  value={form.postalCode} onChange={e => setForm({ ...form, postalCode: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">CIF / NIF</label>
                <input className="input-field" placeholder="B12345678"
                  value={form.taxId} onChange={e => setForm({ ...form, taxId: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Datos bancarios */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datos bancarios</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Titular de la cuenta</label>
              <input className="input-field" placeholder="Roomly Housing S.L."
                value={form.bankAccountHolder} onChange={e => setForm({ ...form, bankAccountHolder: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">IBAN</label>
              <input className="input-field" placeholder="ES00 0000 0000 0000 0000 0000"
                value={form.bankIban} onChange={e => setForm({ ...form, bankIban: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Banco</label>
              <input className="input-field" placeholder="Ej. CaixaBank"
                value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleCreate} disabled={creating} className="btn-primary">
              {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando…</> : "Crear agencia y enviar email"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
