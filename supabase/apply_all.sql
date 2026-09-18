-- PLIK ZBIORCZY: wszystkie migracje w jednej kolejności, do jednorazowego
-- wklejenia w Supabase SQL Editor. Wygenerowany z plików w supabase/migrations/.
-- Jeśli w przyszłości dodam nowe migracje, uruchamiaj tylko nowe pliki 000X_*.sql,
-- nie ten plik ponownie (część instrukcji nie jest idempotentna).

-- ============================================================
-- 0001_extensions_and_helpers.sql
-- ============================================================
-- Rozszerzenia i funkcje pomocnicze używane w kolejnych migracjach.

create extension if not exists pgcrypto;

-- Automatyczna aktualizacja kolumny updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================
-- 0002_core_tables.sql
-- ============================================================
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


-- ============================================================
-- 0003_assignments.sql
-- ============================================================
-- Przydziały sprzętu do pracowników oraz operacje: pierwsze wydanie, przekazanie, zwrot.
-- Atomowość i blokada dwóch aktywnych przydziałów tego samego sprzętu są wymuszone
-- na poziomie bazy danych (unikalny indeks częściowy + blokada wiersza FOR UPDATE).

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  assigned_at date not null,
  returned_at date,
  assigned_condition public.technical_condition,
  returned_condition public.technical_condition,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint returned_after_assigned check (returned_at is null or returned_at >= assigned_at)
);

create index idx_assignments_equipment on public.assignments(equipment_id);
create index idx_assignments_employee on public.assignments(employee_id);

-- Najważniejsza reguła integralności: tylko jeden aktywny (niezwrócony) przydział
-- na dany sprzęt w danym momencie.
create unique index uq_assignments_one_active_per_equipment
  on public.assignments(equipment_id)
  where returned_at is null;

-- Pierwsze wydanie sprzętu (brak wcześniejszego aktywnego przydziału).
create or replace function public.assign_equipment(
  p_equipment_id uuid,
  p_employee_id uuid,
  p_assigned_at date,
  p_condition public.technical_condition,
  p_notes text default null
)
returns public.assignments
language plpgsql
security invoker
as $$
declare
  v_assignment public.assignments;
begin
  if not public.is_admin() then
    raise exception 'Brak uprawnień do wykonania tej operacji.';
  end if;

  perform 1 from public.equipment where id = p_equipment_id for update;

  if exists (
    select 1 from public.assignments
    where equipment_id = p_equipment_id and returned_at is null
  ) then
    raise exception 'Ten sprzęt ma już aktywny przydział. Użyj operacji "Przekaż sprzęt".';
  end if;

  insert into public.assignments (equipment_id, employee_id, assigned_at, assigned_condition, notes, created_by)
  values (p_equipment_id, p_employee_id, p_assigned_at, p_condition, p_notes, auth.uid())
  returning * into v_assignment;

  update public.equipment set status = 'przydzielony' where id = p_equipment_id;

  return v_assignment;
end;
$$;

-- Przekazanie sprzętu od obecnego do nowego pracownika: zamyka stary przydział
-- i tworzy nowy w jednej transakcji.
create or replace function public.transfer_equipment(
  p_equipment_id uuid,
  p_new_employee_id uuid,
  p_transfer_date date,
  p_returned_condition public.technical_condition,
  p_assigned_condition public.technical_condition,
  p_notes text default null
)
returns public.assignments
language plpgsql
security invoker
as $$
declare
  v_active public.assignments;
  v_new public.assignments;
begin
  if not public.is_admin() then
    raise exception 'Brak uprawnień do wykonania tej operacji.';
  end if;

  perform 1 from public.equipment where id = p_equipment_id for update;

  select * into v_active from public.assignments
    where equipment_id = p_equipment_id and returned_at is null
    for update;

  if v_active.id is null then
    raise exception 'Ten sprzęt nie ma aktywnego przydziału do przekazania. Użyj pierwszego wydania.';
  end if;

  if p_transfer_date < v_active.assigned_at then
    raise exception 'Data przekazania nie może być wcześniejsza niż data przydzielenia.';
  end if;

  update public.assignments
    set returned_at = p_transfer_date, returned_condition = p_returned_condition
    where id = v_active.id;

  insert into public.assignments (equipment_id, employee_id, assigned_at, assigned_condition, notes, created_by)
  values (p_equipment_id, p_new_employee_id, p_transfer_date, p_assigned_condition, p_notes, auth.uid())
  returning * into v_new;

  update public.equipment set status = 'przydzielony' where id = p_equipment_id;

  return v_new;
