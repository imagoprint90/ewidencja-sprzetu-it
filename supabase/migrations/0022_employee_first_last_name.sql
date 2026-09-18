-- Rozdzielenie "Imię i nazwisko" pracownika na osobne kolumny first_name / last_name
-- (dotyczy tylko public.employees — profiles.full_name to konta logowania do aplikacji,
-- osobna sprawa, tego nie ruszamy).
alter table public.employees add column if not exists first_name text;
alter table public.employees add column if not exists last_name text;

update public.employees
set first_name = coalesce(nullif(split_part(full_name, ' ', 1), ''), full_name),
    last_name = nullif(trim(substring(full_name from position(' ' in full_name) + 1)), '')
where first_name is null;

alter table public.employees alter column first_name set not null;
alter table public.employees drop column full_name;
