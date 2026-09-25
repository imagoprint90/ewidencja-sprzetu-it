-- Lokalizacja sprzętu jest niezależna od lokalizacji pracownika: można ją ustawić dowolnie przy
-- dodawaniu, przekazaniu i edycji, także jako "brak lokalizacji" (NULL). Lokalizacja pracownika
-- służy już tylko jako podpowiedź w formularzach.
alter table public.equipment alter column location_id drop not null;

-- Dotychczas przydzielony sprzęt pracownika bez lokalizacji wyświetlał się jako "Magazyn" tylko
-- dlatego, że zapisana lokalizacja nie była nigdy zmieniana — teraz pokazujemy to jako brak.
update public.equipment e
set location_id = null
where e.status = 'przydzielony'
  and exists (
    select 1
    from public.assignments a
    join public.employees emp on emp.id = a.employee_id
    where a.equipment_id = e.id and a.returned_at is null and emp.location_id is null
  );

drop function if exists public.transfer_equipment_set(uuid[], uuid, date, public.technical_condition, text, boolean);
drop function if exists public.transfer_equipment_set(uuid[], uuid, date, public.technical_condition, text);

-- p_apply_location = true: sprzęt dostaje lokalizację p_location_id (może być NULL = brak),
-- niezależnie od lokalizacji pracownika. false: dawne zachowanie (lokalizacja pracownika/magazyn).
create or replace function public.transfer_equipment_set(
  p_equipment_ids uuid[],
  p_new_employee_id uuid,
  p_transfer_date date,
  p_condition public.technical_condition,
  p_notes text default null,
  p_skip_history boolean default false,
  p_location_id uuid default null,
  p_apply_location boolean default false
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
        set status = 'przydzielony',
            location_id = case when p_apply_location then p_location_id else coalesce(v_new_location_id, location_id) end
        where id = v_equipment_id;
      return next v_new;
    else
      update public.equipment
        set status = 'w_magazynie',
            location_id = case when p_apply_location then p_location_id else coalesce(v_warehouse_location_id, location_id) end
        where id = v_equipment_id;
    end if;
  end loop;

  return;
end;
$$;