end;
$$;

-- Zwrot do magazynu: zamyka aktywny przydział bez tworzenia nowego.
create or replace function public.return_equipment(
  p_equipment_id uuid,
  p_return_date date,
  p_returned_condition public.technical_condition,
  p_notes text default null
)
returns public.assignments
language plpgsql
security invoker
as $$
declare
  v_active public.assignments;
begin
  if not public.is_admin() then
    raise exception 'Brak uprawnień do wykonania tej operacji.';
  end if;

  perform 1 from public.equipment where id = p_equipment_id for update;

  select * into v_active from public.assignments
    where equipment_id = p_equipment_id and returned_at is null
    for update;

  if v_active.id is null then
    raise exception 'Ten sprzęt nie ma aktywnego przydziału do zwrotu.';
  end if;

  if p_return_date < v_active.assigned_at then
    raise exception 'Data zwrotu nie może być wcześniejsza niż data przydzielenia.';
  end if;

  update public.assignments
    set returned_at = p_return_date,
        returned_condition = p_returned_condition,
        notes = coalesce(p_notes, notes)
    where id = v_active.id;

  update public.equipment set status = 'w_magazynie' where id = p_equipment_id;

  select * into v_active from public.assignments where id = v_active.id;
  return v_active;
end;
$$;


-- ============================================================
-- 0004_software.sql
-- ============================================================
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


-- ============================================================
-- 0005_protocols.sql
-- ============================================================
-- Protokoły PDF. Dane w protokole są "zamrożone" w momencie utworzenia (snapshot),
-- więc późniejsza zmiana nazwiska pracownika, nazwy sprzętu czy danych firmy
-- nie zmienia treści wcześniej wystawionych dokumentów.

create sequence public.protocol_number_seq start 1;

-- Uwaga: numer jest unikalny i rosnący; nie resetuje się co roku w tej wersji MVP.
create or replace function public.generate_protocol_number()
returns text
language sql
as $$
  select 'PP/' || extract(year from now())::text || '/' || lpad(nextval('public.protocol_number_seq')::text, 5, '0');
$$;

create type public.protocol_type as enum ('wydanie', 'zwrot', 'przekazanie');
create type public.protocol_pdf_status as enum ('oczekuje', 'wygenerowany', 'blad');

create table public.protocols (
  id uuid primary key default gen_random_uuid(),
  protocol_number text not null unique default public.generate_protocol_number(),
  type public.protocol_type not null,
  assignment_id uuid references public.assignments(id) on delete set null,
  issued_by uuid references public.profiles(id),
  issued_by_name text not null,
  issued_at date not null default current_date,
  city text not null,
  -- Migawka danych użytych do wygenerowania dokumentu (firma, osoby, sprzęt, oprogramowanie).
  snapshot jsonb not null,
  pdf_status public.protocol_pdf_status not null default 'oczekuje',
  pdf_path text,
  pdf_error text,
  created_at timestamptz not null default now()
);

create index idx_protocols_assignment on public.protocols(assignment_id);

-- Pozycje (urządzenia) objęte danym protokołem — również jako migawka, nie referencja
-- do bieżącego stanu sprzętu.
create table public.protocol_items (
  id uuid primary key default gen_random_uuid(),
  protocol_id uuid not null references public.protocols(id) on delete cascade,
  equipment_id uuid references public.equipment(id) on delete set null,
  name_snapshot text not null,
  category_snapshot text not null,
  inventory_number_snapshot text not null,
  serial_number_snapshot text
);

create index idx_protocol_items_protocol on public.protocol_items(protocol_id);

comment on column public.protocols.pdf_status is
  'oczekuje = trwa generowanie/do ponowienia; wygenerowany = plik zapisany w Storage; blad = ostatnia próba nieudana. Ponowienie generowania nie tworzy nowego protokolu ani nowego numeru.';


-- ============================================================
-- 0006_audit_log.sql
-- ============================================================
-- Dziennik istotnych operacji: kto, kiedy i co zmienił.

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('utworzenie', 'edycja', 'archiwizacja')),
  changed_by uuid references public.profiles(id),
  changed_at timestamptz not null default now(),
  diff jsonb
);

