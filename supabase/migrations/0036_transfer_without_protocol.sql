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