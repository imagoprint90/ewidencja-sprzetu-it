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
