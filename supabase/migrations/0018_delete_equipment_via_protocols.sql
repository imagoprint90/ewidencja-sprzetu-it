-- Zmiana zasady blokowania usuwania sprzętu: dotąd blokowała to jakakolwiek historia
-- przydziałów (assignments). Teraz blokują to wyłącznie POWIĄZANE PROTOKOŁY — jeśli
-- admin najpierw usunie protokoły dotyczące danego sprzętu, usunięcie samego sprzętu
-- (wraz z jego historią przydziałów) staje się możliwe.

alter table public.assignments
  drop constraint if exists assignments_equipment_id_fkey;
alter table public.assignments
  add constraint assignments_equipment_id_fkey
  foreign key (equipment_id) references public.equipment(id) on delete cascade;

alter table public.protocol_items
  drop constraint if exists protocol_items_equipment_id_fkey;
alter table public.protocol_items
  add constraint protocol_items_equipment_id_fkey
  foreign key (equipment_id) references public.equipment(id) on delete restrict;
