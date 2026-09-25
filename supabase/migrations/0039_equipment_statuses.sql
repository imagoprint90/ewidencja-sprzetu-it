-- Statusy sprzętu jako słownik zarządzany przez administratora (zamiast stałego typu enum).
-- Pięć statusów systemowych (is_system) ma znaczenie w logice aplikacji (przekazania, zwroty,
-- wycofanie) — można zmienić ich nazwę i kolory, ale nie usunąć. Własne statusy można dodawać
-- i usuwać (o ile żaden sprzęt ich nie używa).
create table if not exists public.equipment_statuses (
  key text primary key,
  label text not null,
  text_color text not null default '#1d1d1b',
  background_color text,
  is_system boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_equipment_statuses_label on public.equipment_statuses (lower(label));

alter table public.equipment_statuses enable row level security;

drop policy if exists "odczyt statusow sprzetu" on public.equipment_statuses;
create policy "odczyt statusow sprzetu" on public.equipment_statuses
  for select using (auth.uid() is not null);
drop policy if exists "admin zarzadza statusami sprzetu" on public.equipment_statuses;
create policy "admin zarzadza statusami sprzetu" on public.equipment_statuses
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.equipment_statuses (key, label, text_color, is_system, sort_order) values
  ('w_magazynie', 'W magazynie', '#16a34a', true, 1),
  ('przydzielony', 'Przydzielony', '#1d1d1b', true, 2),
  ('w_naprawie', 'W naprawie', '#ef7d00', true, 3),
  ('zepsuty', 'Zepsuty', '#dc2626', true, 4),
  ('wycofany', 'Wycofany', '#6b7280', true, 5)
on conflict (key) do nothing;

-- Przeniesienie kolorów ustawionych wcześniej w status_colors (migracja 0038), jeśli istnieją.
do $$
begin
  if to_regclass('public.status_colors') is not null then
    update public.equipment_statuses s
    set text_color = c.text_color, background_color = c.background_color
    from public.status_colors c
    where c.status = s.key;
    drop table public.status_colors;
  end if;
end $$;

-- Kolumna status sprzętu: z enuma na tekst powiązany kluczem obcym ze słownikiem.
alter table public.equipment alter column status drop default;
alter table public.equipment alter column status type text using status::text;
alter table public.equipment alter column status set default 'w_magazynie';
alter table public.equipment drop constraint if exists equipment_status_fk;
alter table public.equipment
  add constraint equipment_status_fk foreign key (status)
  references public.equipment_statuses (key) on update cascade;