create index idx_audit_log_record on public.audit_log(table_name, record_id);

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (table_name, record_id, action, changed_by, diff)
    values (tg_table_name, new.id, 'utworzenie', auth.uid(), to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log (table_name, record_id, action, changed_by, diff)
    values (
      tg_table_name, new.id,
      case when (tg_table_name in ('categories', 'employees') and new.is_archived is distinct from old.is_archived)
             or (tg_table_name = 'equipment' and new.status = 'wycofany' and old.status <> 'wycofany')
           then 'archiwizacja' else 'edycja' end,
      auth.uid(),
      jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new))
    );
    return new;
  end if;
  return null;
end;
$$;

create trigger trg_audit_equipment
  after insert or update on public.equipment
  for each row execute function public.write_audit_log();

create trigger trg_audit_employees
  after insert or update on public.employees
  for each row execute function public.write_audit_log();

create trigger trg_audit_categories
  after insert or update on public.categories
  for each row execute function public.write_audit_log();

create trigger trg_audit_assignments
  after insert or update on public.assignments
  for each row execute function public.write_audit_log();


-- ============================================================
-- 0007_rls_policies.sql
-- ============================================================
-- Reguły dostępu (Row Level Security). Każdy dostęp do danych wymaga zalogowania
-- i istnienia wiersza w public.profiles. Rola "podglad" tylko odczytuje dane,
-- rola "administrator" może też je zmieniać. To jest jedyne realne zabezpieczenie —
-- ukrycie przycisków w interfejsie nie zastępuje tych reguł.

alter table public.profiles enable row level security;
alter table public.company_settings enable row level security;
alter table public.categories enable row level security;
alter table public.employees enable row level security;
alter table public.equipment enable row level security;
alter table public.equipment_links enable row level security;
alter table public.assignments enable row level security;
alter table public.software_products enable row level security;
alter table public.software_licenses enable row level security;
alter table public.software_license_assignments enable row level security;
alter table public.equipment_installed_software enable row level security;
alter table public.protocols enable row level security;
alter table public.protocol_items enable row level security;
alter table public.audit_log enable row level security;

-- profiles: użytkownik widzi własny profil; administrator widzi i zarządza wszystkimi.
create policy "profil wlasny" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "admin zarzadza profilami" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- company_settings: odczyt dla każdego zalogowanego, edycja tylko dla administratora.
create policy "odczyt ustawien firmy" on public.company_settings
  for select using (auth.uid() is not null);
create policy "admin edytuje ustawienia firmy" on public.company_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- Wzorzec powtarzany dla większości tabel: odczyt = zalogowany z profilem,
-- zapis/zmiana = wyłącznie administrator.
create policy "odczyt kategorii" on public.categories
  for select using (auth.uid() is not null);
create policy "admin zarzadza kategoriami" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

create policy "odczyt pracownikow" on public.employees
  for select using (auth.uid() is not null);
create policy "admin zarzadza pracownikami" on public.employees
  for all using (public.is_admin()) with check (public.is_admin());

create policy "odczyt sprzetu" on public.equipment
  for select using (auth.uid() is not null);
create policy "admin zarzadza sprzetem" on public.equipment
  for all using (public.is_admin()) with check (public.is_admin());

create policy "odczyt powiazan sprzetu" on public.equipment_links
  for select using (auth.uid() is not null);
create policy "admin zarzadza powiazaniami" on public.equipment_links
  for all using (public.is_admin()) with check (public.is_admin());

create policy "odczyt przydzialow" on public.assignments
  for select using (auth.uid() is not null);
-- Zapis do assignments odbywa się wyłącznie przez funkcje assign_equipment /
-- transfer_equipment / return_equipment (SECURITY INVOKER + własna weryfikacja is_admin()),
-- więc bezpośredni insert/update spoza tych funkcji blokujemy również na poziomie RLS.
create policy "admin zarzadza przydzialami" on public.assignments
  for all using (public.is_admin()) with check (public.is_admin());

create policy "odczyt produktow oprogramowania" on public.software_products
  for select using (auth.uid() is not null);
create policy "admin zarzadza produktami oprogramowania" on public.software_products
  for all using (public.is_admin()) with check (public.is_admin());

