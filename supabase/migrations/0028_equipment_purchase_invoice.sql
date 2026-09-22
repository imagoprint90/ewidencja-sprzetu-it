-- Faktura zakupu jako załącznik PDF do karty sprzętu. Plik trzymamy w prywatnym Storage
-- (jak protokoły), a w equipment tylko ścieżkę do niego — pusta ścieżka = brak faktury,
-- pokazywana w tabeli Sprzęt jako pusta kolumna "FV" (ikonka pojawia się tylko gdy faktura
-- jest załączona).

alter table public.equipment add column if not exists purchase_invoice_path text;

insert into storage.buckets (id, name, public)
values ('faktury', 'faktury', false)
on conflict (id) do nothing;

create policy "odczyt faktur dla zalogowanych" on storage.objects
  for select using (bucket_id = 'faktury' and auth.uid() is not null);

-- Wgrywanie/aktualizacja/usuwanie faktur — te same uprawnienia co edycja karty sprzętu
-- (administrator albo can_edit_equipment). Bez zawężenia do konkretnej kategorii na poziomie
-- Storage (jak w przypadku protokołów) — właściwe zawężenie kategorii pilnuje sama tabela
-- equipment przy zapisie ścieżki faktury (kolumna purchase_invoice_path).
create policy "edycja sprzetu wgrywa faktury" on storage.objects
  for insert with check (bucket_id = 'faktury' and (public.is_admin() or public.can_edit_equipment()));

create policy "edycja sprzetu aktualizuje faktury" on storage.objects
  for update using (bucket_id = 'faktury' and (public.is_admin() or public.can_edit_equipment()));

create policy "edycja sprzetu usuwa faktury" on storage.objects
  for delete using (bucket_id = 'faktury' and (public.is_admin() or public.can_edit_equipment()));
