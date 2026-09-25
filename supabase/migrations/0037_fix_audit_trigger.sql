-- Poprawka funkcji dziennika zmian z 0036: odwołanie do new.is_archived wywalało się dla tabel
-- bez tej kolumny (np. przy przekazaniu sprzętu). Odczyt pól przez to_jsonb działa dla każdej tabeli.
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new jsonb := to_jsonb(new);
  v_old jsonb;
begin
  -- Przydziały wykonane bez protokołu nie trafiają do dziennika.
  if tg_table_name = 'assignments' and coalesce((v_new->>'no_history')::boolean, false) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    insert into public.audit_log (table_name, record_id, action, changed_by, diff)
    values (tg_table_name, new.id, 'utworzenie', auth.uid(), v_new);
    return new;
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    insert into public.audit_log (table_name, record_id, action, changed_by, diff)
    values (
      tg_table_name, new.id,
      case when (tg_table_name in ('categories', 'employees')
                 and (v_new->>'is_archived') is distinct from (v_old->>'is_archived'))
             or (tg_table_name = 'equipment' and v_new->>'status' = 'wycofany' and v_old->>'status' <> 'wycofany')
           then 'archiwizacja' else 'edycja' end,
      auth.uid(),
      jsonb_build_object('before', v_old, 'after', v_new)
    );
    return new;
  end if;
  return null;
end;
$$;