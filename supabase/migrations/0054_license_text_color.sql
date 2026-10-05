-- Kolor czcionki nazwy licencji (lista Oprogramowanie → Licencje) — ułatwia odróżnianie licencji
-- na liście. Zapisywany przy licencji, więc widzą go wszyscy; null = kolor domyślny (jak dotąd).
alter table public.software_licenses add column if not exists text_color text;
