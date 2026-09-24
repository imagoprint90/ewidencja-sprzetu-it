-- Licencje oprogramowania: data zakupu, faktura VAT (PDF w prywatnym Storage, ten sam bucket
-- "faktury" co faktury sprzętu, ścieżki licencje/<id>.pdf) oraz klucz licencji.
--
-- Klucz trzymamy w OSOBNEJ tabeli z dostępem wyłącznie dla administratora (RLS) — zwykłe
-- zapytania o licencje (które widzą wszyscy zalogowani) w ogóle go nie zawierają, a aplikacja
-- pobiera go dopiero na żądanie ("Pokaż"/"Kopiuj"), nie razem z listą licencji.

alter table public.software_licenses add column if not exists purchase_date date;
alter table public.software_licenses add column if not exists invoice_path text;

create table public.license_keys (
  license_id uuid primary key references public.software_licenses(id) on delete cascade,
  license_key text not null,
  updated_at timestamptz not null default now()
);

alter table public.license_keys enable row level security;

create policy "admin zarzadza kluczami licencji" on public.license_keys
  for all using (public.is_admin()) with check (public.is_admin());
