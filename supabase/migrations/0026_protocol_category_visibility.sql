-- Zakładka Protokoły dla kont standardowych (rola "podglad", niezależnie od tego, czy mają
-- włączone dodatkowe uprawnienia "Edycja i podgląd sprzętu" / "Przekazywanie sprzętu") jest
-- teraz ograniczona do protokołów, które zawierają choć jedną pozycję sprzętu z kategorii
-- przypisanej temu kontu (profiles.visible_categories). Brak przypisanych kategorii = brak
-- widocznych protokołów. Administrator widzi wszystkie protokoły bez zmian.
--
-- Kategorię pozycji protokołu ustalamy z aktualnego sprzętu (protocol_items.equipment_id →
-- equipment.category_id), a jeśli sprzęt został od tego czasu usunięty (equipment_id is null),
-- z zamrożonej nazwy kategorii w migawce (category_snapshot), dopasowanej do bieżącej tabeli
-- categories po nazwie.
--
-- Uwaga: to jest zmiana zachowania dla już istniejących kont standardowych bez przypisanych
-- kategorii — po zastosowaniu tego pliku przestaną widzieć jakiekolwiek protokoły, dopóki
-- administrator nie przypisze im kategorii w zakładce Użytkownicy.

create or replace function public.protocol_category_visible(p_protocol_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.protocol_items pi
      left join public.equipment e on e.id = pi.equipment_id
      left join public.categories c on c.name = pi.category_snapshot
      where pi.protocol_id = p_protocol_id
        and coalesce(e.category_id, c.id) = any(
          coalesce(
            (select visible_categories from public.profiles where id = auth.uid()),
            array[]::uuid[]
          )
        )
    );
$$;

drop policy if exists "odczyt protokolow" on public.protocols;
create policy "odczyt protokolow w swoich kategoriach" on public.protocols
  for select using (public.protocol_category_visible(id));

drop policy if exists "odczyt pozycji protokolow" on public.protocol_items;
create policy "odczyt pozycji protokolow w swoich kategoriach" on public.protocol_items
  for select using (public.protocol_category_visible(protocol_id));
