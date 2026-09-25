-- Dziennik logowań do systemu (zakładka Ustawienia > Sesje logowań, tylko administrator).
-- Wpisy zapisuje wyłącznie serwer aplikacji (klucz service_role) — brak polityki insert,
-- więc przeglądarka nie może ich fałszować. Odczyt ma tylko administrator.
create table if not exists public.login_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event text not null check (event in ('logowanie', 'blad_logowania', 'wylogowanie')),
  user_id uuid,
  email text,
  full_name text,
  ip_address text,
  user_agent text,
  country text,
  city text,
  reason text
);

create index if not exists idx_login_events_created on public.login_events (created_at desc);
create index if not exists idx_login_events_user on public.login_events (user_id);

alter table public.login_events enable row level security;

drop policy if exists "admin odczytuje logowania" on public.login_events;
create policy "admin odczytuje logowania" on public.login_events
  for select using (public.is_admin());