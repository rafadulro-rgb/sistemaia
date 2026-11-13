# Sistema de Geocercas (Geofences)

Este sistema permite dibujar, guardar geocercas y detectar automáticamente cuando un usuario entra o sale de ellas.

## Características

- **Dibujo de Geocercas**: Crea polígonos, círculos, rectángulos y polilíneas en un mapa interactivo
- **Persistencia**: Las geocercas se guardan en la base de datos de Supabase
- **Detección Automática**: Rastreo en tiempo real de la ubicación del usuario
- **Eventos de Entrada/Salida**: Registro automático cuando el usuario cruza una geocerca
- **Historial**: Vista completa de todos los eventos de geocercas

## Arquitectura

### Backend (API)

- **Migración SQL**: `supabase/migrations/0003_geofences.sql`
  - Tabla `geofences`: Almacena las geocercas creadas por los usuarios
  - Tabla `geofence_events`: Registra eventos de entrada/salida
  - Funciones auxiliares para cálculos geoespaciales

- **API Endpoints**: `apps/api/src/routes/geofences.js`
  - `GET /api/geofences` - Listar geocercas del usuario
  - `POST /api/geofences` - Crear nueva geocerca
  - `PUT /api/geofences/:id` - Actualizar geocerca
  - `DELETE /api/geofences/:id` - Eliminar geocerca
  - `GET /api/geofences/:id/events` - Obtener eventos de una geocerca
  - `GET /api/geofences/events/all` - Obtener todos los eventos del usuario
  - `POST /api/geofences/events` - Registrar evento de entrada/salida

### Frontend (Web)

- **Componente GeofenceMap**: `apps/web/src/lib/components/GeofenceMap.svelte`
  - Mapa interactivo con Leaflet y Leaflet Draw
  - Herramientas para dibujar polígonos, círculos, rectángulos, etc.
  - Eventos para creación, edición y eliminación de geocercas

- **Servicio de Geolocalización**: `apps/web/src/lib/geolocation.js`
  - Rastreo continuo de la posición del usuario
  - API de geolocalización del navegador
  - Cálculo de distancias entre puntos

- **Detector de Geocercas**: `apps/web/src/lib/geofenceDetector.js`
  - Verifica automáticamente si el usuario está dentro de geocercas activas
  - Detecta cambios de estado (entrada/salida)
  - Guarda eventos automáticamente en la base de datos

- **Cliente API**: `apps/web/src/lib/api.js`
  - Funciones para interactuar con los endpoints de geocercas

- **Páginas**:
  - `/geofences` - Gestor de geocercas (dibujo y CRUD)
  - `/geofences/tracking` - Rastreo en vivo
  - `/geofences/events` - Historial de eventos

## Uso

### 1. Crear Geocercas

1. Navega a `/geofences`
2. Usa las herramientas de dibujo en el mapa para crear una geocerca
3. Ingresa un nombre cuando se solicite
4. La geocerca se guarda automáticamente en la base de datos

### 2. Activar Rastreo

1. Navega a `/geofences/tracking`
2. Haz clic en "Iniciar Rastreo"
3. Otorga permisos de ubicación si se solicitan
4. El sistema verificará tu posición cada 5 segundos
5. Los eventos de entrada/salida se registran automáticamente

### 3. Ver Historial

1. Navega a `/geofences/events`
2. Filtra por tipo de evento (entrada/salida) si lo deseas
3. Visualiza todos los eventos registrados con ubicación y timestamp

## Configuración

### Variables de Entorno

Frontend (`apps/web/.env`):
```
# Opcional en desarrollo local. En Vercel Services se usa /api del mismo dominio.
# PUBLIC_API_URL=http://localhost:4000
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

Backend (`apps/api/.env`):
```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

### Ejecutar Migración

```bash
# Desde la raíz del proyecto
supabase db push
```

O ejecuta el archivo SQL manualmente en el SQL Editor de Supabase:
`supabase/migrations/0003_geofences.sql`

## Tipos de Geocercas Soportados

- **Polygon**: Polígono irregular (área definida por múltiples puntos)
- **Circle**: Círculo con centro y radio
- **Rectangle**: Rectángulo
- **Polyline**: Línea poligonal (detecta proximidad a la línea)

## Algoritmos de Detección

- **Polígonos**: Algoritmo Ray Casting
- **Círculos**: Cálculo de distancia desde el centro
- **Rectángulos**: Verificación de límites
- **Polilíneas**: Distancia punto a línea con tolerancia configurable

## Consideraciones

- El rastreo requiere que la página esté abierta en el navegador
- La precisión depende del hardware del dispositivo y las condiciones GPS
- Los eventos se verifican cada 5 segundos para balancear precisión y consumo de batería
- Se requiere permiso de ubicación del usuario

## Seguridad

- Las políticas RLS aseguran que cada usuario solo vea sus propias geocercas y eventos
- El backend usa service_role key para operaciones que requieren bypass de RLS
- Los eventos incluyen coordenadas de ubicación y precisión
