-- SnapBite Phase 2: profiles + meals, RLS, indexes.
-- Apply in the Supabase SQL editor (or `supabase db push` if the CLI is linked).
-- Anonymous Auth must also be enabled in Authentication > Providers.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  sex text check (sex in ('female', 'male', 'other')),
  age integer check (age between 13 and 100),
  height_cm numeric check (height_cm between 100 and 250),
  weight_kg numeric check (weight_kg between 30 and 400),
  activity_level text check (
    activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')
  ),
  goal text check (goal in ('lose', 'maintain', 'gain')),
  calorie_target integer check (calorie_target between 1200 and 4000),
  protein_g integer check (protein_g >= 0),
  carbs_g integer check (carbs_g >= 0),
  fat_g integer check (fat_g >= 0),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  logged_at timestamptz not null default now(),
  local_date date not null,
  source text not null check (source in ('text', 'photo', 'both')),
  raw_text text,
  items jsonb not null default '[]'::jsonb,
  calories integer not null default 0 check (calories >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  status text not null default 'confirmed' check (status in ('draft', 'confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meals_user_local_date_idx
  on public.meals (user_id, local_date);

create index if not exists meals_user_logged_at_idx
  on public.meals (user_id, logged_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute procedure public.set_updated_at();

drop trigger if exists meals_set_updated_at on public.meals;
create trigger meals_set_updated_at
  before update on public.meals
  for each row
  execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.meals enable row level security;
alter table public.profiles force row level security;
alter table public.meals force row level security;

revoke all on public.profiles from public, anon;
revoke all on public.meals from public, anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.meals to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
drop policy if exists "meals_select_own" on public.meals;
drop policy if exists "meals_insert_own" on public.meals;
drop policy if exists "meals_update_own" on public.meals;
drop policy if exists "meals_delete_own" on public.meals;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_delete_own"
  on public.profiles for delete to authenticated
  using (id = auth.uid());

create policy "meals_select_own"
  on public.meals for select to authenticated
  using (user_id = auth.uid());

create policy "meals_insert_own"
  on public.meals for insert to authenticated
  with check (user_id = auth.uid());

create policy "meals_update_own"
  on public.meals for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "meals_delete_own"
  on public.meals for delete to authenticated
  using (user_id = auth.uid());
