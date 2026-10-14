-- Wiele dokumentów (faktury, gwarancje, skany) przy sprzęcie zamiast jednej faktury PDF.
-- Pliki leżą w istniejącym prywatnym buckecie "faktury" (jego polityki Storage z 0028 już
-- pozwalają edytującym wgrywać/usuwać), a tu jest tylko lista metadanych.
-- equipment.purchase_invoice_path zostaje jako "pierwszy dokument" — z niego korzysta kolumna FV
-- na liście Sprzęt (ikonka otwierająca fakturę); aplikacja utrzymuje go przy dodawaniu/usuwaniu.

create table public.equipment_documents (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size bigint not null default 0,
  content_type text not null default 'application/pdf',
  uploaded_by_name text,
  created_at timestamptz not null default now()
);

create index idx_equipment_documents_equipment on public.equipment_documents(equipment_id);

alter table public.equipment_documents enable row level security;

-- Widoczność = widoczność samego sprzętu (podzapytanie przechodzi przez RLS tabeli equipment).
create policy "odczyt dokumentow sprzetu" on public.equipment_documents
  for select using (exists (select 1 from public.equipment e where e.id = equipment_id));

create policy "dodawanie dokumentow sprzetu" on public.equipment_documents
  for insert
  with check (
    public.can_edit_equipment()
    and exists (
      select 1 from public.equipment e
      where e.id = equipment_id and public.equipment_category_visible(e.category_id)
    )
  );

create policy "usuwanie dokumentow sprzetu" on public.equipment_documents
  for delete
  using (
    public.can_edit_equipment()
    and exists (
      select 1 from public.equipment e
      where e.id = equipment_id and public.equipment_category_visible(e.category_id)
    )
  );

-- Istniejące faktury stają się pierwszym dokumentem sprzętu.
insert into public.equipment_documents (equipment_id, file_path, file_name, content_type)
select id, purchase_invoice_path, 'Faktura zakupu.pdf', 'application/pdf'
from public.equipment
where purchase_invoice_path is not null;
