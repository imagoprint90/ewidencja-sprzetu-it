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
