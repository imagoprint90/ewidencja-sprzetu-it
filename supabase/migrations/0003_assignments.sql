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
