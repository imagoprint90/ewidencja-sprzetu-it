-- Edycja systemu Windows (Pro / Home) dla sprzętu z kategorii oznaczonych jako "z Windows"
-- (domyślnie kategoria "Komputery"; przełącznik jest w zakładce Kategorie).
alter table public.categories add column if not exists supports_windows boolean not null default false;
alter table public.equipment add column if not exists windows_edition text;

alter table public.equipment drop constraint if exists equipment_windows_edition_check;
alter table public.equipment
  add constraint equipment_windows_edition_check check (windows_edition in ('pro', 'home'));

update public.categories set supports_windows = true where lower(name) = 'komputery';

-- Baza pilnuje spójności niezależnie od aplikacji: sprzęt w kategorii bez Windows nigdy nie ma
-- wartości windows_edition (czyści ją zmiana kategorii, a także wyłączenie przełącznika kategorii).
create or replace function public.enforce_windows_edition()
returns trigger
language plpgsql
as $$
begin
  if new.windows_edition is not null
     and not exists (
       select 1 from public.categories c where c.id = new.category_id and c.supports_windows
     ) then
    new.windows_edition := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_windows_edition on public.equipment;
create trigger trg_enforce_windows_edition
  before insert or update of category_id, windows_edition on public.equipment
  for each row execute function public.enforce_windows_edition();

create or replace function public.clear_windows_on_category_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not new.supports_windows and old.supports_windows then
    update public.equipment set windows_edition = null where category_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clear_windows_on_category on public.categories;
create trigger trg_clear_windows_on_category
  after update of supports_windows on public.categories
  for each row execute function public.clear_windows_on_category_change();