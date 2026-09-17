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
