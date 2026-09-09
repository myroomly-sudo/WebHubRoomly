// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatDate(date: Date | { toDate: () => Date } | string): string {
  const d =
    typeof date === "string"
      ? new Date(date)
      : "toDate" in date
      ? date.toDate()
      : date;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateShort(date: Date | { toDate: () => Date } | string): string {
  const d =
    typeof date === "string"
      ? new Date(date)
      : "toDate" in date
      ? date.toDate()
      : date;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function generatePropertyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
}

export function generatePropertyPassword(): string {
  const words = ["casa", "piso", "hogar", "llave", "puerta", "calle", "plaza", "sol", "luna", "verde"];
  const word = words[Math.floor(Math.random() * words.length)];
  const number = Math.floor(Math.random() * 900) + 100;
  return `${word}${number}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const INCIDENT_PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

export const INCIDENT_STATUS_LABELS: Record<string, string> = {
  open: "Abierta",
  in_progress: "En curso",
  resolved: "Resuelta",
  closed: "Cerrada",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "Pagado",
  pending: "Pendiente",
  overdue: "Retrasado",
};

export const ROOM_STATUS_LABELS: Record<string, string> = {
  occupied: "Ocupada",
  free: "Libre",
  pending_payment: "Pago pendiente",
};
