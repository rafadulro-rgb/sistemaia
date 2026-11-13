-- Google OAuth vía Supabase Auth
-- Los usuarios de Google no tienen contraseña local: password_hash pasa a ser nullable
-- y supabase_id guarda el UUID del usuario en auth.users de Supabase.

alter table public.profiles alter column password_hash drop not null;
alter table public.profiles add column if not exists supabase_id uuid unique;

create index if not exists idx_profiles_supabase_id on public.profiles(supabase_id);