create policy "odczyt licencji" on public.software_licenses
  for select using (auth.uid() is not null);
create policy "admin zarzadza licencjami" on public.software_licenses
  for all using (public.is_admin()) with check (public.is_admin());

create policy "odczyt przypisan licencji" on public.software_license_assignments
  for select using (auth.uid() is not null);
create policy "admin zarzadza przypisaniami licencji" on public.software_license_assignments
  for all using (public.is_admin()) with check (public.is_admin());

create policy "odczyt zainstalowanego oprogramowania" on public.equipment_installed_software
  for select using (auth.uid() is not null);
create policy "admin zarzadza zainstalowanym oprogramowaniem" on public.equipment_installed_software
  for all using (public.is_admin()) with check (public.is_admin());

create policy "odczyt protokolow" on public.protocols
  for select using (auth.uid() is not null);
create policy "admin zarzadza protokolami" on public.protocols
  for all using (public.is_admin()) with check (public.is_admin());

create policy "odczyt pozycji protokolow" on public.protocol_items
  for select using (auth.uid() is not null);
create policy "admin zarzadza pozycjami protokolow" on public.protocol_items
  for all using (public.is_admin()) with check (public.is_admin());

-- audit_log: tylko administrator, żeby nie ujawniać historii zmian osobom z rolą podglądu.
create policy "admin czyta dziennik zmian" on public.audit_log
  for select using (public.is_admin());

-- Uwaga: pierwszy profil administratora trzeba utworzyć ręcznie w SQL Editor Supabase
-- (insert into public.profiles ...) po pierwszym logowaniu — patrz README.md, sekcja
-- "Konfiguracja Supabase".


-- ============================================================
-- 0008_storage.sql
-- ============================================================
-- Prywatny magazyn dokumentów (protokoły PDF, podpisane skany).
-- Bucket tworzymy jako prywatny (public = false) — pliki są dostępne wyłącznie
-- przez podpisane, czasowo ograniczone URL-e generowane po stronie serwera dla
-- zalogowanych użytkowników z odpowiednią rolą, nigdy przez stały publiczny link.

insert into storage.buckets (id, name, public)
values ('protokoly', 'protokoly', false)
on conflict (id) do nothing;

create policy "odczyt dokumentow dla zalogowanych" on storage.objects
  for select using (bucket_id = 'protokoly' and auth.uid() is not null);

create policy "admin wgrywa dokumenty" on storage.objects
  for insert with check (bucket_id = 'protokoly' and public.is_admin());

create policy "admin aktualizuje dokumenty" on storage.objects
  for update using (bucket_id = 'protokoly' and public.is_admin());

create policy "admin usuwa dokumenty" on storage.objects
  for delete using (bucket_id = 'protokoly' and public.is_admin());


-- ============================================================
-- 0009_transfer_sets.sql
-- ============================================================
-- Ujednolicona, atomowa operacja przekazania/zwrotu sprzętu — obsługuje pojedynczy
-- sprzęt oraz cały zestaw (kilka urządzeń) w jednej transakcji SQL. Zastępuje
-- wcześniejsze funkcje assign_equipment / transfer_equipment / return_equipment
-- z migracji 0003 (były przygotowane pod pojedynczy sprzęt, jeszcze niepodłączone
-- do interfejsu, więc bezpiecznie je zastępujemy).

drop function if exists public.assign_equipment(uuid, uuid, date, public.technical_condition, text);
drop function if exists public.transfer_equipment(uuid, uuid, date, public.technical_condition, public.technical_condition, text);
drop function if exists public.return_equipment(uuid, date, public.technical_condition, text);

-- p_new_employee_id = NULL oznacza zwrot do magazynu (bez nowego przydziału).
-- Dla każdego elementu z p_equipment_ids: jeśli ma aktywny przydział, zamyka go
-- (pierwsze wydanie pomija ten krok); jeśli podano nowego pracownika, otwiera nowy
-- przydział i ustawia status "przydzielony"; w przeciwnym razie ustawia status
-- "w_magazynie". Cała pętla działa w jednej transakcji funkcji — przekazanie
-- zestawu kilku urządzeń jest więc atomowe (albo wszystko, albo nic).
create or replace function public.transfer_equipment_set(
  p_equipment_ids uuid[],
  p_new_employee_id uuid,
  p_transfer_date date,
  p_condition public.technical_condition,
  p_notes text default null
)
returns setof public.assignments
language plpgsql
security invoker
as $$
declare
  v_equipment_id uuid;
  v_active public.assignments;
  v_new public.assignments;
