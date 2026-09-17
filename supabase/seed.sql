-- Dane początkowe. Uruchom ręcznie w SQL Editor Supabase po zastosowaniu migracji
-- (Supabase CLI nie uruchamia seed.sql automatycznie przy `db push`).

insert into public.categories (name) values
  ('Komputery'),
  ('Monitory'),
  ('Drukarki'),
  ('Routery'),
  ('Anteny'),
  ('Oprogramowanie'),
  ('Inny sprzęt')
on conflict (name) do nothing;

update public.company_settings
set name = 'Twoja Firma Sp. z o.o.', address = 'ul. Przykładowa 1, 00-000 Warszawa'
where id = true;
