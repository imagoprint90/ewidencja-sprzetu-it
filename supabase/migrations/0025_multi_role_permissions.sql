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
