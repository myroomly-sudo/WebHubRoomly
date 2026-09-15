// src/app/(app)/perfil/page.tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { User, Building2, Landmark, ShieldCheck, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { getAgency, updateAgency } from "@/lib/firestore";
import type { Agency } from "@/types";
import { getInitials } from "@/lib/utils";

type FormState = {
  contactName: string;
  phone: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  taxId: string;
  bankAccountHolder: string;
  bankIban: string;
  bankName: string;
};

const EMPTY_FORM: FormState = {
  contactName: "",
  phone: "",
  name: "",
  address: "",
  city: "",
  postalCode: "",
  taxId: "",
  bankAccountHolder: "",
  bankIban: "",
  bankName: "",
};

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
      <div className="flex items-start gap-3 px-6 py-4 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-roomly-navy" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
          {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        className="input-field disabled:bg-gray-50 disabled:text-gray-400"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

export default function PerfilPage() {
  const { user, agencyId } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resetSent, setResetSent] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  useEffect(() => {
    if (!agencyId) return;
    (async () => {
      try {
        const agency = await getAgency(agencyId);
        if (agency) {
          setForm({
            contactName: agency.contactName ?? "",
            phone: agency.phone ?? "",
            name: agency.name ?? "",
            address: agency.address ?? "",
            city: agency.city ?? "",
            postalCode: agency.postalCode ?? "",
            taxId: agency.taxId ?? "",
            bankAccountHolder: agency.bankAccountHolder ?? "",
            bankIban: agency.bankIban ?? "",
            bankName: agency.bankName ?? "",
          });
        }
      } catch (err) {
        console.error("Error cargando el perfil:", err);
        setError("No se ha podido cargar la información del perfil.");
      } finally {
        setLoading(false);
      }
    })();
  }, [agencyId]);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!agencyId) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateAgency(agencyId, {
        ...form,
        email: user?.email ?? "",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Error guardando el perfil:", err);
      setError("No se ha podido guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setResetSending(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
    } catch (err) {
      console.error("Error enviando email de restablecimiento:", err);
      setError("No se ha podido enviar el email de restablecimiento.");
    } finally {
      setResetSending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[800px] space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-[800px] space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-roomly-navy text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
            {getInitials(user?.email?.split("@")[0] ?? "")}
          </div>
          <div>
            <h2 className="section-title">Mi perfil</h2>
            <p className="text-sm text-gray-400 mt-0.5">{user?.email}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Section icon={User} title="Datos de contacto" description="Persona de contacto de la agencia">
          <Field label="Email" value={user?.email ?? ""} disabled />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Nombre de contacto"
              value={form.contactName}
              onChange={set("contactName")}
              placeholder="Ej. María García"
            />
            <Field
              label="Teléfono"
              value={form.phone}
              onChange={set("phone")}
              placeholder="+34 600 000 000"
            />
          </div>
        </Section>

        <Section icon={Building2} title="Datos de la agencia" description="Información fiscal y de facturación">
          <Field
            label="Nombre de la agencia"
            value={form.name}
            onChange={set("name")}
            placeholder="Roomly Housing S.L."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Dirección"
              value={form.address}
              onChange={set("address")}
              placeholder="Calle Mayor 1"
            />
            <Field label="Ciudad" value={form.city} onChange={set("city")} placeholder="Madrid" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Código postal"
              value={form.postalCode}
              onChange={set("postalCode")}
              placeholder="28001"
            />
            <Field
              label="CIF / NIF"
              value={form.taxId}
              onChange={set("taxId")}
              placeholder="B12345678"
            />
          </div>
        </Section>

        <Section
          icon={Landmark}
          title="Datos bancarios"
          description="Cuenta donde se reciben los pagos de los inquilinos"
        >
          <Field
            label="Titular de la cuenta"
            value={form.bankAccountHolder}
            onChange={set("bankAccountHolder")}
            placeholder="Roomly Housing S.L."
          />
          <Field
            label="IBAN"
            value={form.bankIban}
            onChange={set("bankIban")}
            placeholder="ES00 0000 0000 0000 0000 0000"
          />
          <Field
            label="Banco"
            value={form.bankName}
            onChange={set("bankName")}
            placeholder="Ej. CaixaBank"
          />
          <p className="text-xs text-gray-400">
            Estos datos son confidenciales y solo los ve tu agencia. Nunca se muestran a los inquilinos.
          </p>
        </Section>

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <Check className="w-4 h-4" /> Guardado
            </span>
          )}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>

      <Section
        icon={ShieldCheck}
        title="Seguridad"
        description="Gestión de tu contraseña de acceso al Hub"
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-gray-500">
            Te enviaremos un email a <strong>{user?.email}</strong> con un enlace para
            restablecer tu contraseña.
          </p>
          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={resetSending || resetSent}
            className="btn-secondary flex-shrink-0"
          >
            {resetSent ? "Email enviado ✓" : resetSending ? "Enviando…" : "Cambiar contraseña"}
          </button>
        </div>
      </Section>
    </div>
  );
}
