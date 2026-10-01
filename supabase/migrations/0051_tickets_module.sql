-- Moduł "Tickety" — zgłoszenia, przydzielanie, komentarze i historia zmian.
--
-- Uprawnienia modułu są addytywnymi flagami boolean na profiles (dokładnie ten sam wzorzec co
-- can_edit_equipment/can_transfer_equipment z 0025) — administrator ma wszystko niejawnie,
-- pozostałe konta dostają dowolną kombinację 11 flag poniżej. Kategorie zgłoszeń to NOWA,
-- osobna tabela ticket_categories — celowo niepowiązana z public.categories (kategorie
-- sprzętu), to inne pojęcie biznesowe. Dostęp do samej zakładki idzie przez istniejący
-- mechanizm visible_tabs (klucz "tickety" w ASSIGNABLE_TABS, patrz src/lib/access.ts).
--
-- Nazwy tekstowe (created_by_name/assigned_to_name/author_name/actor_name) są migawkami —
-- RLS na profiles pozwala odczytać tylko własny wiersz (poza administratorem), więc żywy JOIN
-- do profiles przy wyświetlaniu listy ticketów innej osoby by nie zadziałał. To ten sam powód,
-- dla którego equipment.lastHolderName i license_assignment_history.employee_name są migawkami.

-- ---------------------------------------------------------------------------------------------
-- Uprawnienia na profiles
-- ---------------------------------------------------------------------------------------------

alter table public.profiles add column if not exists can_create_tickets boolean not null default false;
alter table public.profiles add column if not exists can_view_own_tickets boolean not null default false;
alter table public.profiles add column if not exists can_view_assigned_tickets boolean not null default false;
alter table public.profiles add column if not exists can_view_all_tickets boolean not null default false;
alter table public.profiles add column if not exists can_edit_tickets boolean not null default false;
alter table public.profiles add column if not exists can_comment_tickets boolean not null default false;
alter table public.profiles add column if not exists can_change_ticket_status boolean not null default false;
alter table public.profiles add column if not exists can_change_ticket_priority boolean not null default false;
alter table public.profiles add column if not exists can_assign_tickets boolean not null default false;
alter table public.profiles add column if not exists can_close_tickets boolean not null default false;
alter table public.profiles add column if not exists can_admin_tickets boolean not null default false;
-- null = widzi tickety ze wszystkich kategorii (gdy ma can_view_all_tickets) — analogicznie do
-- visible_categories dla sprzętu.
alter table public.profiles add column if not exists visible_ticket_categories uuid[];

create or replace function public.can_create_tickets() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or coalesce((select can_create_tickets from public.profiles where id = auth.uid()), false);
$$;
create or replace function public.can_view_own_tickets() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or coalesce((select can_view_own_tickets from public.profiles where id = auth.uid()), false);
$$;
create or replace function public.can_view_assigned_tickets() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or coalesce((select can_view_assigned_tickets from public.profiles where id = auth.uid()), false);
$$;
create or replace function public.can_view_all_tickets() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or coalesce((select can_view_all_tickets from public.profiles where id = auth.uid()), false);
$$;
create or replace function public.can_edit_tickets() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or coalesce((select can_edit_tickets from public.profiles where id = auth.uid()), false);
$$;
create or replace function public.can_comment_tickets() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or coalesce((select can_comment_tickets from public.profiles where id = auth.uid()), false);
$$;
create or replace function public.can_change_ticket_status() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or coalesce((select can_change_ticket_status from public.profiles where id = auth.uid()), false);
$$;
create or replace function public.can_change_ticket_priority() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or coalesce((select can_change_ticket_priority from public.profiles where id = auth.uid()), false);
$$;
create or replace function public.can_assign_tickets() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or coalesce((select can_assign_tickets from public.profiles where id = auth.uid()), false);
$$;
create or replace function public.can_close_tickets() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or coalesce((select can_close_tickets from public.profiles where id = auth.uid()), false);
$$;
create or replace function public.can_admin_tickets() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or coalesce((select can_admin_tickets from public.profiles where id = auth.uid()), false);
$$;

