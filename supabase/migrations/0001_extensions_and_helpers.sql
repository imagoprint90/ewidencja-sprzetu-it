-- Rozszerzenia i funkcje pomocnicze używane w kolejnych migracjach.

create extension if not exists pgcrypto;

-- Automatyczna aktualizacja kolumny updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
