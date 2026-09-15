// src/types/index.ts

export type PropertyStatus = "active" | "inactive";
export type RoomStatus = "occupied" | "free" | "pending_payment";
export type IncidentType =
  | "fontaneria"
  | "electricidad"
  | "cerrajeria"
  | "electrodomesticos"
  | "limpieza"
  | "otros";
export type IncidentSeverity = "baja" | "media" | "alta";
export type IncidentStatus = "abierta" | "en_curso" | "resuelta" | "cerrada";
export type PaymentStatus = "paid" | "pending" | "overdue";

export interface Agency {
  id: string;
  name: string;
  email: string;
  phone?: string;
  contactName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  taxId?: string; // CIF/NIF
  bankAccountHolder?: string;
  bankIban?: string;
  bankName?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Property {
  id: string;
  agencyId: string;
  name: string;
  address: string;
  city: string;
  status: PropertyStatus;
  propertyCode: string;
  propertyPassword: string;
  code?: string;
  passwordHash?: string;
  active?: boolean;
  maxUsers: number;
  currentUsers: number;
  houseRules?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Room {
  id: string;
  propertyId: string;
  name: string;
  number: string;
  status: RoomStatus;
  monthlyRent: number;
  currentTenantId?: string;
  currentTenantName?: string;
  floor?: number;
  squareMeters?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tenant {
  id: string;
  propertyId: string;
  roomId?: string;
  username: string;
  email: string;
  joinedAt: Date;
  isActive: boolean;
}

// Esquema real: coincide con el documento que escribe la app móvil
// (src/lib/incidentsService.ts). No tiene agencyId ni roomId: el Hub
// resuelve la agencia y el nombre del piso a través de propertyId.
export interface Incident {
  id: string;
  propertyId: string;
  propertyName?: string; // enriquecido por el Hub, no vive en Firestore
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  imageUrls: string[];
  status: IncidentStatus;
  createdBy: string; // userId del inquilino
  createdByUsername: string;
  createdAt: string; // ISO string (no Timestamp de Firestore)
  resolvedAt?: string; // ISO string — lo pone el Hub al resolver/cerrar
  agencyNotes?: string; // notas internas, visibles también en la app
}

export interface Payment {
  id: string;
  propertyId: string;
  propertyName?: string;
  roomId: string;
  roomNumber?: string;
  tenantId: string;
  tenantName?: string;
  amount: number;
  dueDate: Date;
  paidAt?: Date;
  status: PaymentStatus;
  concept: string;
  month: string; // e.g. "2024-06"
  createdAt: Date;
}

export interface DashboardStats {
  totalProperties: number;
  activeProperties: number;
  totalRooms: number;
  occupiedRooms: number;
  freeRooms: number;
  openIncidents: number;
  pendingPayments: number;
  overduePayments: number;
  monthlyRevenue: number;
  occupancyRate: number;
}

