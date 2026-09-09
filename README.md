# Roomly Hub 🏠

Panel de administración web para agencias de coliving. Complementa la app móvil Roomly (iOS/Android) con una interfaz de escritorio para gestores inmobiliarios.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **TailwindCSS** con paleta Roomly
- **Firebase Firestore** (base de datos)
- **Firebase Auth** (autenticación por agencia)

## Estructura de carpetas

```
src/
├── app/
│   ├── (app)/                    # Rutas protegidas (requieren login)
│   │   ├── layout.tsx            # Layout con sidebar + header
│   │   ├── dashboard/page.tsx    # Dashboard con KPIs
│   │   ├── pisos/page.tsx        # CRUD pisos
│   │   ├── habitaciones/page.tsx # Gestión habitaciones
│   │   ├── incidencias/page.tsx  # Incidencias + filtros
│   │   ├── usuarios/page.tsx     # Inquilinos por piso
│   │   └── pagos/page.tsx        # Seguimiento pagos
│   ├── auth/login/page.tsx       # Login agencia
│   ├── globals.css
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Redirect a /dashboard
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   └── ui/
│       ├── Badge.tsx
│       ├── KpiCard.tsx
│       ├── Modal.tsx
│       └── EmptyState.tsx
├── lib/
│   ├── firebase.ts               # Inicialización Firebase
│   ├── firestore.ts              # Funciones CRUD
│   ├── auth-context.tsx          # Context de autenticación
│   └── utils.ts                  # Helpers (formatCurrency, etc.)
└── types/
    └── index.ts                  # Tipos TypeScript
```

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Firebase

Copia `.env.example` como `.env.local` y rellena tus credenciales Firebase:

```bash
cp .env.example .env.local
```

Edita `.env.local` con los valores de tu proyecto Firebase
(Firebase Console → Configuración del proyecto → Apps web).

### 3. Firestore

- Crea las colecciones según `FIRESTORE_SCHEMA.md`
- Sube las reglas de `firestore.rules`
- Crea los índices compuestos indicados en el esquema

### 4. Crear usuario de agencia

En Firebase Console → Authentication → Users, crea el usuario de la agencia con email + contraseña. El UID de ese usuario se usa como `agencyId` en todos los documentos.

### 5. Arrancar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Módulos

| Sección | Descripción |
|---------|-------------|
| **Dashboard** | KPIs en tiempo real: pisos activos, ocupación, incidencias, pagos |
| **Pisos** | CRUD completo + generación de código/QR por piso |
| **Habitaciones** | Estado por habitación, filtros por piso y estado |
| **Incidencias** | Listado con filtros, cambio de estado y notas internas |
| **Usuarios** | Inquilinos agrupados por piso |
| **Pagos** | Vista de seguimiento (pagado / pendiente / retrasado) |

## Vinculación con la app móvil

La app móvil escribe en las mismas colecciones Firestore:
- Los inquilinos se registran con el código del piso → crean documentos en `tenants`
- Las incidencias se abren desde la app → documentos en `incidents`
- Los pagos los registra la agencia o la app → documentos en `payments`

El `agencyId` es el nexo: todos los documentos de una agencia llevan su UID.
