-- Lokalizacje jako osobny słownik (jak kategorie), zamiast wolnego tekstu.
-- Lokalizacja sprzętu przestaje być polem ręcznie edytowalnym — jest synchronizowana
-- automatycznie z lokalizacją aktualnie przypisanego pracownika (patrz migracja 0013),
-- a przy zwrocie do magazynu ustawiana na specjalną lokalizację "Magazyn".

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_archived boolean not null default false,
  is_warehouse boolean not null default false,
  created_at timestamptz not null default now(),
  unique (name)
);

alter table public.locations enable row level security;

create policy "odczyt lokalizacji" on public.locations
  for select using (auth.uid() is not null);
create policy "admin zarzadza lokalizacjami" on public.locations
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.locations (name, is_warehouse) values ('Magazyn', true)
on conflict (name) do nothing;

-- Migracja istniejących wartości tekstowych na wiersze w tabeli lokalizacji,
-- żeby nie utracić danych już wprowadzonych w systemie.
insert into public.locations (name)
select distinct location from public.employees
where location is not null and trim(location) <> ''
on conflict (name) do nothing;

insert into public.locations (name)
select distinct location from public.equipment
where location is not null and trim(location) <> ''
on conflict (name) do nothing;

alter table public.employees add column location_id uuid references public.locations(id);
update public.employees e set location_id = l.id from public.locations l where l.name = e.location;
update public.employees set location_id = (select id from public.locations where is_warehouse limit 1)
  where location_id is null;
alter table public.employees alter column location_id set not null;
alter table public.employees drop column location;

alter table public.equipment add column location_id uuid references public.locations(id);
update public.equipment e set location_id = l.id from public.locations l where l.name = e.location;
update public.equipment set location_id = (select id from public.locations where is_warehouse limit 1)
  where location_id is null;
alter table public.equipment alter column location_id set not null;
alter table public.equipment drop column location;

create index idx_employees_location on public.employees(location_id);
create index idx_equipment_location on public.equipment(location_id);
