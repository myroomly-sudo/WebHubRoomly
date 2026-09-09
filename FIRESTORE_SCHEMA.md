# Roomly Hub — Esquema Firestore

## Colecciones

### `properties` (Pisos)
```
{
  id: string (auto)
  agencyId: string          // UID del usuario agencia en Firebase Auth
  name: string              // "Piso Centro Madrid"
  address: string
  city: string
  status: "active" | "inactive"
  propertyCode: string      // Código de 6 chars generado automáticamente
  maxUsers: number          // Máx 10
  currentUsers: number
  houseRules?: string       // Texto de normas (solo lectura en app)
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### `rooms` (Habitaciones)
```
{
  id: string (auto)
  propertyId: string
  agencyId: string
  name: string              // "Habitación 1"
  number: string            // "101"
  status: "occupied" | "free" | "pending_payment"
  monthlyRent: number
  currentTenantId?: string
  currentTenantName?: string
  floor?: number
  squareMeters?: number
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### `tenants` (Inquilinos — creados desde la app móvil)
```
{
  id: string (auto o UID Firebase)
  propertyId: string
  roomId?: string
  username: string
  email: string
  joinedAt: Timestamp
  isActive: boolean
}
```

### `incidents` (Incidencias — creadas desde la app móvil)
```
{
  id: string (auto)
  agencyId: string
  propertyId: string
  propertyName?: string
  roomId?: string
  tenantId: string
  tenantName?: string
  title: string
  description: string
  status: "open" | "in_progress" | "resolved" | "closed"
  priority: "low" | "medium" | "high" | "urgent"
  category: string
  photoUrl?: string
  agencyNotes?: string      // Solo visible en el Hub
  createdAt: Timestamp
  updatedAt: Timestamp
  resolvedAt?: Timestamp
}
```

### `payments` (Pagos)
```
{
  id: string (auto)
  agencyId: string
  propertyId: string
  propertyName?: string
  roomId: string
  roomNumber?: string
  tenantId: string
  tenantName?: string
  amount: number
  dueDate: Timestamp
  paidAt?: Timestamp
  status: "paid" | "pending" | "overdue"
  concept: string           // "Alquiler junio 2024"
  month: string             // "2024-06"
  createdAt: Timestamp
}
```

## Índices compuestos recomendados

En Firebase Console → Firestore → Índices, crear:

1. `properties`: agencyId (ASC) + createdAt (DESC)
2. `incidents`: agencyId (ASC) + status (ASC) + createdAt (DESC)
3. `incidents`: agencyId (ASC) + priority (ASC) + createdAt (DESC)
4. `payments`: agencyId (ASC) + status (ASC) + dueDate (DESC)
5. `payments`: agencyId (ASC) + month (ASC)
6. `tenants`: propertyId (ASC) + isActive (ASC)
7. `rooms`: propertyId (ASC) + number (ASC)