begin
  if not public.is_admin() then
    raise exception 'Brak uprawnień do wykonania tej operacji.';
  end if;

  if p_equipment_ids is null or array_length(p_equipment_ids, 1) is null then
    raise exception 'Nie wybrano żadnego sprzętu do przekazania.';
  end if;

  foreach v_equipment_id in array p_equipment_ids loop
    perform 1 from public.equipment where id = v_equipment_id for update;

    select * into v_active from public.assignments
      where equipment_id = v_equipment_id and returned_at is null
      for update;

    if v_active.id is not null then
      if p_transfer_date < v_active.assigned_at then
        raise exception 'Data przekazania nie może być wcześniejsza niż data przydzielenia.';
      end if;
      update public.assignments
        set returned_at = p_transfer_date, returned_condition = p_condition
        where id = v_active.id;
    end if;

    if p_new_employee_id is not null then
      insert into public.assignments
        (equipment_id, employee_id, assigned_at, assigned_condition, notes, created_by)
      values
        (v_equipment_id, p_new_employee_id, p_transfer_date, p_condition, p_notes, auth.uid())
      returning * into v_new;
      update public.equipment set status = 'przydzielony' where id = v_equipment_id;
      return next v_new;
    else
      update public.equipment set status = 'w_magazynie' where id = v_equipment_id;
    end if;
  end loop;

  return;
end;
$$;


-- ============================================================
-- 0010_fix_audit_trigger.sql
-- ============================================================
-- Naprawa błędu w dzienniku zmian (audit_log): funkcja write_audit_log (migracja 0006)
-- odwoływała się bezpośrednio do new.is_archived / new.status, które nie istnieją na
-- wszystkich tabelach objętych tym wyzwalaczem (np. "assignments" nie ma is_archived,
-- "equipment" nie ma is_archived). Powodowało to błąd: record "new" has no field
-- "is_archived" przy każdej aktualizacji sprzętu lub przydziału.
-- Naprawa: odczyt przez to_jsonb(...)->>'pole', co bezpiecznie zwraca NULL zamiast
-- błędu, gdy dana tabela nie ma takiej kolumny.

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (table_name, record_id, action, changed_by, diff)
    values (tg_table_name, new.id, 'utworzenie', auth.uid(), to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log (table_name, record_id, action, changed_by, diff)
    values (
      tg_table_name, new.id,
      case
        when tg_table_name in ('categories', 'employees')
             and (to_jsonb(new) ->> 'is_archived') is distinct from (to_jsonb(old) ->> 'is_archived')
          then 'archiwizacja'
        when tg_table_name = 'equipment'
             and (to_jsonb(new) ->> 'status') = 'wycofany'
             and (to_jsonb(old) ->> 'status') is distinct from 'wycofany'
          then 'archiwizacja'
        else 'edycja'
      end,
      auth.uid(),
      jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new))
    );
    return new;
  end if;
  return null;
end;
$$;


-- ============================================================
-- 0011_protocol_scan.sql
-- ============================================================
-- Miejsce na dołączenie podpisanego skanu protokołu (ścieżka w prywatnym Storage).

alter table public.protocols
  add column if not exists signed_scan_path text;


-- ============================================================
-- 0012_locations.sql
-- ============================================================
-- Lokalizacje jako osobny słownik (jak kategorie), zamiast wolnego tekstu.
-- Lokalizacja sprzętu przestaje być polem ręcznie edytowalnym — jest synchronizowana
-- automatycznie z lokalizacją aktualnie przypisanego pracownika (patrz migracja 0013),
-- a przy zwrocie do magazynu ustawiana na specjalną lokalizację "Magazyn".

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_archived boolean not null default false,
  is_warehouse boolean not null default false,
  created_at timestamptz not null default now(),
  unique (name)
);

alter table public.locations enable row level security;

create policy "odczyt lokalizacji" on public.locations
  for select using (auth.uid() is not null);
create policy "admin zarzadza lokalizacjami" on public.locations
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.locations (name, is_warehouse) values ('Magazyn', true)
on conflict (name) do nothing;

