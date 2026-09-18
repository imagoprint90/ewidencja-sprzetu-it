-- Numer telefonu pracownika (opcjonalny) oraz zniesienie wymogu podawania działu i
-- lokalizacji przy pracowniku — nie każdy pracownik musi mieć przypisany dział/lokalizację.
alter table public.employees add column if not exists phone text;
alter table public.employees alter column department drop not null;
alter table public.employees alter column location_id drop not null;
