-- Protokoły PDF. Dane w protokole są "zamrożone" w momencie utworzenia (snapshot),
-- więc późniejsza zmiana nazwiska pracownika, nazwy sprzętu czy danych firmy
-- nie zmienia treści wcześniej wystawionych dokumentów.

create sequence public.protocol_number_seq start 1;

-- Uwaga: numer jest unikalny i rosnący; nie resetuje się co roku w tej wersji MVP.
create or replace function public.generate_protocol_number()
returns text
language sql
as $$
  select 'PP/' || extract(year from now())::text || '/' || lpad(nextval('public.protocol_number_seq')::text, 5, '0');
$$;

create type public.protocol_type as enum ('wydanie', 'zwrot', 'przekazanie');
create type public.protocol_pdf_status as enum ('oczekuje', 'wygenerowany', 'blad');

create table public.protocols (
  id uuid primary key default gen_random_uuid(),
  protocol_number text not null unique default public.generate_protocol_number(),
  type public.protocol_type not null,
  assignment_id uuid references public.assignments(id) on delete set null,
  issued_by uuid references public.profiles(id),
  issued_by_name text not null,
  issued_at date not null default current_date,
  city text not null,
  -- Migawka danych użytych do wygenerowania dokumentu (firma, osoby, sprzęt, oprogramowanie).
  snapshot jsonb not null,
  pdf_status public.protocol_pdf_status not null default 'oczekuje',
  pdf_path text,
  pdf_error text,
  created_at timestamptz not null default now()
);

create index idx_protocols_assignment on public.protocols(assignment_id);

-- Pozycje (urządzenia) objęte danym protokołem — również jako migawka, nie referencja
-- do bieżącego stanu sprzętu.
create table public.protocol_items (
  id uuid primary key default gen_random_uuid(),
  protocol_id uuid not null references public.protocols(id) on delete cascade,
  equipment_id uuid references public.equipment(id) on delete set null,
  name_snapshot text not null,
  category_snapshot text not null,
  inventory_number_snapshot text not null,
  serial_number_snapshot text
);

create index idx_protocol_items_protocol on public.protocol_items(protocol_id);

comment on column public.protocols.pdf_status is
  'oczekuje = trwa generowanie/do ponowienia; wygenerowany = plik zapisany w Storage; blad = ostatnia próba nieudana. Ponowienie generowania nie tworzy nowego protokolu ani nowego numeru.';