-- Zgłoszenia bez kategorii (category_id is null) są zawsze widoczne temu, kto ma
-- can_view_all_tickets — ograniczenie listą dotyczy tylko ticketów faktycznie skategoryzowanych.
create or replace function public.ticket_category_visible(p_category_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select
    public.is_admin()
    or p_category_id is null
    or (select visible_ticket_categories from public.profiles where id = auth.uid()) is null
    or p_category_id = any(
      coalesce((select visible_ticket_categories from public.profiles where id = auth.uid()), array[]::uuid[])
    );
$$;

-- Lista kont, którym można przydzielić ticket: administrator albo konto z dostępem do zakładki
-- "tickety" (visible_tabs is null = bez ograniczeń, czyli też ma tę zakładkę). SECURITY DEFINER,
-- bo zwykłe RLS na profiles nie pozwoliłoby odczytać cudzych wierszy (patrz "profil wlasny").
-- Zwraca tylko id + imię i nazwisko — nic więcej z profilu nie jest tu potrzebne.
create or replace function public.list_ticket_assignable_users()
returns table(id uuid, full_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name
  from public.profiles p
  where p.role = 'administrator' or p.visible_tabs is null or 'tickety' = any(p.visible_tabs)
  order by p.full_name;
$$;

-- ---------------------------------------------------------------------------------------------
-- Kategorie zgłoszeń (NIE kategorie sprzętu — osobny byt, zarządzany wewnątrz modułu Tickety)
-- ---------------------------------------------------------------------------------------------

create table public.ticket_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_archived boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (name)
);

insert into public.ticket_categories (name, sort_order) values
  ('Sprzęt', 1),
  ('Oprogramowanie', 2),
  ('Dostępy i konta', 3),
  ('Sieć', 4),
  ('Inne', 5);

-- ---------------------------------------------------------------------------------------------
-- Zgłoszenia
-- ---------------------------------------------------------------------------------------------

create type public.ticket_priority as enum ('zwykly', 'wysoki', 'krytyczny');
create type public.ticket_status as enum ('nowe', 'w_trakcie', 'oczekujace', 'rozwiazane', 'zamkniete');

create sequence public.ticket_number_seq start 1;
create or replace function public.generate_ticket_number()
returns text
language sql
as $$
  select 'ZG/' || lpad(nextval('public.ticket_number_seq')::text, 5, '0');
$$;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique default public.generate_ticket_number(),
  title text not null,
  description text,
  category_id uuid references public.ticket_categories(id) on delete set null,
  status public.ticket_status not null default 'nowe',
  priority public.ticket_priority not null default 'zwykly',
  created_by uuid not null references public.profiles(id),
  -- Migawka nazwiska autora/osoby odpowiedzialnej w chwili ostatniej zmiany — patrz komentarz
  -- na górze pliku. Utrzymywane automatycznie przez trg_tickets_set_timestamps.
  created_by_name text not null,
  assigned_to uuid references public.profiles(id) on delete set null,
  assigned_to_name text,
  created_at timestamptz not null default now(),
  first_assigned_at timestamptz,
  last_assignee_changed_at timestamptz,
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz,
  is_archived boolean not null default false
);

create index idx_tickets_created_by on public.tickets(created_by);
create index idx_tickets_assigned_to on public.tickets(assigned_to);
create index idx_tickets_category on public.tickets(category_id);
create index idx_tickets_status on public.tickets(status);

