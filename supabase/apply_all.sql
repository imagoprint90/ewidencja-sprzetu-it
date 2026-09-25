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


-- ============================================================
-- 0022_employee_first_last_name.sql
-- ============================================================
-- Rozdzielenie "Imię i nazwisko" pracownika na osobne kolumny first_name / last_name
-- (dotyczy tylko public.employees — profiles.full_name to konta logowania do aplikacji,
-- osobna sprawa, tego nie ruszamy).
alter table public.employees add column if not exists first_name text;
alter table public.employees add column if not exists last_name text;

update public.employees
set first_name = coalesce(nullif(split_part(full_name, ' ', 1), ''), full_name),
    last_name = nullif(trim(substring(full_name from position(' ' in full_name) + 1)), '')
where first_name is null;

alter table public.employees alter column first_name set not null;
alter table public.employees drop column full_name;


-- ============================================================
-- 0023_equipment_editor_role.sql
-- ============================================================
-- Nowa rola "edycja_podglad": może edytować i widzieć TYLKO sprzęt z przypisanych jej
-- kategorii (kolumna visible_categories, analogicznie do visible_tabs dla zakładek).
-- Reguły RLS wykorzystujące tę wartość enuma są w osobnym pliku (0024) — Postgres nie
-- pozwala użyć nowej wartości enuma w tej samej transakcji, w której ją dodano.
alter type public.app_role add value if not exists 'edycja_podglad';

alter table public.profiles add column if not exists visible_categories uuid[];


-- ============================================================
-- 0024_equipment_editor_role_rls.sql
-- ============================================================
-- Reguły RLS dla nowej roli "edycja_podglad" (patrz 0023) — może odczytywać i aktualizować
-- WYŁĄCZNIE sprzęt, którego kategoria jest w jej visible_categories. Administrator i rola
-- "podglad" nie są tym ograniczeniem objęte (podglad nadal widzi cały sprzęt, tylko bez prawa
-- edycji — ograniczenie kategorii dotyczy tylko tej jednej, nowej roli).

