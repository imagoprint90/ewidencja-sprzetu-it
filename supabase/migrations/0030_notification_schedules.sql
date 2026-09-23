-- Automatyczna wysyłka powiadomień: harmonogramy "wyślij szablon X do wybranych pracowników,
-- o godzinie Y, w wybrane dni tygodnia". Sprawdzane cyklicznie przez zadanie cron (Vercel Cron,
-- patrz src/app/api/cron/notification-schedules/route.ts) — sama baza niczego nie wysyła.
--
-- Uwaga: na darmowym planie Vercel (Hobby) zadania cron uruchamiają się co najwyżej raz
-- dziennie, więc dokładna godzina jest tu raczej "od której godziny wysłać tego dnia" niż
-- gwarantowaną minutą — stąd last_sent_date (pilnuje, żeby nie wysłać dwa razy tego samego
-- dnia) zamiast dokładnego znacznika czasu.

create table public.notification_schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- restrict (nie cascade) — usunięcie szablonu używanego w aktywnym harmonogramie nie może
  -- po cichu skasować tego harmonogramu; admin musi najpierw usunąć/zmienić harmonogram.
  template_id uuid not null references public.notification_templates(id) on delete restrict,
  employee_ids uuid[] not null,
  send_time time not null,
  -- Dni tygodnia w numeracji ISO-8601: 1 = poniedziałek ... 7 = niedziela.
  days_of_week smallint[] not null,
  is_active boolean not null default true,
  last_sent_date date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_notification_schedules_updated_at
  before update on public.notification_schedules
  for each row execute function public.set_updated_at();

alter table public.notification_schedules enable row level security;

create policy "admin zarzadza harmonogramami powiadomien" on public.notification_schedules
  for all using (public.is_admin()) with check (public.is_admin());

-- Powiązanie z historią: wpis w notification_log dostaje schedule_id, jeśli powstał
-- automatycznie z harmonogramu (null = wysłane ręcznie z zakładki "Wyślij").
alter table public.notification_log add column if not exists schedule_id
  uuid references public.notification_schedules(id) on delete set null;
