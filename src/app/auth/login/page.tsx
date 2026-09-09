// src/app/auth/login/page.tsx
"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";

function getFriendlyError(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "El email no tiene un formato válido.";
    case "auth/user-disabled":
      return "Esta cuenta ha sido deshabilitada.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos fallidos. Inténtalo de nuevo más tarde.";
    default:
      return "No se ha podido iniciar sesión. Inténtalo de nuevo.";
  }
}

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String((err as { code: string }).code)
          : "";
      setError(getFriendlyError(code));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="grid grid-cols-2 gap-1.5 p-2.5 bg-white rounded-2xl shadow-card border border-gray-100 mb-4">
            <div className="w-5 h-5 rounded-lg bg-roomly-sky" />
            <div className="w-5 h-5 rounded-lg bg-roomly-mint" />
            <div className="w-5 h-5 rounded-lg bg-roomly-lavender" />
            <div className="w-5 h-5 rounded-lg bg-roomly-peach" />
          </div>
          <h1 className="text-xl font-bold text-roomly-charcoal">Roomly Hub</h1>
          <p className="text-sm text-gray-400 mt-1">Panel de gestión para agencias</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4"
        >
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3.5 py-2.5 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@agencia.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? "Entrando…" : "Iniciar sesión"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          ¿Problemas para acceder? Contacta con el equipo de Roomly.
        </p>
      </div>
    </div>
  );
}
