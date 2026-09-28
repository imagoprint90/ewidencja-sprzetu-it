-- Wydajność listy Sprzęt: zamiast ściągać WSZYSTKIE protokoły (z pełną migawką JSON) tylko po
-- to, żeby w JS policzyć ostatni protokół każdej pozycji sprzętu, robi to od razu Postgres —
-- zwraca tylko jeden, najnowszy wiersz na sprzęt. Rośnie z liczbą sprzętu, a nie z historią
-- wszystkich kiedykolwiek wystawionych protokołów.
--
-- Bez SECURITY DEFINER (domyślnie SECURITY INVOKER) — RLS na protocols/protocol_items nadal
-- ogranicza wynik do protokołów widocznych dla wywołującego konta (patrz migracja 0026).
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
  select distinct on (pi.equipment_id)
    pi.equipment_id,
    p.id as protocol_id,
    p.protocol_number,
    p.pdf_status::text,
    p.pdf_path,
    p.created_at,
    coalesce(
      (
        select item ->> 'technicalConditionLabel'
        from jsonb_array_elements(p.snapshot -> 'items') as item
        where item ->> 'inventoryNumber' = pi.inventory_number_snapshot
        limit 1
      ),
      p.snapshot ->> 'technicalConditionLabel'
    ) as condition
  from public.protocol_items pi
  join public.protocols p on p.id = pi.protocol_id
  where pi.equipment_id is not null
  order by pi.equipment_id, p.created_at desc, p.id desc;
$$;
