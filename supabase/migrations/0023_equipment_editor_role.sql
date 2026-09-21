-- Nowa rola "edycja_podglad": może edytować i widzieć TYLKO sprzęt z przypisanych jej
-- kategorii (kolumna visible_categories, analogicznie do visible_tabs dla zakładek).
-- Reguły RLS wykorzystujące tę wartość enuma są w osobnym pliku (0024) — Postgres nie
-- pozwala użyć nowej wartości enuma w tej samej transakcji, w której ją dodano.
alter type public.app_role add value if not exists 'edycja_podglad';

alter table public.profiles add column if not exists visible_categories uuid[];
