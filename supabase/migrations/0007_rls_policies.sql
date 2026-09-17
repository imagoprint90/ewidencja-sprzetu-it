-- Reguły dostępu (Row Level Security). Każdy dostęp do danych wymaga zalogowania
-- i istnienia wiersza w public.profiles. Rola "podglad" tylko odczytuje dane,
-- rola "administrator" może też je zmieniać. To jest jedyne realne zabezpieczenie —
-- ukrycie przycisków w interfejsie nie zastępuje tych reguł.

alter table public.profiles enable row level security;
alter table public.company_settings enable row level security;
alter table public.categories enable row level security;
alter table public.employees enable row level security;
alter table public.equipment enable row level security;
alter table public.equipment_links enable row level security;
alter table public.assignments enable row level security;
alter table public.software_products enable row level security;
alter table public.software_licenses enable row level security;
alter table public.software_license_assignments enable row level security;
alter table public.equipment_installed_software enable row level security;
alter table public.protocols enable row level security;
alter table public.protocol_items enable row level security;
alter table public.audit_log enable row level security;

-- profiles: użytkownik widzi własny profil; administrator widzi i zarządza wszystkimi.
create policy "profil wlasny" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "admin zarzadza profilami" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- company_settings: odczyt dla każdego zalogowanego, edycja tylko dla administratora.
create policy "odczyt ustawien firmy" on public.company_settings
  for select using (auth.uid() is not null);
create policy "admin edytuje ustawienia firmy" on public.company_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- Wzorzec powtarzany dla większości tabel: odczyt = zalogowany z profilem,
-- zapis/zmiana = wyłącznie administrator.
create policy "odczyt kategorii" on public.categories
  for select using (auth.uid() is not null);
create policy "admin zarzadza kategoriami" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

create policy "odczyt pracownikow" on public.employees
  for select using (auth.uid() is not null);
create policy "admin zarzadza pracownikami" on public.employees
  for all using (public.is_admin()) with check (public.is_admin());

create policy "odczyt sprzetu" on public.equipment
  for select using (auth.uid() is not null);
create policy "admin zarzadza sprzetem" on public.equipment
  for all using (public.is_admin()) with check (public.is_admin());

create policy "odczyt powiazan sprzetu" on public.equipment_links
  for select using (auth.uid() is not null);
create policy "admin zarzadza powiazaniami" on public.equipment_links
  for all using (public.is_admin()) with check (public.is_admin());

create policy "odczyt przydzialow" on public.assignments
  for select using (auth.uid() is not null);
-- Zapis do assignments odbywa się wyłącznie przez funkcje assign_equipment /
-- transfer_equipment / return_equipment (SECURITY INVOKER + własna weryfikacja is_admin()),
-- więc bezpośredni insert/update spoza tych funkcji blokujemy również na poziomie RLS.
create policy "admin zarzadza przydzialami" on public.assignments
  for all using (public.is_admin()) with check (public.is_admin());

create policy "odczyt produktow oprogramowania" on public.software_products
  for select using (auth.uid() is not null);
create policy "admin zarzadza produktami oprogramowania" on public.software_products
  for all using (public.is_admin()) with check (public.is_admin());

create policy "odczyt licencji" on public.software_licenses
  for select using (auth.uid() is not null);
create policy "admin zarzadza licencjami" on public.software_licenses
  for all using (public.is_admin()) with check (public.is_admin());

create policy "odczyt przypisan licencji" on public.software_license_assignments
  for select using (auth.uid() is not null);
create policy "admin zarzadza przypisaniami licencji" on public.software_license_assignments
  for all using (public.is_admin()) with check (public.is_admin());

create policy "odczyt zainstalowanego oprogramowania" on public.equipment_installed_software
  for select using (auth.uid() is not null);
create policy "admin zarzadza zainstalowanym oprogramowaniem" on public.equipment_installed_software
  for all using (public.is_admin()) with check (public.is_admin());

create policy "odczyt protokolow" on public.protocols
  for select using (auth.uid() is not null);
create policy "admin zarzadza protokolami" on public.protocols
  for all using (public.is_admin()) with check (public.is_admin());

create policy "odczyt pozycji protokolow" on public.protocol_items
  for select using (auth.uid() is not null);
create policy "admin zarzadza pozycjami protokolow" on public.protocol_items
  for all using (public.is_admin()) with check (public.is_admin());

-- audit_log: tylko administrator, żeby nie ujawniać historii zmian osobom z rolą podglądu.
create policy "admin czyta dziennik zmian" on public.audit_log
  for select using (public.is_admin());

-- Uwaga: pierwszy profil administratora trzeba utworzyć ręcznie w SQL Editor Supabase
-- (insert into public.profiles ...) po pierwszym logowaniu — patrz README.md, sekcja
-- "Konfiguracja Supabase".
