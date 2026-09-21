-- Reguły RLS dla nowej roli "edycja_podglad" (patrz 0023) — może odczytywać i aktualizować
-- WYŁĄCZNIE sprzęt, którego kategoria jest w jej visible_categories. Administrator i rola
-- "podglad" nie są tym ograniczeniem objęte (podglad nadal widzi cały sprzęt, tylko bez prawa
-- edycji — ograniczenie kategorii dotyczy tylko tej jednej, nowej roli).

create or replace function public.equipment_category_visible(p_category_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_role() = 'administrator'
    or public.current_app_role() <> 'edycja_podglad'
    or p_category_id = any(
      coalesce(
        (select visible_categories from public.profiles where id = auth.uid()),
        array[]::uuid[]
      )
    );
$$;

drop policy if exists "odczyt sprzetu" on public.equipment;
create policy "odczyt sprzetu" on public.equipment
  for select using (auth.uid() is not null and public.equipment_category_visible(category_id));

-- "admin zarzadza sprzetem" (insert/update/delete dla administratora) zostaje bez zmian —
-- to osobna, permissywna polityka, więc admin nadal ma pełny dostęp niezależnie od poniższej.
create policy "edycja_podglad aktualizuje sprzet w swoich kategoriach" on public.equipment
  for update
  using (public.current_app_role() = 'edycja_podglad' and public.equipment_category_visible(category_id))
  with check (public.current_app_role() = 'edycja_podglad' and public.equipment_category_visible(category_id));
