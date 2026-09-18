-- Osoba reprezentująca firmę (imię i nazwisko) — wyświetlana na protokołach jako
-- strona wydająca/odbierająca w imieniu firmy, zamiast każdorazowo zalogowanego
-- administratora. Konfigurowana raz w Ustawieniach.

alter table public.company_settings
  add column if not exists representative_name text not null default '';
