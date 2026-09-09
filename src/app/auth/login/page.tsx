"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch {
      setError("No se pudo iniciar sesión. Comprueba tus datos e inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-card p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-roomly-navy">Roomly Hub</h1>
          <p className="text-sm text-gray-500 mt-2">Inicia sesión para gestionar tus propiedades.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input-field" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
            <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="input-field" />
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
            {submitting ? "Entrando…" : "Iniciar sesión"}
          </button>
        </form>
      </section>
    </main>
  );
}
