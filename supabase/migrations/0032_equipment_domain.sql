-- Pole "Domena" przy sprzęcie: TAK/NIE — czy dane urządzenie jest w domenie.
-- Istniejący sprzęt dostaje domyślnie NIE (do ręcznego uzupełnienia).

alter table public.equipment add column if not exists in_domain boolean not null default false;