-- Migracja istniejących wartości tekstowych na wiersze w tabeli lokalizacji,
-- żeby nie utracić danych już wprowadzonych w systemie.
insert into public.locations (name)
select distinct location from public.employees
where location is not null and trim(location) <> ''
on conflict (name) do nothing;

insert into public.locations (name)
select distinct location from public.equipment
where location is not null and trim(location) <> ''
on conflict (name) do nothing;

alter table public.employees add column location_id uuid references public.locations(id);
update public.employees e set location_id = l.id from public.locations l where l.name = e.location;
update public.employees set location_id = (select id from public.locations where is_warehouse limit 1)
  where location_id is null;
alter table public.employees alter column location_id set not null;
alter table public.employees drop column location;

alter table public.equipment add column location_id uuid references public.locations(id);
update public.equipment e set location_id = l.id from public.locations l where l.name = e.location;
update public.equipment set location_id = (select id from public.locations where is_warehouse limit 1)
  where location_id is null;
alter table public.equipment alter column location_id set not null;
alter table public.equipment drop column location;

create index idx_employees_location on public.employees(location_id);
create index idx_equipment_location on public.equipment(location_id);


-- ============================================================
-- 0013_transfer_syncs_location.sql
-- ============================================================
-- Aktualizacja transfer_equipment_set: lokalizacja sprzętu jest teraz zsynchronizowana
-- automatycznie — przy przekazaniu pracownikowi przyjmuje jego lokalizację, przy zwrocie
-- do magazynu ustawiana jest na lokalizację oznaczoną jako is_warehouse.

create or replace function public.transfer_equipment_set(
  p_equipment_ids uuid[],
  p_new_employee_id uuid,
  p_transfer_date date,
  p_condition public.technical_condition,
  p_notes text default null
)
returns setof public.assignments
language plpgsql
security invoker
as $$
declare
  v_equipment_id uuid;
  v_active public.assignments;
  v_new public.assignments;
  v_new_location_id uuid;
  v_warehouse_location_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Brak uprawnień do wykonania tej operacji.';
  end if;

  if p_equipment_ids is null or array_length(p_equipment_ids, 1) is null then
    raise exception 'Nie wybrano żadnego sprzętu do przekazania.';
  end if;

  if p_new_employee_id is not null then
    select location_id into v_new_location_id from public.employees where id = p_new_employee_id;
  else
    select id into v_warehouse_location_id from public.locations where is_warehouse limit 1;
  end if;

  foreach v_equipment_id in array p_equipment_ids loop
    perform 1 from public.equipment where id = v_equipment_id for update;

    select * into v_active from public.assignments
      where equipment_id = v_equipment_id and returned_at is null
      for update;

    if v_active.id is not null then
      if p_transfer_date < v_active.assigned_at then
        raise exception 'Data przekazania nie może być wcześniejsza niż data przydzielenia.';
      end if;
      update public.assignments
        set returned_at = p_transfer_date, returned_condition = p_condition
        where id = v_active.id;
    end if;

    if p_new_employee_id is not null then
      insert into public.assignments
        (equipment_id, employee_id, assigned_at, assigned_condition, notes, created_by)
      values
        (v_equipment_id, p_new_employee_id, p_transfer_date, p_condition, p_notes, auth.uid())
      returning * into v_new;
      update public.equipment
        set status = 'przydzielony', location_id = coalesce(v_new_location_id, location_id)
        where id = v_equipment_id;
      return next v_new;
    else
      update public.equipment
        set status = 'w_magazynie', location_id = coalesce(v_warehouse_location_id, location_id)
        where id = v_equipment_id;
    end if;
  end loop;

  return;
end;
$$;


-- ============================================================
-- 0014_status_conditions.sql
-- ============================================================
-- Rozszerzenie statusu sprzętu o bardziej szczegółowe stany serwisowe, zamiast
-- osobnego, równoległego pola "Stan" (unikamy dwóch nakładających się źródeł prawdy).
-- "w_magazynie"/"przydzielony" pozostają sterowane automatycznie przez operację
-- "Przekaż sprzęt". Nowe stany "w_naprawie" (zmieniony z "w_serwisie") i "zepsuty"
-- ustawia się ręcznie na liście sprzętu.

