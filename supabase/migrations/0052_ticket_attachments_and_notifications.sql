-- Rozbudowa modułu Tickety:
--   1) Załączniki do zgłoszeń (np. zrzuty ekranu) — osobna tabela ticket_attachments +
--      prywatny bucket Storage (wiele plików na ticket, w przeciwieństwie do faktur sprzętu
--      gdzie jest jeden plik na rekord pod stałą ścieżką).
--   2) Wpis w historii zgłoszenia za każdym razem, gdy system próbuje wysłać e-mail o
--      przydzieleniu — zarówno sukces, jak i błąd, żeby dało się to zweryfikować bez grzebania
--      w logach serwera.

-- ---------------------------------------------------------------------------------------------
-- 1) Załączniki
-- ---------------------------------------------------------------------------------------------

create table public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size bigint not null,
  content_type text not null,
  uploaded_by uuid not null references public.profiles(id),
  uploaded_by_name text not null,
  created_at timestamptz not null default now()
);

create index idx_ticket_attachments_ticket on public.ticket_attachments(ticket_id);

alter table public.ticket_attachments enable row level security;

-- Widoczność = widoczność samego ticketu (patrz komentarz przy ticket_comments w 0051).
create policy "odczyt zalacznikow widocznych ticketow" on public.ticket_attachments
  for select using (exists (select 1 from public.tickets t where t.id = ticket_id));

create policy "dodawanie zalacznikow" on public.ticket_attachments
  for insert
  with check (
    (public.can_comment_tickets() or public.can_edit_tickets() or public.can_admin_tickets())
    and uploaded_by = auth.uid()
    and exists (select 1 from public.tickets t where t.id = ticket_id)
  );

-- Usunąć może autor załącznika albo ktoś z uprawnieniem do edycji/administracji ticketów.
create policy "usuwanie zalacznikow" on public.ticket_attachments
  for delete
  using (uploaded_by = auth.uid() or public.can_edit_tickets() or public.can_admin_tickets());

insert into storage.buckets (id, name, public)
values ('tickety-zalaczniki', 'tickety-zalaczniki', false)
on conflict (id) do nothing;

create policy "odczyt zalacznikow ticketow dla zalogowanych" on storage.objects
  for select using (bucket_id = 'tickety-zalaczniki' and auth.uid() is not null);

create policy "dodawanie plikow zalacznikow ticketow" on storage.objects
  for insert
  with check (
    bucket_id = 'tickety-zalaczniki'
    and (public.can_comment_tickets() or public.can_edit_tickets() or public.can_admin_tickets())
  );

create policy "usuwanie plikow zalacznikow ticketow" on storage.objects
  for delete
  using (bucket_id = 'tickety-zalaczniki' and (public.can_edit_tickets() or public.can_admin_tickets()));

-- ---------------------------------------------------------------------------------------------
-- 2) Historia: wpis o wysyłce powiadomienia e-mail
-- ---------------------------------------------------------------------------------------------

alter table public.ticket_history drop constraint if exists ticket_history_action_check;
alter table public.ticket_history add constraint ticket_history_action_check
  check (action in (
    'utworzono', 'przydzielono', 'zmiana_statusu', 'zmiana_priorytetu', 'zmiana_kategorii',
    'wyslano_powiadomienie'
  ));
