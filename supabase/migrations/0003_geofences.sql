-- Sistema de Geocercas (Geofences)
-- Permite dibujar, guardar geocercas y detectar entrada/salida de usuarios

-- ============ geofences (geocercas) ============
create table if not exists public.geofences (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  geojson    jsonb not null, -- Coordenadas de la geocerca en formato GeoJSON
  type       text not null check (type in ('polygon','circle','rectangle','polyline')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_geofences_user on public.geofences(user_id);
create index if not exists idx_geofences_active on public.geofences(is_active) where is_active = true;

-- ============ geofence_events (eventos de entrada/salida) ============
create table if not exists public.geofence_events (
  id           uuid primary key default gen_random_uuid(),
  geofence_id  uuid not null references public.geofences(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  event_type   text not null check (event_type in ('enter','exit')),
  latitude     numeric(10, 7) not null,
  longitude    numeric(10, 7) not null,
  accuracy     numeric(10, 2), -- Precisión de la ubicación en metros
  occurred_at  timestamptz not null default now()
);

create index if not exists idx_geofence_events_geofence on public.geofence_events(geofence_id);
create index if not exists idx_geofence_events_user on public.geofence_events(user_id);
create index if not exists idx_geofence_events_time on public.geofence_events(occurred_at desc);
create index if not exists idx_geofence_events_type on public.geofence_events(event_type);

-- ============ RLS ============
alter table public.geofences enable row level security;
alter table public.geofence_events enable row level security;

-- Políticas para geofences
create policy "geofences_select_own" on public.geofences
  for select using (auth.role() = 'service_role' or user_id = auth.uid());

create policy "geofences_insert_own" on public.geofences
  for insert with check (auth.role() = 'service_role' or user_id = auth.uid());

create policy "geofences_update_own" on public.geofences
  for update using (auth.role() = 'service_role' or user_id = auth.uid());

create policy "geofences_delete_own" on public.geofences
  for delete using (auth.role() = 'service_role' or user_id = auth.uid());

-- Políticas para geofence_events
create policy "geofence_events_select_own" on public.geofence_events
  for select using (auth.role() = 'service_role' or user_id = auth.uid());

create policy "geofence_events_insert_own" on public.geofence_events
  for insert with check (auth.role() = 'service_role' or user_id = auth.uid());

-- ============ Trigger para actualizar updated_at ============
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_geofences_update
  before update on public.geofences
  for each row
  execute function public.update_updated_at_column();

-- ============ Función auxiliar para verificar si un punto está dentro de un polígono ============
create or replace function public.point_in_polygon(
  lat numeric,
  lng numeric,
  polygon_coords jsonb
)
returns boolean
language plpgsql
as $$
declare
  coord jsonb;
  x numeric;
  y numeric;
  i integer;
  j integer;
  inside boolean := false;
  poly_x numeric[];
  poly_y numeric[];
begin
  -- Extraer coordenadas del polígono GeoJSON
  for coord in select * from jsonb_array_elements(polygon_coords) loop
    x := (coord->0)::numeric;
    y := (coord->1)::numeric;
    poly_x := array_append(poly_x, x);
    poly_y := array_append(poly_y, y);
  end loop;

  -- Algoritmo Ray Casting
  i := 0;
  j := array_length(poly_x, 1) - 1;
  while i < array_length(poly_x, 1) loop
    if ((poly_y[i] > lat) != (poly_y[j] > lat)) and
       (lng < (poly_x[j] - poly_x[i]) * (lat - poly_y[i]) / (poly_y[j] - poly_y[i]) + poly_x[i]) then
      inside := not inside;
    end if;
    j := i;
    i := i + 1;
  end loop;

  return inside;
end;
$$;

-- ============ Función para verificar si un punto está dentro de un círculo ============
create or replace function public.point_in_circle(
  lat numeric,
  lng numeric,
  center_lat numeric,
  center_lng numeric,
  radius_meters numeric
)
returns boolean
language sql
as $$
  select (6371000 * acos(
    cos(radians(lat)) * cos(radians(center_lat)) *
    cos(radians(center_lng) - radians(lng)) +
    sin(radians(lat)) * sin(radians(center_lat))
  )) <= radius_meters;
$$;
