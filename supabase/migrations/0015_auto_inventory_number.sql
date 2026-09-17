-- Automatyczne nadawanie numeru inwentarzowego przy dodawaniu sprzętu (ten sam wzorzec
-- co numeracja protokołów: INW/{rok}/{00001}). Nadal można go ręcznie zmienić później
-- na karcie sprzętu (np. żeby dopasować do istniejącej naklejki inwentarzowej).

create sequence public.equipment_inventory_seq start 1;

create or replace function public.generate_inventory_number()
returns text
language sql
as $$
  select 'INW/' || extract(year from now())::text || '/' || lpad(nextval('public.equipment_inventory_seq')::text, 5, '0');
$$;

alter table public.equipment alter column inventory_number set default public.generate_inventory_number();
