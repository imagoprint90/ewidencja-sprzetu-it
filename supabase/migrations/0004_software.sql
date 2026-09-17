-- Katalog produktów oprogramowania, rejestr licencji i ich przypisań,
-- oraz osobno: co jest faktycznie zainstalowane na sprzęcie.
-- Uwaga: celowo brak kolumny na klucz aktywacyjny — nie przechowujemy tajnych danych licencji.

create table public.software_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version text,
  notes text,
  created_at timestamptz not null default now()
);

create type public.license_type as enum ('urzadzenie', 'uzytkownik');

create table public.software_licenses (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.software_products(id) on delete restrict,
  license_type public.license_type not null,
  seats_total integer not null check (seats_total > 0),
  valid_until date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.software_license_assignments (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.software_licenses(id) on delete cascade,
  equipment_id uuid references public.equipment(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  constraint exactly_one_target check (
    (equipment_id is not null and employee_id is null) or
    (equipment_id is null and employee_id is not null)
  )
);

create index idx_license_assignments_license on public.software_license_assignments(license_id);

-- Wymusza zgodność typu licencji z celem przypisania oraz limit dostępnych stanowisk.
create or replace function public.check_license_assignment()
returns trigger
language plpgsql
as $$
declare
  v_license public.software_licenses;
  v_used integer;
begin
  select * into v_license from public.software_licenses where id = new.license_id for update;

  if v_license.license_type = 'urzadzenie' and new.equipment_id is null then
    raise exception 'Ta licencja jest przypisywana do urządzeń, nie do pracowników.';
  end if;
  if v_license.license_type = 'uzytkownik' and new.employee_id is null then
    raise exception 'Ta licencja jest przypisywana do pracowników, nie do urządzeń.';
  end if;

  select count(*) into v_used
  from public.software_license_assignments
  where license_id = new.license_id and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if v_used >= v_license.seats_total then
    raise exception 'Brak wolnych stanowisk dla tej licencji (limit: %, zajęte: %).', v_license.seats_total, v_used;
  end if;

  return new;
end;
$$;

create trigger trg_check_license_assignment
  before insert or update on public.software_license_assignments
  for each row execute function public.check_license_assignment();

-- Co jest zainstalowane na danym sprzęcie — niezależnie od tego, czy jest objęte licencją.
create table public.equipment_installed_software (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  software_product_id uuid not null references public.software_products(id) on delete restrict,
  installed_at timestamptz not null default now(),
  notes text,
  unique (equipment_id, software_product_id)
);
