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
