// src/components/ui/Badge.tsx
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "green" | "red" | "yellow" | "blue" | "purple" | "gray" | "orange";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  red: "bg-red-50 text-red-700 ring-1 ring-red-200",
  yellow: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  blue: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  purple: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  gray: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  orange: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
};

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

export default function Badge({ variant, children, dot, className }: BadgeProps) {
  return (
    <span className={cn("badge", VARIANT_CLASSES[variant], className)}>
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full flex-shrink-0",
            variant === "green" && "bg-emerald-500",
            variant === "red" && "bg-red-500",
            variant === "yellow" && "bg-amber-500",
            variant === "blue" && "bg-sky-500",
            variant === "purple" && "bg-violet-500",
            variant === "gray" && "bg-gray-400",
            variant === "orange" && "bg-orange-500"
          )}
        />
      )}
      {children}
    </span>
  );
}

// Convenience helpers
export function incidentStatusBadge(status: string) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    open: { variant: "red", label: "Abierta" },
    in_progress: { variant: "yellow", label: "En curso" },
    resolved: { variant: "green", label: "Resuelta" },
    closed: { variant: "gray", label: "Cerrada" },
  };
  return map[status] ?? { variant: "gray", label: status };
}

export function incidentPriorityBadge(priority: string) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    low: { variant: "gray", label: "Baja" },
    medium: { variant: "blue", label: "Media" },
    high: { variant: "orange", label: "Alta" },
    urgent: { variant: "red", label: "Urgente" },
  };
  return map[priority] ?? { variant: "gray", label: priority };
}

export function paymentStatusBadge(status: string) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    paid: { variant: "green", label: "Pagado" },
    pending: { variant: "yellow", label: "Pendiente" },
    overdue: { variant: "red", label: "Retrasado" },
  };
  return map[status] ?? { variant: "gray", label: status };
}

export function roomStatusBadge(status: string) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    occupied: { variant: "blue", label: "Ocupada" },
    free: { variant: "green", label: "Libre" },
    pending_payment: { variant: "yellow", label: "Pago pendiente" },
  };
  return map[status] ?? { variant: "gray", label: status };
}

export function propertyStatusBadge(status: string) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    active: { variant: "green", label: "Activo" },
    inactive: { variant: "gray", label: "Inactivo" },
  };
  return map[status] ?? { variant: "gray", label: status };
}
