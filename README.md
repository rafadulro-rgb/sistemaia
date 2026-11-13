# SistemaIA — Sistema de administración de gastos

Monorepo con:

- **Frontend**: SvelteKit (`apps/web`) — publicado en Vercel
- **Backend**: Node.js + Express + Supabase (`apps/api`) — publicado en Vercel como serverless
- **Base de datos**: Supabase (Postgres) — esquema en `supabase/migrations/0001_init.sql`

## Funcionalidades

- Registro/login con contraseñas cifradas (bcrypt) y sesión JWT
- Registro de ingresos y gastos por categoría (predefinidas + personalizadas)
- Cuentas: bancarias, tarjetas de crédito, ahorro, efectivo y otras
- Balance de cuentas actualizado automáticamente con cada transacción
- Reportes diarios, mensuales y anuales (totales, por categoría y por cuenta)
- Exportar datos (JSON completo / CSV de transacciones) e importar respaldos JSON
- Balanceador de cargas en el backend para tareas pesadas (reportes, importaciones)
- Endpoint `/api/health` con estado del balanceador y la BD

## Puesta en marcha local

```bash
npm install

# 1) Crea el proyecto en Supabase y ejecuta supabase/migrations/0001_init.sql
#    en el SQL Editor.

# 2) Configura el backend
cp apps/api/.env.example apps/api/.env
#    completa SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y JWT_SECRET

# 3) Configura el frontend
cp apps/web/.env.example apps/web/.env
#    PUBLIC_API_URL=http://localhost:4000

# 4) Ejecuta ambos
npm run dev:api   # http://localhost:4000
npm run dev:web   # http://localhost:5173
```

## Despliegue en Vercel (services)

El monorepo se despliega como **un solo proyecto de Vercel** con dos services definidos en `vercel.json`:

- `web`: SvelteKit en `apps/web`, atendiendo todas las rutas públicas.
- `api`: Express en `apps/api`, atendiendo `/api/*`.

### 1. Importar el proyecto

1. En Vercel: *Add New → Project* → importa el repo.
2. **Root Directory**: raíz del repositorio (`/` en Vercel).
3. Framework preset: **Services** si Vercel lo solicita; el archivo `vercel.json` ya define los services.
4. Deploy.

### 2. Variables de entorno

Configura en el proyecto de Vercel:

**Backend (`api`)**

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `JWT_SECRET`
- `BCRYPT_ROUNDS`
- `LB_WORKERS` (opcional)
- `CORS_ORIGIN` (opcional; solo necesario si sirves la web desde otro dominio)

**Frontend (`web`)**

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `PUBLIC_API_URL` es opcional. Si no se define, la web usa `/api` del mismo dominio.

### 3. Verificar

- Frontend: `https://<tu-dominio>.vercel.app/`
- API health: `https://<tu-dominio>.vercel.app/api/health`

## Estructura

```
apps/
  api/            # Express + Supabase
    src/routes/   # auth, accounts, categories, transactions, reports, io, system
    src/loadbalancer.js
    api/index.js  # entry serverless para Vercel
  web/            # SvelteKit
    src/routes/   # login, register, dashboard, transactions, accounts,
                  # categories, reports, data
supabase/
  migrations/0001_init.sql
```

## Seguridad

- Contraseñas hasheadas con bcrypt (12 rondas por defecto) — nunca se guardan en texto plano
- JWT de sesión con expiración de 7 días
- El backend usa `service_role` de Supabase y filtra todos los datos por `user_id`
- RLS habilitado en todas las tablas
- Secretos solo en variables de entorno (`.env` está en `.gitignore`)
