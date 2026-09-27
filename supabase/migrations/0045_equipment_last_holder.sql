-- Pole "Ostatni posiadacz" — ręcznie wybierany pracownik, niezwiązany z bieżącym przydziałem
-- (np. poprzedni użytkownik sprzętu wprowadzonego do systemu z historią). on delete set null,
-- żeby usunięcie pracownika nie blokowało się na tym polu.
alter table public.equipment
  add column if not exists last_holder_id uuid references public.employees(id) on delete set null;

create index if not exists idx_equipment_last_holder on public.equipment(last_holder_id);
