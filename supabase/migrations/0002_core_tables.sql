-- Profile użytkowników aplikacji (logowanie przez Supabase Auth), ustawienia firmy,
-- kategorie, pracownicy, sprzęt i powiązania sprzętu.

create type public.app_role as enum ('administrator', 'podglad');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'podglad',
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Profil roli dla każdego zalogowanego użytkownika aplikacji.';

-- Zwraca rolę aktualnie zalogowanego użytkownika (lub null, jeśli brak profilu).
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'administrator';
$$;

create table public.company_settings (
  id boolean primary key default true constraint single_row check (id),
  name text not null default 'Nazwa firmy',
  address text not null default '',
  nip text,
  updated_at timestamptz not null default now()
);
insert into public.company_settings (id) values (true);

create trigger trg_company_settings_updated_at
  before update on public.company_settings
  for each row execute function public.set_updated_at();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (name)
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  department text not null,
  location text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_employees_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

create type public.equipment_status as enum (
  'w_magazynie', 'przydzielony', 'w_serwisie', 'wycofany'
);

create type public.technical_condition as enum (
  'bardzo_dobry', 'dobry', 'dostateczny', 'uszkodzony'
);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  inventory_number text not null,
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  manufacturer text,
  model text,
  serial_number text,
  purchase_date date,
  warranty_end date,
  technical_condition public.technical_condition,
  purchase_price numeric(12, 2),
  status public.equipment_status not null default 'w_magazynie',
  location text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (inventory_number),
  constraint warranty_after_purchase check (
    warranty_end is null or purchase_date is null or warranty_end >= purchase_date
  )
);

create index idx_equipment_category on public.equipment(category_id);
create index idx_equipment_serial on public.equipment(serial_number);

create trigger trg_equipment_updated_at
  before update on public.equipment
  for each row execute function public.set_updated_at();

-- Ostrzeżenie o duplikacie numeru seryjnego jest realizowane w aplikacji (zapytanie
-- przy zapisie formularza) — pole może być puste, więc nie stosujemy tu ograniczenia unique.

create table public.equipment_links (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  linked_equipment_id uuid not null references public.equipment(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint no_self_link check (equipment_id <> linked_equipment_id),
  -- Powiązanie zapisywane jest raz, symetrycznie odczytywane w obie strony.
  unique (equipment_id, linked_equipment_id)
);

create index idx_equipment_links_equipment on public.equipment_links(equipment_id);
create index idx_equipment_links_linked on public.equipment_links(linked_equipment_id);
