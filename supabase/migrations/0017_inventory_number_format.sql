-- Prostszy format numeru inwentarzowego: INW/001, INW/002, ... (bez roku).
-- Ta sama sekwencja co dotychczas — nowe numery kontynuują od bieżącej wartości,
-- stare numery (INW/2026/000xx) pozostają bez zmian w historii.

create or replace function public.generate_inventory_number()
returns text
language sql
as $$
  select 'INW/' || lpad(nextval('public.equipment_inventory_seq')::text, 3, '0');
$$;
