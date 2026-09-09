// src/lib/firestore.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  Property,
  Room,
  Tenant,
  Incident,
  Payment,
  DashboardStats,
} from "@/types";

// ─── PROPERTIES ────────────────────────────────────────────────────────────

export async function getProperties(agencyId: string): Promise<Property[]> {
  const q = query(
    collection(db, "properties"),
    where("agencyId", "==", agencyId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Property));
}

export async function getProperty(id: string): Promise<Property | null> {
  const snap = await getDoc(doc(db, "properties", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Property;
}

export async function createProperty(
  data: Omit<Property, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "properties"), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateProperty(
  id: string,
  data: Partial<Property>
): Promise<void> {
  await updateDoc(doc(db, "properties", id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteProperty(id: string): Promise<void> {
  await deleteDoc(doc(db, "properties", id));
}

// ─── ROOMS ─────────────────────────────────────────────────────────────────

export async function getRooms(propertyId: string): Promise<Room[]> {
  const q = query(
    collection(db, "rooms"),
    where("propertyId", "==", propertyId),
    orderBy("number")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Room));
}

export async function getAllRooms(agencyId: string): Promise<Room[]> {
  // Get all property IDs for this agency first
  const properties = await getProperties(agencyId);
  const propertyIds = properties.map((p) => p.id);
  if (!propertyIds.length) return [];

  const rooms: Room[] = [];
  // Firestore 'in' supports up to 30 items; chunk if needed
  for (let i = 0; i < propertyIds.length; i += 10) {
    const chunk = propertyIds.slice(i, i + 10);
    const q = query(
      collection(db, "rooms"),
      where("propertyId", "in", chunk)
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => rooms.push({ id: d.id, ...d.data() } as Room));
  }
  return rooms;
}

export async function updateRoom(id: string, data: Partial<Room>): Promise<void> {
  await updateDoc(doc(db, "rooms", id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// ─── TENANTS ───────────────────────────────────────────────────────────────

export async function getTenants(propertyId: string): Promise<Tenant[]> {
  const q = query(
    collection(db, "tenants"),
    where("propertyId", "==", propertyId),
    where("isActive", "==", true)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tenant));
}

export async function getAllTenants(agencyId: string): Promise<Tenant[]> {
  // Tenants don't store agencyId directly, so we go via their property
  const properties = await getProperties(agencyId);
  const propertyIds = properties.map((p) => p.id);
  if (!propertyIds.length) return [];

  const tenants: Tenant[] = [];
  for (let i = 0; i < propertyIds.length; i += 10) {
    const chunk = propertyIds.slice(i, i + 10);
    const q = query(collection(db, "tenants"), where("propertyId", "in", chunk));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => tenants.push({ id: d.id, ...d.data() } as Tenant));
  }
  return tenants;
}

export async function updateTenant(id: string, data: Partial<Tenant>): Promise<void> {
  await updateDoc(doc(db, "tenants", id), data);
}

// ─── INCIDENTS ─────────────────────────────────────────────────────────────

export async function getIncidents(
  agencyId: string,
  filters?: { status?: string; propertyId?: string; priority?: string }
): Promise<Incident[]> {
  const constraints: QueryConstraint[] = [
    where("agencyId", "==", agencyId),
    orderBy("createdAt", "desc"),
  ];
  if (filters?.status) constraints.push(where("status", "==", filters.status));
  if (filters?.propertyId) constraints.push(where("propertyId", "==", filters.propertyId));
  if (filters?.priority) constraints.push(where("priority", "==", filters.priority));

  const q = query(collection(db, "incidents"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Incident));
}

export async function updateIncident(
  id: string,
  data: Partial<Incident>
): Promise<void> {
  await updateDoc(doc(db, "incidents", id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// ─── PAYMENTS ──────────────────────────────────────────────────────────────

export async function getPayments(
  agencyId: string,
  filters?: { status?: string; propertyId?: string; month?: string }
): Promise<Payment[]> {
  const constraints: QueryConstraint[] = [
    where("agencyId", "==", agencyId),
    orderBy("dueDate", "desc"),
  ];
  if (filters?.status) constraints.push(where("status", "==", filters.status));
  if (filters?.propertyId) constraints.push(where("propertyId", "==", filters.propertyId));
  if (filters?.month) constraints.push(where("month", "==", filters.month));

  const q = query(collection(db, "payments"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
}

export async function updatePayment(id: string, data: Partial<Payment>): Promise<void> {
  await updateDoc(doc(db, "payments", id), data);
}

export async function markPaymentPaid(id: string): Promise<void> {
  await updateDoc(doc(db, "payments", id), {
    status: "paid",
    paidAt: Timestamp.now(),
  });
}

// ─── DASHBOARD STATS ───────────────────────────────────────────────────────

export async function getDashboardStats(agencyId: string): Promise<DashboardStats> {
  const [properties, incidents, payments] = await Promise.all([
    getProperties(agencyId),
    getIncidents(agencyId),
    getPayments(agencyId),
  ]);

  const rooms = await getAllRooms(agencyId);

  const activeProperties = properties.filter((p) => p.status === "active").length;
  const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
  const freeRooms = rooms.filter((r) => r.status === "free").length;
  const openIncidents = incidents.filter(
    (i) => i.status === "open" || i.status === "in_progress"
  ).length;
  const pendingPayments = payments.filter((p) => p.status === "pending").length;
  const overduePayments = payments.filter((p) => p.status === "overdue").length;
  const monthlyRevenue = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const occupancyRate = rooms.length > 0 ? (occupiedRooms / rooms.length) * 100 : 0;

  return {
    totalProperties: properties.length,
    activeProperties,
    totalRooms: rooms.length,
    occupiedRooms,
    freeRooms,
    openIncidents,
    pendingPayments,
    overduePayments,
    monthlyRevenue,
    occupancyRate,
  };
}

// ─── REALTIME LISTENERS ────────────────────────────────────────────────────

export function subscribeToIncidents(
  agencyId: string,
  callback: (incidents: Incident[]) => void
) {
  const q = query(
    collection(db, "incidents"),
    where("agencyId", "==", agencyId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Incident)));
  });
}
