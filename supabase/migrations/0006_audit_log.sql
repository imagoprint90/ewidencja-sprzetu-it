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