alter type public.equipment_status rename value 'w_serwisie' to 'w_naprawie';
alter type public.equipment_status add value if not exists 'zepsuty' after 'w_naprawie';


-- ============================================================
-- 0015_auto_inventory_number.sql
-- ============================================================
-- Automatyczne nadawanie numeru inwentarzowego przy dodawaniu sprzętu (ten sam wzorzec
-- co numeracja protokołów: INW/{rok}/{00001}). Nadal można go ręcznie zmienić później
-- na karcie sprzętu (np. żeby dopasować do istniejącej naklejki inwentarzowej).

create sequence public.equipment_inventory_seq start 1;

create or replace function public.generate_inventory_number()
returns text
language sql
as $$
  select 'INW/' || extract(year from now())::text || '/' || lpad(nextval('public.equipment_inventory_seq')::text, 5, '0');
$$;

alter table public.equipment alter column inventory_number set default public.generate_inventory_number();


-- ============================================================
-- 0016_company_representative.sql
-- ============================================================
-- Osoba reprezentująca firmę (imię i nazwisko) — wyświetlana na protokołach jako
-- strona wydająca/odbierająca w imieniu firmy, zamiast każdorazowo zalogowanego
-- administratora. Konfigurowana raz w Ustawieniach.

alter table public.company_settings
  add column if not exists representative_name text not null default '';


-- ============================================================
-- 0017_inventory_number_format.sql
-- ============================================================
-- Prostszy format numeru inwentarzowego: INW/001, INW/002, ... (bez roku).
-- Ta sama sekwencja co dotychczas — nowe numery kontynuują od bieżącej wartości,
-- stare numery (INW/2026/000xx) pozostają bez zmian w historii.

create or replace function public.generate_inventory_number()
returns text
language sql
as $$
  select 'INW/' || lpad(nextval('public.equipment_inventory_seq')::text, 3, '0');
$$;


-- ============================================================
-- 0018_delete_equipment_via_protocols.sql
-- ============================================================
-- Zmiana zasady blokowania usuwania sprzętu: dotąd blokowała to jakakolwiek historia
-- przydziałów (assignments). Teraz blokują to wyłącznie POWIĄZANE PROTOKOŁY — jeśli
-- admin najpierw usunie protokoły dotyczące danego sprzętu, usunięcie samego sprzętu
-- (wraz z jego historią przydziałów) staje się możliwe.

alter table public.assignments
  drop constraint if exists assignments_equipment_id_fkey;
alter table public.assignments
  add constraint assignments_equipment_id_fkey
  foreign key (equipment_id) references public.equipment(id) on delete cascade;

alter table public.protocol_items
  drop constraint if exists protocol_items_equipment_id_fkey;
alter table public.protocol_items
  add constraint protocol_items_equipment_id_fkey
  foreign key (equipment_id) references public.equipment(id) on delete restrict;


-- ============================================================
-- 0019_technical_condition_nowy.sql
-- ============================================================
-- Dodaje wartość "Nowy" do stanu technicznego sprzętu (najlepszy stan, przed "Bardzo dobry").
alter type public.technical_condition add value if not exists 'nowy' before 'bardzo_dobry';


-- ============================================================
-- 0020_user_management.sql
-- ============================================================
-- Zarządzanie kontami z poziomu aplikacji (zakładka "Użytkownicy", tylko dla administratora):
-- e-mail w profilu (potrzebny do wyświetlenia listy kont bez wywoływania Admin API za
-- każdym razem) oraz lista zakładek widocznych dla konta z rolą "podglad".
-- visible_tabs = null oznacza "brak ograniczeń, widzi wszystkie zakładki" — to bezpieczny
-- domyślny stan dla już istniejących kont, żeby ta migracja nikogo nie zablokowała.
-- Istniejące reguły RLS na public.profiles ("admin zarzadza profilami") już obejmują te
-- nowe kolumny — nie trzeba nic dodawać.

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists visible_tabs text[];

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;


-- ============================================================
-- 0021_employee_phone_optional_fields.sql
-- ============================================================
-- Numer telefonu pracownika (opcjonalny) oraz zniesienie wymogu podawania działu i
-- lokalizacji przy pracowniku — nie każdy pracownik musi mieć przypisany dział/lokalizację.
alter table public.employees add column if not exists phone text;
alter table public.employees alter column department drop not null;
alter table public.employees alter column location_id drop not null;