-- Daty zdarzeń (utworzenie/pierwsze przydzielenie/ostatnia zmiana osoby odpowiedzialnej/
-- aktualizacja/rozwiązanie/zamknięcie) i migawki nazw są liczone tu automatycznie — żadna akcja
-- aplikacji nie ustawia ich ręcznie.
create or replace function public.tickets_set_timestamps()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by_name := coalesce((select full_name from public.profiles where id = new.created_by), '(nieznany)');
    if new.assigned_to is not null then
      new.assigned_to_name := (select full_name from public.profiles where id = new.assigned_to);
      new.first_assigned_at := now();
      new.last_assignee_changed_at := now();
    end if;
    return new;
  end if;

  new.updated_at := now();

  if new.assigned_to is distinct from old.assigned_to then
    new.last_assignee_changed_at := now();
    if new.first_assigned_at is null and new.assigned_to is not null then
      new.first_assigned_at := now();
    end if;
    new.assigned_to_name := case
      when new.assigned_to is not null then (select full_name from public.profiles where id = new.assigned_to)
      else null
    end;
  end if;

  if new.status is distinct from old.status then
    -- resolved_at: ustawiane przy wejściu w "rozwiazane", czyszczone przy wyjściu z niego —
    -- chyba że od razu zamykamy (wtedy data rozwiązania zostaje jako część historii).
    if new.status = 'rozwiazane' then
      new.resolved_at := now();
    elsif old.status = 'rozwiazane' and new.status <> 'zamkniete' then
      new.resolved_at := null;
    end if;

    -- closed_at: ustawiane przy zamknięciu, czyszczone przy ponownym otwarciu.
    if new.status = 'zamkniete' then
      new.closed_at := now();
    elsif old.status = 'zamkniete' then
      new.closed_at := null;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_tickets_set_timestamps
  before insert or update on public.tickets
  for each row execute function public.tickets_set_timestamps();

-- Historia najważniejszych zmian: status, priorytet, kategoria, osoba odpowiedzialna (plus wpis
-- utworzenia). Autor zmiany = auth.uid() w chwili zapisu, z migawką nazwiska.
create table public.ticket_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  actor_name text,
  action text not null check (action in ('utworzono', 'przydzielono', 'zmiana_statusu', 'zmiana_priorytetu', 'zmiana_kategorii')),
  field text,
  old_value text,
  new_value text,
  happened_at timestamptz not null default now()
);

create index idx_ticket_history_ticket on public.ticket_history(ticket_id);

create or replace function public.log_ticket_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_name text;
  v_old_category text;
  v_new_category text;
begin
  select full_name into v_actor_name from public.profiles where id = v_actor_id;

  if tg_op = 'INSERT' then
    insert into public.ticket_history (ticket_id, actor_id, actor_name, action, happened_at)
    values (new.id, v_actor_id, v_actor_name, 'utworzono', new.created_at);
    if new.assigned_to is not null then
      insert into public.ticket_history (ticket_id, actor_id, actor_name, action, field, new_value, happened_at)
      values (new.id, v_actor_id, v_actor_name, 'przydzielono', 'assigned_to', new.assigned_to_name, new.created_at);
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.ticket_history (ticket_id, actor_id, actor_name, action, field, old_value, new_value)
    values (new.id, v_actor_id, v_actor_name, 'zmiana_statusu', 'status', old.status::text, new.status::text);
  end if;

  if new.priority is distinct from old.priority then
    insert into public.ticket_history (ticket_id, actor_id, actor_name, action, field, old_value, new_value)
    values (new.id, v_actor_id, v_actor_name, 'zmiana_priorytetu', 'priority', old.priority::text, new.priority::text);
  end if;

  if new.category_id is distinct from old.category_id then
    select name into v_old_category from public.ticket_categories where id = old.category_id;
    select name into v_new_category from public.ticket_categories where id = new.category_id;
    insert into public.ticket_history (ticket_id, actor_id, actor_name, action, field, old_value, new_value)
    values (new.id, v_actor_id, v_actor_name, 'zmiana_kategorii', 'category_id', v_old_category, v_new_category);
  end if;

  if new.assigned_to is distinct from old.assigned_to then
    insert into public.ticket_history (ticket_id, actor_id, actor_name, action, field, old_value, new_value)
    values (new.id, v_actor_id, v_actor_name, 'przydzielono', 'assigned_to', old.assigned_to_name, new.assigned_to_name);
  end if;

  return new;
