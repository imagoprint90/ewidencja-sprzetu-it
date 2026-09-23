-- Zakładka "Powiadomienia" (na razie wyłącznie ręczne wysyłanie, bez automatycznych
-- wyzwalaczy) — szablony wielokrotnego użytku oraz historia wysłanych maili do pracowników.
-- Wysyłka odbywa się przez zewnętrzne API (Resend), nie przez samą bazę — tu tylko
-- przechowujemy treść szablonów i log tego, co i do kogo zostało wysłane.
-- Dostęp wyłącznie dla administratora (tak jak zakładka Użytkownicy) — to nowa, wrażliwa
-- funkcja (wysyłka maili w imieniu firmy), więc na start bez dodatkowych ról.

create type public.notification_status as enum ('wyslano', 'blad');

create table public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_notification_templates_updated_at
  before update on public.notification_templates
  for each row execute function public.set_updated_at();

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete set null,
  -- Migawka danych pracownika w chwili wysyłki — historia zostaje czytelna nawet po
  -- usunięciu pracownika albo zmianie jego adresu e-mail.
  employee_name_snapshot text not null,
  employee_email_snapshot text not null,
  template_id uuid references public.notification_templates(id) on delete set null,
  template_name_snapshot text,
  subject text not null,
  body text not null,
  status public.notification_status not null,
  error_message text,
  sent_by uuid references public.profiles(id),
  sent_by_name text not null,
  created_at timestamptz not null default now()
);

create index idx_notification_log_employee on public.notification_log(employee_id);

alter table public.notification_templates enable row level security;
alter table public.notification_log enable row level security;

create policy "admin zarzadza szablonami powiadomien" on public.notification_templates
  for all using (public.is_admin()) with check (public.is_admin());

create policy "admin zarzadza logiem powiadomien" on public.notification_log
  for all using (public.is_admin()) with check (public.is_admin());
