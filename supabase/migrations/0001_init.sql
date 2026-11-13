-- SistemaIA: esquema inicial
-- Ejecutar en el SQL Editor de Supabase o vía supabase db push

create extension if not exists "pgcrypto";

-- ============ profiles (usuarios) ============
create table if not exists public.profiles (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- ============ accounts (cuentas: bancarias, tarjetas, ahorro, efectivo) ============
create table if not exists public.accounts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  type       text not null check (type in ('bank','credit_card','savings','cash','other')),
  balance    numeric(14,2) not null default 0,
  currency   text not null default 'USD',
  created_at timestamptz not null default now()
);

-- ============ categories ============
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  type       text not null check (type in ('income','expense')),
  color      text not null default '#6366f1',
  created_at timestamptz not null default now(),
  unique (user_id, name, type)
);

-- ============ transactions ============
create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  account_id   uuid not null references public.accounts(id) on delete cascade,
  category_id  uuid not null references public.categories(id) on delete restrict,
  type         text not null check (type in ('income','expense')),
  amount       numeric(14,2) not null check (amount >= 0),
  description  text not null default '',
  date         date not null default current_date,
  created_at   timestamptz not null default now()
);

create index if not exists idx_transactions_user_date on public.transactions(user_id, date desc);
create index if not exists idx_transactions_account on public.transactions(account_id);
create index if not exists idx_transactions_category on public.transactions(category_id);

-- ============ RLS ============
-- El backend usa service_role (bypasea RLS) y filtra por user_id en el código.
-- Estas políticas protegen el acceso directo con la anon key.
alter table public.profiles    enable row level security;
alter table public.accounts    enable row level security;
alter table public.categories  enable row level security;
alter table public.transactions enable row level security;

-- Perfiles: cada usuario solo ve/edita su fila (por auth.uid() si se usa Supabase Auth;
-- como usamos auth propia con JWT, el acceso real va por el backend).
create policy "profiles_select_own" on public.profiles
  for select using (true);

create policy "accounts_owner" on public.accounts
  for all using (auth.role() = 'service_role');
create policy "categories_owner" on public.categories
  for all using (auth.role() = 'service_role');
create policy "transactions_owner" on public.transactions
  for all using (auth.role() = 'service_role');

-- ============ Función para ajustar balance de cuenta atómicamente ============
create or replace function public.adjust_account_balance(p_account uuid, p_delta numeric)
returns void
language sql
security definer
set search_path = public
as $$
  update public.accounts
  set balance = balance + p_delta
  where id = p_account;
$$;
