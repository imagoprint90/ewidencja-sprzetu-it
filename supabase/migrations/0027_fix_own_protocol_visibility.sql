-- Poprawka do 0026: konto z uprawnieniem "Przekazywanie sprzętu" musi zawsze widzieć (i móc
-- zarządzać) protokoły, które SAMO wystawiło — niezależnie od tego, czy sprzęt na protokole
-- należy do jego przypisanych kategorii. Bez tego wyjątku 0026 psuło cały przepływ
-- "Przekaż sprzęt": operacja przydziału się udawała (transfer_equipment_set nie zależy od
-- kategorii), ale utworzony właśnie protokół natychmiast znikał kontu z widoku (polityka
-- SELECT z 0026 go odrzucała), a ponieważ RLS na protocol_items sprawdzało istnienie
-- protokołu przez zwykłe zapytanie (podlegające tej samej, teraz zawężonej, polityce SELECT
-- na protocols), zapis pozycji protokołu też się nie udawał — mimo braku widocznego błędu w
-- interfejsie (osobny problem, naprawiony w PrzekazForm.tsx).

-- Funkcja pomocnicza (SECURITY DEFINER = nie podlega RLS na protocols), żeby sprawdzenie
-- "czy to mój protokół" w politykach protocol_items nie zależało od tego, czy dany protokół
-- jest akurat widoczny przez politykę SELECT na protocols (unika cyklicznego zawężania).
create or replace function public.protocol_owned_by_caller(p_protocol_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.protocols where id = p_protocol_id and issued_by = auth.uid()
  );
$$;

drop policy if exists "odczyt protokolow w swoich kategoriach" on public.protocols;
create policy "odczyt protokolow w swoich kategoriach lub wlasnych" on public.protocols
  for select using (
    public.protocol_category_visible(id)
    or (public.can_transfer_equipment() and issued_by = auth.uid())
  );

drop policy if exists "odczyt pozycji protokolow w swoich kategoriach" on public.protocol_items;
create policy "odczyt pozycji protokolow w swoich kategoriach lub wlasnych" on public.protocol_items
  for select using (
    public.protocol_category_visible(protocol_id)
    or (public.can_transfer_equipment() and public.protocol_owned_by_caller(protocol_id))
  );

-- Zastępuje politykę zapisu z 0025 — ten sam warunek "własny protokół", ale przez funkcję
-- SECURITY DEFINER zamiast bezpośredniego podzapytania do protocols (które podlegałoby jego
-- politykom SELECT i mogłoby fałszywie odrzucić zapis tuż po utworzeniu protokołu).
drop policy if exists "przekazywanie zarzadza pozycjami wlasnych protokolow" on public.protocol_items;
create policy "przekazywanie zarzadza pozycjami wlasnych protokolow" on public.protocol_items
  for all
  using (public.can_transfer_equipment() and public.protocol_owned_by_caller(protocol_id))
  with check (public.can_transfer_equipment() and public.protocol_owned_by_caller(protocol_id));
