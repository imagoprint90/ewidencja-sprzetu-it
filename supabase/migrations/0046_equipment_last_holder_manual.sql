-- Ręcznie wpisane nazwisko "ostatniego posiadacza", gdy osoby nie ma na liście pracowników
-- (np. była zatrudniona przed wprowadzeniem systemu). Dokładnie jedno z last_holder_id /
-- last_holder_name jest ustawione naraz — pilnuje tego aplikacja, nie baza.
alter table public.equipment add column if not exists last_holder_name text;
