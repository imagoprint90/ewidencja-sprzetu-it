-- Poprawka wydajności funkcji equipment_last_protocols() z migracji 0047: poprzednia wersja
-- parsowała JSON migawki (jsonb_array_elements) dla KAŻDEGO historycznego protokołu, zanim
-- DISTINCT ON odrzucił wszystkie poza najnowszym — przy sporej historii protokołów robiło to
-- funkcję wolniejszą niż stare rozwiązanie, które próbowała zastąpić. Ta wersja najpierw
-- tanim zapytaniem (bez JSON) wybiera tylko najnowszy protokół każdego sprzętu, a dopiero
-- potem parsuje JSON wyłącznie dla tych wygranych wierszy (najwyżej tyle, ile jest sprzętu).
-- Brakujący indeks na protocol_items.equipment_id wcześniej wymuszał pełne sortowanie całej
-- tabeli — teraz jest dodany.
create index if not exists idx_protocol_items_equipment on public.protocol_items(equipment_id);

create or replace function public.equipment_last_protocols()
returns table (
  equipment_id uuid,
  protocol_id uuid,
  protocol_number text,
  pdf_status text,
  pdf_path text,
  created_at timestamptz,
  condition text
)
language sql
stable
as $$
  with latest as (
    select distinct on (pi.equipment_id)
      pi.equipment_id,
      pi.protocol_id,
      pi.inventory_number_snapshot,
      p.protocol_number,
      p.pdf_status::text as pdf_status,
      p.pdf_path,
      p.created_at
    from public.protocol_items pi
    join public.protocols p on p.id = pi.protocol_id
    where pi.equipment_id is not null
    order by pi.equipment_id, p.created_at desc, p.id desc
  )
  select
    l.equipment_id,
    l.protocol_id,
    l.protocol_number,
    l.pdf_status,
    l.pdf_path,
    l.created_at,
    coalesce(
      (
        select item ->> 'technicalConditionLabel'
        from public.protocols p2, jsonb_array_elements(p2.snapshot -> 'items') as item
        where p2.id = l.protocol_id
          and item ->> 'inventoryNumber' = l.inventory_number_snapshot
        limit 1
      ),
      (select p2.snapshot ->> 'technicalConditionLabel' from public.protocols p2 where p2.id = l.protocol_id)
    ) as condition
  from latest l;
$$;
