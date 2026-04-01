# Unifai — ERP Amanecer Indumentaria

Sistema de gestión para fabricación y venta de uniformes escolares y laborales.
Construido con React + TypeScript (frontend) y Node.js + Express + Prisma (backend).

---

## Stack

| Capa | Tecnología | Deploy |
|------|-----------|--------|
| Frontend | React 18 + TypeScript + Vite + Tailwind | Vercel |
| Backend  | Node.js 20 + Express + Zod + JWT | Railway |
| Base de datos | PostgreSQL 16 | Railway |
| ORM | Prisma 5 | — |

---

## Setup local (primera vez)

### Prerrequisitos
- Node.js 20+
- PostgreSQL local **o** cuenta en [railway.app](https://railway.app)

### 1. Clonar el repo

```bash
git clone https://github.com/tu-usuario/unifai.git
cd unifai
```

### 2. Backend

```bash
cd backend
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env y completar DATABASE_URL
```

Ejemplo de `.env`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/unifai"
JWT_SECRET="cambiar-esto-por-un-string-aleatorio-muy-largo-en-produccion"
PORT=3001
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"
```

```bash
# Crear tablas en la base de datos
npm run db:migrate

# Cargar datos iniciales (65 insumos reales, instituciones, usuario admin)
npm run db:seed

# Levantar en modo desarrollo (hot reload)
npm run dev
# → API disponible en http://localhost:3001
```

**Credenciales del admin creadas por el seed:**
- Email: `admin@amanecer.com`
- Password: `unifai2025`
- ⚠️ Cambiar la contraseña antes de usar en producción

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# → App disponible en http://localhost:5173
```

El frontend en desarrollo ya apunta al backend local via el proxy de Vite (configurado en `vite.config.ts`).

---

## Deploy en producción

### Paso 1 — Base de datos en Railway

1. Ir a [railway.app](https://railway.app) → New Project → Add PostgreSQL
2. Copiar el valor de `DATABASE_URL` desde la pestaña "Connect"

### Paso 2 — Backend en Railway

1. New Service → GitHub Repo → seleccionar este repositorio
2. Root Directory: `backend`
3. Railway detecta el `nixpacks.toml` automáticamente
4. Agregar variables de entorno:

```
DATABASE_URL     = <copiado del paso 1>
JWT_SECRET       = <string aleatorio, mínimo 32 caracteres>
FRONTEND_URL     = https://unifai.vercel.app
NODE_ENV         = production
```

5. El primer deploy ejecuta automáticamente:
   - `npm install`
   - `npx prisma generate`
   - `npm run build`
   - `npx prisma migrate deploy` (al iniciar)
   - `node dist/index.js`

6. Verificar que el health check responde: `https://tu-backend.railway.app/health`

7. Ejecutar seed en producción (una sola vez):
   - En Railway → tu servicio backend → Shell:
   ```bash
   node -e "require('./dist/seed.js')"
   ```
   O desde tu máquina local con `DATABASE_URL` de producción:
   ```bash
   DATABASE_URL="postgresql://..." npm run db:seed
   ```

### Paso 3 — Frontend en Vercel

1. Ir a [vercel.com](https://vercel.com) → New Project → importar repo
2. Framework Preset: **Vite**
3. Root Directory: `frontend`
4. Agregar variable de entorno:
```
VITE_API_URL = https://tu-backend.railway.app/api
```
5. Deploy → Vercel genera una URL del tipo `unifai-xxx.vercel.app`

6. Volver a Railway → backend → Variables → actualizar:
```
FRONTEND_URL = https://unifai-xxx.vercel.app
```

7. Opcionalmente, configurar dominio personalizado en Vercel (ej: `app.amanecerindumentaria.com`)

---

## Módulos

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| Autenticación | ✅ | Login con JWT, roles ADMIN / OPERADOR / SOLO_LECTURA |
| Dashboard | ✅ | Métricas, últimos presupuestos, estado de pedidos |
| Maestro de insumos | ✅ | 65 insumos reales, historial de precios |
| Actualización masiva | ✅ | Por tipo, categoría o proveedor con % |
| Listas de precios | ✅ | Por institución, comparativo entre colegios |
| Presupuestos | ✅ | Crear, listar, cambiar estado |
| Pedidos y kanban | ✅ | Corte → Bordado → Costura → Terminado |
| Administración | ✅ | Movimientos de cuentas, imputación |
| Órdenes de trabajo | 🔜 | Sprint 4 |
| Export PDF listas | 🔜 | Sprint 4 |
| Módulo contable completo | 🔜 | Sprint 5 |

---

## Estructura del proyecto

```
unifai/
├── .github/
│   └── workflows/ci.yml        ← CI automático en cada push
├── backend/
│   ├── nixpacks.toml           ← config de build para Railway
│   ├── railway.json            ← config de deploy para Railway
│   ├── prisma/
│   │   └── schema.prisma       ← todas las tablas del sistema
│   └── src/
│       ├── index.ts            ← servidor Express
│       ├── seed.ts             ← datos iniciales (65 insumos reales)
│       ├── routes/
│       │   ├── auth.ts         ← POST /api/auth/login
│       │   ├── insumos.ts      ← CRUD + actualización masiva
│       │   ├── presupuestos.ts ← CRUD presupuestos
│       │   └── instituciones.ts
│       └── middleware/
│           ├── auth.ts         ← verificación JWT
│           └── errorHandler.ts
└── frontend/
    ├── vercel.json             ← config SPA routing para Vercel
    └── src/
        ├── App.tsx             ← rutas con protección por login
        ├── lib/
        │   ├── api.ts          ← cliente HTTP (axios + interceptors)
        │   └── utils.ts        ← formatCurrency, formatDate, etc.
        ├── store/
        │   └── authStore.ts    ← estado global (Zustand + persist)
        ├── components/
        │   └── Layout.tsx      ← sidebar + navegación
        └── pages/
            ├── LoginPage.tsx
            ├── DashboardPage.tsx
            ├── InsumosPage.tsx      ← módulo más completo
            ├── PreciosPage.tsx
            ├── PresupuestosPage.tsx
            ├── PedidosPage.tsx
            └── AdminPage.tsx
```

---

## API Reference

### Auth
```
POST /api/auth/login    { email, password } → { token, usuario }
```

### Insumos
```
GET  /api/insumos                    → lista con precio actual
GET  /api/insumos/:id/historial      → historial de precios
POST /api/insumos                    → crear insumo
PATCH /api/insumos/:id/precio        → actualizar precio individual
POST /api/insumos/actualizar-masivo  → actualizar por % con filtros
```

### Presupuestos
```
GET   /api/presupuestos       → lista últimos 50
GET   /api/presupuestos/:id   → detalle con líneas
POST  /api/presupuestos       → crear nuevo
PATCH /api/presupuestos/:id/estado → cambiar estado
```

### Instituciones
```
GET /api/instituciones          → lista
GET /api/instituciones/:id/listas → listas de precios de la institución
```

---

## Comandos útiles

```bash
# Backend
npm run dev          # desarrollo con hot reload
npm run build        # compilar TypeScript
npm run db:migrate   # aplicar migraciones pendientes
npm run db:seed      # cargar datos iniciales
npm run db:studio    # abrir Prisma Studio (GUI para la DB)

# Frontend
npm run dev          # desarrollo con HMR
npm run build        # build de producción
npm run preview      # preview del build
```

---

## Variables de entorno

### Backend (`.env`)
| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATABASE_URL` | ✅ | Connection string PostgreSQL |
| `JWT_SECRET` | ✅ | Secreto para firmar tokens (32+ chars) |
| `PORT` | — | Puerto del servidor (default: 3001) |
| `FRONTEND_URL` | — | URL del frontend para CORS |
| `NODE_ENV` | — | `development` o `production` |

### Frontend (`.env`)
| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `VITE_API_URL` | — | URL base de la API (default: proxy local) |

---

Desarrollado con Claude · Amanecer Indumentaria · Ezeiza, Buenos Aires