end;
$$;

create trigger trg_log_ticket_history
  after insert or update on public.tickets
  for each row execute function public.log_ticket_history();

-- Komentarze — autor i czas wpisu zapisywane wprost przez akcję dodającą komentarz (nie trzeba
-- triggera, nie ma tu żadnej wartości wyliczanej).
create table public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index idx_ticket_comments_ticket on public.ticket_comments(ticket_id);

-- ---------------------------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------------------------

alter table public.ticket_categories enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.ticket_history enable row level security;

create policy "odczyt kategorii ticketow" on public.ticket_categories
  for select using (
    public.can_create_tickets() or public.can_view_own_tickets()
    or public.can_view_assigned_tickets() or public.can_view_all_tickets()
    or public.can_admin_tickets()
  );
create policy "admin modulu zarzadza kategoriami ticketow" on public.ticket_categories
  for all using (public.can_admin_tickets()) with check (public.can_admin_tickets());

-- Widoczność ticketu: własny (jeśli can_view_own_tickets), przydzielony (can_view_assigned_tickets)
-- albo dowolny w dostępnych kategoriach (can_view_all_tickets) — plus administrator zawsze.
create policy "odczyt ticketow wg uprawnien" on public.tickets
  for select using (
    public.is_admin()
    or (public.can_view_own_tickets() and created_by = auth.uid())
    or (public.can_view_assigned_tickets() and assigned_to = auth.uid())
    or (public.can_view_all_tickets() and public.ticket_category_visible(category_id))
  );

create policy "tworzenie ticketow" on public.tickets
  for insert
  with check (public.can_create_tickets() and created_by = auth.uid());

-- Zapis: RLS pilnuje tylko "czy w ogóle wolno cokolwiek zmienić w widocznym tickecie" — które
-- KONKRETNIE pole wolno zmienić danej osobie (status vs priorytet vs przydział vs tytuł/opis)
-- jest egzekwowane w akcjach serwerowych (ticket-actions.ts), każda z osobnym sprawdzeniem
-- właściwej flagi, analogicznie do innych modułów w tej aplikacji.
create policy "edycja ticketow wg uprawnien" on public.tickets
  for update
  using (
    public.is_admin()
    or (public.can_view_own_tickets() and created_by = auth.uid())
    or (public.can_view_assigned_tickets() and assigned_to = auth.uid())
    or (public.can_view_all_tickets() and public.ticket_category_visible(category_id))
  )
  with check (
    public.is_admin()
    or public.can_edit_tickets() or public.can_change_ticket_status() or public.can_change_ticket_priority()
    or public.can_assign_tickets() or public.can_close_tickets() or public.can_admin_tickets()
  );

-- Podzapytania do public.tickets w politykach poniżej same przechodzą przez RLS tej tabeli —
-- komentarz/historia są więc widoczne dokładnie dla tych, którzy widzą sam ticket.
create policy "odczyt komentarzy widocznych ticketow" on public.ticket_comments
  for select using (exists (select 1 from public.tickets t where t.id = ticket_id));

create policy "dodawanie komentarzy" on public.ticket_comments
  for insert
  with check (
    public.can_comment_tickets()
    and author_id = auth.uid()
    and exists (select 1 from public.tickets t where t.id = ticket_id)
  );

create policy "odczyt historii widocznych ticketow" on public.ticket_history
  for select using (exists (select 1 from public.tickets t where t.id = ticket_id));
-- Brak polityki insert na ticket_history — wpisy tworzy wyłącznie SECURITY DEFINER trigger
-- (log_ticket_history), tak samo jak license_assignment_history (0033).
