-- Kolory statusów sprzętu ustawiane przez administratora (zakładka Ustawienia > Statusy sprzętu).
-- text_color = kolor czcionki całego wiersza na liście Sprzęt, background_color = opcjonalne tło wiersza.
create table if not exists public.status_colors (
  status text primary key,
  text_color text not null,
  background_color text
);

alter table public.status_colors enable row level security;

drop policy if exists "odczyt kolorow statusow" on public.status_colors;
create policy "odczyt kolorow statusow" on public.status_colors
  for select using (auth.uid() is not null);
drop policy if exists "admin zarzadza kolorami statusow" on public.status_colors;
create policy "admin zarzadza kolorami statusow" on public.status_colors
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.status_colors (status, text_color) values
  ('w_magazynie', '#16a34a'),
  ('przydzielony', '#1d1d1b'),
  ('w_naprawie', '#ef7d00'),
  ('zepsuty', '#dc2626'),
  ('wycofany', '#6b7280')
on conflict (status) do nothing;