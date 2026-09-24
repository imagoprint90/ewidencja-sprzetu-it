-- Ręczna kolejność kategorii sprzętu (przeciągnij i upuść w zakładce Kategorie).
alter table public.categories add column if not exists sort_order integer not null default 0;

-- Początkowa kolejność: alfabetyczna (tylko tam, gdzie kolejność nie była jeszcze ustawiona).
with ranked as (
  select id, row_number() over (order by name) as rn from public.categories
)
update public.categories c
set sort_order = ranked.rn
from ranked
where c.id = ranked.id and c.sort_order = 0;