create or replace function public.equipment_category_visible(p_category_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_role() = 'administrator'
    or public.current_app_role() <> 'edycja_podglad'
    or p_category_id = any(
      coalesce(
        (select visible_categories from public.profiles where id = auth.uid()),
        array[]::uuid[]
      )
    );
$$;

drop policy if exists "odczyt sprzetu" on public.equipment;
create policy "odczyt sprzetu" on public.equipment
  for select using (auth.uid() is not null and public.equipment_category_visible(category_id));

-- "admin zarzadza sprzetem" (insert/update/delete dla administratora) zostaje bez zmian —
-- to osobna, permissywna polityka, więc admin nadal ma pełny dostęp niezależnie od poniższej.
create policy "edycja_podglad aktualizuje sprzet w swoich kategoriach" on public.equipment
  for update
  using (public.current_app_role() = 'edycja_podglad' and public.equipment_category_visible(category_id))
  with check (public.current_app_role() = 'edycja_podglad' and public.equipment_category_visible(category_id));


-- ============================================================
-- 0025_multi_role_permissions.sql
-- ============================================================
-- Zamiast pojedynczej roli na konto, uprawnienia stają się addytywne: każde konto ma rolę
-- bazową (administrator = pełny dostęp wszędzie, albo podglad = tylko odczyt), a do tego
-- dowolną kombinację dodatkowych uprawnień:
-- - can_edit_equipment: dodawanie/edycja/usuwanie sprzętu, wyłącznie w kategoriach z
--   visible_categories (jak poprzednio rola "edycja_podglad", teraz jako osobna flaga,
--   którą można łączyć z poniższą).
-- - can_transfer_equipment: operacja "Przekaż sprzęt" (przekazanie/zwrot) i generowanie
--   protokołów, plus wgląd/usuwanie WYŁĄCZNIE WŁASNYCH wystawionych protokołów.
-- Wartość enuma 'edycja_podglad' (dodana w 0023) zostaje w typie — Postgres nie pozwala
-- usuwać wartości enuma — ale przestaje być używana jako wskaźnik roli: istniejące konta z tą
-- wartością są tu migrowane na podglad + can_edit_equipment = true.

alter table public.profiles add column if not exists can_edit_equipment boolean not null default false;
alter table public.profiles add column if not exists can_transfer_equipment boolean not null default false;

update public.profiles
set role = 'podglad', can_edit_equipment = true
where role = 'edycja_podglad';

create or replace function public.can_edit_equipment()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or coalesce((select can_edit_equipment from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.can_transfer_equipment()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or coalesce((select can_transfer_equipment from public.profiles where id = auth.uid()), false);
$$;

-- Zastępuje equipment_category_visible z 0024 — teraz sprawdza flagę can_edit_equipment
-- zamiast konkretnej wartości roli, więc obsługuje dowolną kombinację uprawnień.
create or replace function public.equipment_category_visible(p_category_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or not coalesce((select can_edit_equipment from public.profiles where id = auth.uid()), false)
    or p_category_id = any(
      coalesce(
        (select visible_categories from public.profiles where id = auth.uid()),
        array[]::uuid[]
      )
    );
$$;

-- Sprzęt: "odczyt sprzetu" z 0024 zostaje bez zmian w treści (korzysta teraz automatycznie
-- z nowej equipment_category_visible). Zastępujemy tylko politykę zapisu — teraz obejmuje
-- insert/update/delete (wcześniej tylko update), nadal ograniczoną do własnych kategorii.
drop policy if exists "edycja_podglad aktualizuje sprzet w swoich kategoriach" on public.equipment;
create policy "can_edit_equipment zarzadza sprzetem w swoich kategoriach" on public.equipment
  for all
  using (public.can_edit_equipment() and public.equipment_category_visible(category_id))
  with check (public.can_edit_equipment() and public.equipment_category_visible(category_id));

-- Przekazanie/zwrot sprzętu: funkcja staje się SECURITY DEFINER (zamiast polegać na
-- uprawnieniach RLS wywołującego na assignments/equipment) — autoryzacja jest sprawdzana
-- jawnie na początku funkcji, więc konto z can_transfer_equipment nie potrzebuje szerokich,
-- bezpośrednich uprawnień zapisu do tych tabel.
create or replace function public.transfer_equipment_set(
  p_equipment_ids uuid[],
  p_new_employee_id uuid,
  p_transfer_date date,
  p_condition public.technical_condition,
  p_notes text default null
)
returns setof public.assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_equipment_id uuid;
  v_active public.assignments;
  v_new public.assignments;
  v_new_location_id uuid;
  v_warehouse_location_id uuid;
begin
  if not (public.is_admin() or public.can_transfer_equipment()) then
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

-- Protokoły: administrator zarządza wszystkimi (bez zmian, polityka "admin zarzadza
-- protokolami" z 0007 zostaje). Dochodzi tworzenie nowych oraz wgląd/usuwanie WYŁĄCZNIE
-- WŁASNYCH dla can_transfer_equipment — odczyt wszystkich protokołów pozostaje bez zmian
-- (polityka "odczyt protokolow" z 0007), to ograniczenie dotyczy tylko zapisu.
create policy "przekazywanie tworzy protokoly" on public.protocols
  for insert
  with check (public.can_transfer_equipment() and issued_by = auth.uid());

create policy "przekazywanie aktualizuje wlasne protokoly" on public.protocols
  for update
  using (public.can_transfer_equipment() and issued_by = auth.uid())
  with check (public.can_transfer_equipment() and issued_by = auth.uid());

create policy "przekazywanie usuwa wlasne protokoly" on public.protocols
  for delete
  using (public.can_transfer_equipment() and issued_by = auth.uid());

create policy "przekazywanie zarzadza pozycjami wlasnych protokolow" on public.protocol_items
  for all
  using (
    public.can_transfer_equipment()
    and exists (select 1 from public.protocols p where p.id = protocol_id and p.issued_by = auth.uid())
  )
  with check (
    public.can_transfer_equipment()
    and exists (select 1 from public.protocols p where p.id = protocol_id and p.issued_by = auth.uid())
  );

-- Magazyn plików protokołów: can_transfer_equipment potrzebuje wgrywać/aktualizować/usuwać
-- pliki (generowanie PDF, podpisany skan, usuwanie własnego protokołu).
drop policy if exists "admin wgrywa dokumenty" on storage.objects;
create policy "wgrywanie dokumentow protokolow" on storage.objects
  for insert with check (bucket_id = 'protokoly' and (public.is_admin() or public.can_transfer_equipment()));

drop policy if exists "admin aktualizuje dokumenty" on storage.objects;
create policy "aktualizacja dokumentow protokolow" on storage.objects
  for update using (bucket_id = 'protokoly' and (public.is_admin() or public.can_transfer_equipment()));

drop policy if exists "admin usuwa dokumenty" on storage.objects;
create policy "usuwanie dokumentow protokolow" on storage.objects
  for delete using (bucket_id = 'protokoly' and (public.is_admin() or public.can_transfer_equipment()));


-- ============================================================
-- 0026_protocol_category_visibility.sql
-- ============================================================
-- Zakładka Protokoły dla kont standardowych (rola "podglad", niezależnie od tego, czy mają
-- włączone dodatkowe uprawnienia "Edycja i podgląd sprzętu" / "Przekazywanie sprzętu") jest
-- teraz ograniczona do protokołów, które zawierają choć jedną pozycję sprzętu z kategorii
-- przypisanej temu kontu (profiles.visible_categories). Brak przypisanych kategorii = brak
-- widocznych protokołów. Administrator widzi wszystkie protokoły bez zmian.
--
-- Kategorię pozycji protokołu ustalamy z aktualnego sprzętu (protocol_items.equipment_id →
-- equipment.category_id), a jeśli sprzęt został od tego czasu usunięty (equipment_id is null),
-- z zamrożonej nazwy kategorii w migawce (category_snapshot), dopasowanej do bieżącej tabeli
-- categories po nazwie.
--
-- Uwaga: to jest zmiana zachowania dla już istniejących kont standardowych bez przypisanych
-- kategorii — po zastosowaniu tego pliku przestaną widzieć jakiekolwiek protokoły, dopóki
-- administrator nie przypisze im kategorii w zakładce Użytkownicy.

create or replace function public.protocol_category_visible(p_protocol_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.protocol_items pi
      left join public.equipment e on e.id = pi.equipment_id
      left join public.categories c on c.name = pi.category_snapshot
      where pi.protocol_id = p_protocol_id
        and coalesce(e.category_id, c.id) = any(
          coalesce(
            (select visible_categories from public.profiles where id = auth.uid()),
            array[]::uuid[]
          )
        )
    );
$$;

drop policy if exists "odczyt protokolow" on public.protocols;
create policy "odczyt protokolow w swoich kategoriach" on public.protocols
  for select using (public.protocol_category_visible(id));

drop policy if exists "odczyt pozycji protokolow" on public.protocol_items;
create policy "odczyt pozycji protokolow w swoich kategoriach" on public.protocol_items
  for select using (public.protocol_category_visible(protocol_id));


-- ============================================================
-- 0027_fix_own_protocol_visibility.sql
-- ============================================================
-- Poprawka do 0026: konto z uprawnieniem "Przekazywanie sprzętu" musi zawsze widzieć (i móc
-- zarządzać) protokoły, które SAMO wystawiło — niezależnie od tego, czy sprzęt na protokole
-- należy do jego przypisanych kategorii. Bez tego wyjątku 0026 psuło cały przepływ
-- "Przekaż sprzęt": operacja przydziału się udawała (transfer_equipment_set nie zależy od
-- kategorii), ale utworzony właśnie protokół natychmiast znikał kontu z widoku (polityka
-- SELECT z 0026 go odrzucała), a ponieważ RLS na protocol_items sprawdzało istnienie
-- protokołu przez zwykłe zapytanie (podlegające tej samej, teraz zawężonej, polityce SELECT
-- na protocols), zapis pozycji protokołu też się nie udawał — mimo braku widocznego błędu w
-- interfejsie (osobny problem, naprawiony w PrzekazForm.tsx).

-- Funkcja pomocnicza (SECURITY DEFINER = nie podlega RLS na protocols), żeby sprawdzenie
-- "czy to mój protokół" w politykach protocol_items nie zależało od tego, czy dany protokół
-- jest akurat widoczny przez politykę SELECT na protocols (unika cyklicznego zawężania).
create or replace function public.protocol_owned_by_caller(p_protocol_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.protocols where id = p_protocol_id and issued_by = auth.uid()
  );
$$;

drop policy if exists "odczyt protokolow w swoich kategoriach" on public.protocols;
create policy "odczyt protokolow w swoich kategoriach lub wlasnych" on public.protocols
  for select using (
    public.protocol_category_visible(id)
    or (public.can_transfer_equipment() and issued_by = auth.uid())
  );

drop policy if exists "odczyt pozycji protokolow w swoich kategoriach" on public.protocol_items;
create policy "odczyt pozycji protokolow w swoich kategoriach lub wlasnych" on public.protocol_items
  for select using (
    public.protocol_category_visible(protocol_id)
    or (public.can_transfer_equipment() and public.protocol_owned_by_caller(protocol_id))
  );

-- Zastępuje politykę zapisu z 0025 — ten sam warunek "własny protokół", ale przez funkcję
-- SECURITY DEFINER zamiast bezpośredniego podzapytania do protocols (które podlegałoby jego
-- politykom SELECT i mogłoby fałszywie odrzucić zapis tuż po utworzeniu protokołu).
drop policy if exists "przekazywanie zarzadza pozycjami wlasnych protokolow" on public.protocol_items;
create policy "przekazywanie zarzadza pozycjami wlasnych protokolow" on public.protocol_items
  for all
  using (public.can_transfer_equipment() and public.protocol_owned_by_caller(protocol_id))
  with check (public.can_transfer_equipment() and public.protocol_owned_by_caller(protocol_id));


-- ============================================================
-- 0028_equipment_purchase_invoice.sql
-- ============================================================
-- Faktura zakupu jako załącznik PDF do karty sprzętu. Plik trzymamy w prywatnym Storage
-- (jak protokoły), a w equipment tylko ścieżkę do niego — pusta ścieżka = brak faktury,
-- pokazywana w tabeli Sprzęt jako pusta kolumna "FV" (ikonka pojawia się tylko gdy faktura
-- jest załączona).

alter table public.equipment add column if not exists purchase_invoice_path text;

insert into storage.buckets (id, name, public)
values ('faktury', 'faktury', false)
on conflict (id) do nothing;

create policy "odczyt faktur dla zalogowanych" on storage.objects
  for select using (bucket_id = 'faktury' and auth.uid() is not null);

-- Wgrywanie/aktualizacja/usuwanie faktur — te same uprawnienia co edycja karty sprzętu
-- (administrator albo can_edit_equipment). Bez zawężenia do konkretnej kategorii na poziomie
-- Storage (jak w przypadku protokołów) — właściwe zawężenie kategorii pilnuje sama tabela
-- equipment przy zapisie ścieżki faktury (kolumna purchase_invoice_path).
create policy "edycja sprzetu wgrywa faktury" on storage.objects
  for insert with check (bucket_id = 'faktury' and (public.is_admin() or public.can_edit_equipment()));

create policy "edycja sprzetu aktualizuje faktury" on storage.objects
  for update using (bucket_id = 'faktury' and (public.is_admin() or public.can_edit_equipment()));

create policy "edycja sprzetu usuwa faktury" on storage.objects
  for delete using (bucket_id = 'faktury' and (public.is_admin() or public.can_edit_equipment()));


-- ============================================================
-- 0029_notifications.sql
-- ============================================================
-- Zakładka "Powiadomienia" (na razie wyłącznie ręczne wysyłanie, bez automatycznych
-- wyzwalaczy) — szablony wielokrotnego użytku oraz historia wysłanych maili do pracowników.
-- Wysyłka odbywa się przez SMTP skrzynki administratora (nodemailer), nie przez samą bazę — tu tylko
-- przechowujemy treść szablonów i log tego, co i do kogo zostało wysłane.
-- Dostęp wyłącznie dla administratora (tak jak zakładka Użytkownicy) — to nowa, wrażliwa
-- funkcja (wysyłka maili w imieniu firmy), więc na start bez dodatkowych ról.

create type public.notification_status as enum ('wyslano', 'blad');

create table public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_notification_templates_updated_at
  before update on public.notification_templates
  for each row execute function public.set_updated_at();

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete set null,
  -- Migawka danych pracownika w chwili wysyłki — historia zostaje czytelna nawet po
  -- usunięciu pracownika albo zmianie jego adresu e-mail.
  employee_name_snapshot text not null,
  employee_email_snapshot text not null,
  template_id uuid references public.notification_templates(id) on delete set null,
  template_name_snapshot text,
  subject text not null,
  body text not null,
  status public.notification_status not null,
  error_message text,
  sent_by uuid references public.profiles(id),
  sent_by_name text not null,
  created_at timestamptz not null default now()
);

create index idx_notification_log_employee on public.notification_log(employee_id);

alter table public.notification_templates enable row level security;
alter table public.notification_log enable row level security;

create policy "admin zarzadza szablonami powiadomien" on public.notification_templates
  for all using (public.is_admin()) with check (public.is_admin());

create policy "admin zarzadza logiem powiadomien" on public.notification_log
  for all using (public.is_admin()) with check (public.is_admin());


-- ============================================================
-- 0030_notification_schedules.sql
-- ============================================================
-- Automatyczna wysyłka powiadomień: harmonogramy "wyślij szablon X do wybranych pracowników,
-- w wybrane dni tygodnia (opcjonalnie o preferowanej porze)". Sprawdzane raz dziennie przez
-- zadanie cron (Vercel Cron, patrz vercel.json i
-- src/app/api/cron/notification-schedules/route.ts) — sama baza niczego nie wysyła.
--
-- Uwaga: plan Vercel Hobby pozwala na cron co najwyżej raz dziennie (częstsze wywołania
-- Vercel odrzuca już przy wdrożeniu), więc last_sent_date pilnuje, żeby nie wysłać dwa razy
-- tego samego dnia — a send_time jest na razie "preferowaną porą" w UI, nie gwarantowaną
-- minutą wysyłki (patrz komentarz w route.ts).

create table public.notification_schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- restrict (nie cascade) — usunięcie szablonu używanego w aktywnym harmonogramie nie może
  -- po cichu skasować tego harmonogramu; admin musi najpierw usunąć/zmienić harmonogram.
  template_id uuid not null references public.notification_templates(id) on delete restrict,
  employee_ids uuid[] not null,
  send_time time not null,
  -- Dni tygodnia w numeracji ISO-8601: 1 = poniedziałek ... 7 = niedziela.
  days_of_week smallint[] not null,
  is_active boolean not null default true,
  last_sent_date date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_notification_schedules_updated_at
  before update on public.notification_schedules
  for each row execute function public.set_updated_at();

alter table public.notification_schedules enable row level security;

create policy "admin zarzadza harmonogramami powiadomien" on public.notification_schedules
  for all using (public.is_admin()) with check (public.is_admin());

-- Powiązanie z historią: wpis w notification_log dostaje schedule_id, jeśli powstał
-- automatycznie z harmonogramu (null = wysłane ręcznie z zakładki "Wyślij").
alter table public.notification_log add column if not exists schedule_id
  uuid references public.notification_schedules(id) on delete set null;


-- ============================================================
-- 0031_departments.sql
-- ============================================================
-- Działy jako osobny słownik (jak lokalizacje), zamiast wolnego tekstu — dział pracownika
-- jest teraz przypisywany z góry ustalonej listy zarządzanej w zakładce Lokalizacje -> Działy,
-- a nie wpisywany ręcznie przy każdym pracowniku.

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (name)
);

alter table public.departments enable row level security;

create policy "odczyt dzialow" on public.departments
  for select using (auth.uid() is not null);
create policy "admin zarzadza dzialami" on public.departments
  for all using (public.is_admin()) with check (public.is_admin());

-- Migracja istniejących wartości tekstowych na wiersze w tabeli działów, żeby nie utracić
-- danych już wprowadzonych w systemie.
insert into public.departments (name)
select distinct department from public.employees
where department is not null and trim(department) <> ''
on conflict (name) do nothing;

alter table public.employees add column department_id uuid references public.departments(id);
update public.employees e set department_id = d.id from public.departments d where d.name = e.department;
alter table public.employees drop column department;

create index idx_employees_department on public.employees(department_id);




-- ============================================================
-- 0032_equipment_domain.sql
-- ============================================================
-- Pole "Domena" przy sprzęcie: TAK/NIE — czy dane urządzenie jest w domenie.
-- Istniejący sprzęt dostaje domyślnie NIE (do ręcznego uzupełnienia).

alter table public.equipment add column if not exists in_domain boolean not null default false;


-- ============================================================
-- 0033_license_history.sql
-- ============================================================
-- Historia przypisań licencji oprogramowania: kto/kiedy przypisał licencję do komputera
-- (lub pracownika) i kiedy przypisanie zostało usunięte — dzięki temu widać, jak licencja
-- była przenoszona między komputerami. Wpisy tworzy wyzwalacz na software_license_assignments
-- (łapie też usunięcia kaskadowe, np. po usunięciu sprzętu), z migawką nazw, żeby historia
-- została czytelna nawet po usunięciu sprzętu/pracownika/licencji.

create table public.license_assignment_history (
  id uuid primary key default gen_random_uuid(),
  license_id uuid,
  product_name text not null,
  license_type text not null,
  action text not null check (action in ('przypisano', 'usunieto')),
  equipment_id uuid,
  equipment_name text,
  employee_id uuid,
  employee_name text,
  actor_name text,
  happened_at timestamptz not null default now()
);

create index idx_license_history_license on public.license_assignment_history(license_id);

alter table public.license_assignment_history enable row level security;

create policy "odczyt historii licencji" on public.license_assignment_history
  for select using (auth.uid() is not null);

create or replace function public.log_license_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.software_license_assignments;
  v_product text;
  v_type text;
  v_eq text;
  v_emp text;
  v_actor text;
  v_time timestamptz;
begin
  if tg_op = 'DELETE' then r := old; v_time := now(); else r := new; v_time := new.assigned_at; end if;

  select coalesce(p.name || coalesce(' ' || p.version, ''), '(usunięty produkt)'), l.license_type::text
    into v_product, v_type
    from public.software_licenses l
    left join public.software_products p on p.id = l.product_id
    where l.id = r.license_id;

  if r.equipment_id is not null then
    select name || ' (' || inventory_number || ')' into v_eq from public.equipment where id = r.equipment_id;
  end if;
  if r.employee_id is not null then
    select trim(first_name || ' ' || coalesce(last_name, '')) into v_emp from public.employees where id = r.employee_id;
  end if;
  select full_name into v_actor from public.profiles where id = auth.uid();

  insert into public.license_assignment_history
    (license_id, product_name, license_type, action, equipment_id, equipment_name, employee_id, employee_name, actor_name, happened_at)
  values
    (r.license_id, coalesce(v_product, '(usunięta licencja)'), coalesce(v_type, ''),
     case when tg_op = 'DELETE' then 'usunieto' else 'przypisano' end,
     r.equipment_id, v_eq, r.employee_id, v_emp, v_actor, v_time);

  return null;
end;
$$;

create trigger trg_log_license_assignment
  after insert or delete on public.software_license_assignments
  for each row execute function public.log_license_assignment();

-- Istniejące przypisania trafiają do historii jako "przypisano" (data z assigned_at).
insert into public.license_assignment_history
  (license_id, product_name, license_type, action, equipment_id, equipment_name, employee_id, employee_name, happened_at)
select a.license_id,
       coalesce(p.name || coalesce(' ' || p.version, ''), '(usunięty produkt)'),
       l.license_type::text,
       'przypisano',
       a.equipment_id,
       case when e.id is not null then e.name || ' (' || e.inventory_number || ')' end,
       a.employee_id,
       case when emp.id is not null then trim(emp.first_name || ' ' || coalesce(emp.last_name, '')) end,
       a.assigned_at
from public.software_license_assignments a
join public.software_licenses l on l.id = a.license_id
left join public.software_products p on p.id = l.product_id
left join public.equipment e on e.id = a.equipment_id
left join public.employees emp on emp.id = a.employee_id;


-- ============================================================
-- 0034_license_purchase_invoice_key.sql
-- ============================================================
-- Licencje oprogramowania: data zakupu, faktura VAT (PDF w prywatnym Storage, ten sam bucket
-- "faktury" co faktury sprzętu, ścieżki licencje/<id>.pdf) oraz klucz licencji.
--
-- Klucz trzymamy w OSOBNEJ tabeli z dostępem wyłącznie dla administratora (RLS) — zwykłe
-- zapytania o licencje (które widzą wszyscy zalogowani) w ogóle go nie zawierają, a aplikacja
-- pobiera go dopiero na żądanie ("Pokaż"/"Kopiuj"), nie razem z listą licencji.

alter table public.software_licenses add column if not exists purchase_date date;
alter table public.software_licenses add column if not exists invoice_path text;

create table public.license_keys (
  license_id uuid primary key references public.software_licenses(id) on delete cascade,
  license_key text not null,
  updated_at timestamptz not null default now()
);

alter table public.license_keys enable row level security;

create policy "admin zarzadza kluczami licencji" on public.license_keys
  for all using (public.is_admin()) with check (public.is_admin());

-- Ręczna kolejność kategorii sprzętu (przeciągnij i upuść w zakładce Kategorie).
alter table public.categories add column if not exists sort_order integer not null default 0;

-- Początkowa kolejność: alfabetyczna (tylko tam, gdzie kolejność nie była jeszcze ustawiona).
with ranked as (
  select id, row_number() over (order by name) as rn from public.categories
)
update public.categories c
set sort_order = ranked.rn
from ranked
where c.id = ranked.id and c.sort_order = 0;

-- Przekazanie bez protokołu: takie przydziały nie trafiają do historii.
-- Kolumna no_history oznacza przydział wykonany bez protokołu. Taki wiersz istnieje tylko,
-- dopóki jest aktywny — przy kolejnym przekazaniu/zwrocie jest usuwany zamiast zamykany,
-- a jego utworzenie nie jest zapisywane w dzienniku zmian (audit_log).
alter table public.assignments add column if not exists no_history boolean not null default false;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'assignments' and coalesce((to_jsonb(new)->>'no_history')::boolean, false) then
    return new;
  end if;
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

drop function if exists public.transfer_equipment_set(uuid[], uuid, date, public.technical_condition, text);

create or replace function public.transfer_equipment_set(
  p_equipment_ids uuid[],
  p_new_employee_id uuid,
  p_transfer_date date,
  p_condition public.technical_condition,
  p_notes text default null,
  p_skip_history boolean default false
)
returns setof public.assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_equipment_id uuid;
  v_active public.assignments;
  v_new public.assignments;
  v_new_location_id uuid;
  v_warehouse_location_id uuid;
begin
  if not (public.is_admin() or public.can_transfer_equipment()) then
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
      if v_active.no_history then
        -- Poprzedni przydział był bez protokołu — nie zostawia śladu w historii.
        delete from public.assignments where id = v_active.id;
      else
        if p_transfer_date < v_active.assigned_at then
          raise exception 'Data przekazania nie może być wcześniejsza niż data przydzielenia.';
        end if;
        update public.assignments
          set returned_at = p_transfer_date, returned_condition = p_condition
          where id = v_active.id;
      end if;
    end if;

    if p_new_employee_id is not null then
      insert into public.assignments
        (equipment_id, employee_id, assigned_at, assigned_condition, notes, created_by, no_history)
      values
        (v_equipment_id, p_new_employee_id, p_transfer_date, p_condition, p_notes, auth.uid(), coalesce(p_skip_history, false))
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