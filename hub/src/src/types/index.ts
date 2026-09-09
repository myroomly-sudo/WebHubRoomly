// src/types/index.ts

export type PropertyStatus = "active" | "inactive";
export type RoomStatus = "occupied" | "free" | "pending_payment";
export type IncidentStatus = "open" | "in_progress" | "resolved" | "closed";
export type IncidentPriority = "low" | "medium" | "high" | "urgent";
export type PaymentStatus = "paid" | "pending" | "overdue";

export interface Agency {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: Date;
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

export interface Incident {
  id: string;
  propertyId: string;
  propertyName?: string;
  roomId?: string;
  tenantId: string;
  tenantName?: string;
  title: string;
  description: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  category: string;
  photoUrl?: string;
  agencyNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
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
