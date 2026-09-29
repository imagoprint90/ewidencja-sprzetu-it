-- "Zainstalowane oprogramowanie" i licencje "na urządzenie" były dotąd całkowicie niezależne:
-- oznaczenie produktu jako zainstalowanego nie zajmowało żadnego stanowiska licencji, więc
-- licencja mogła pokazywać 0/N zajętych stanowisk mimo bycia zainstalowaną na kilku sprzętach.
-- Od teraz oba kierunki są ze sobą powiązane triggerami:
--   * oznaczenie jako zainstalowane -> automatycznie zajmuje wolne stanowisko pasującej
--     licencji "na urządzenie" (jeśli taka istnieje i ma wolne miejsce; w przeciwnym razie
--     instalacja i tak przechodzi, po prostu bez licencji — jak dotychczas dla produktów bez
--     licencji albo bez wolnych stanowisk),
--   * odinstalowanie -> zwalnia to stanowisko,
--   * przypisanie licencji "na urządzenie" wprost (moduł Oprogramowanie / lista Sprzęt) ->
--     oznacza produkt jako zainstalowany na tym sprzęcie,
--   * odpięcie licencji -> odznacza go.
-- Każdy z czterech triggerów sprawdza najpierw, czy odpowiedni wpis już istnieje (owner nie
-- dubluje przypisań), więc wzajemne odpalanie się triggerów zatrzymuje się po jednym kroku.

create or replace function public.link_install_to_license()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_license_id uuid;
begin
  -- Ten sprzęt ma już jakąkolwiek licencję tego produktu — nic więcej nie dokładamy (chroni
  -- też przed zapętleniem triggerów, gdy ten insert powstał w wyniku przypisania licencji).
  if exists (
    select 1
    from public.software_license_assignments a
    join public.software_licenses l on l.id = a.license_id
    where a.equipment_id = new.equipment_id and l.product_id = new.software_product_id
  ) then
    return new;
  end if;

  select l.id into v_license_id
  from public.software_licenses l
  where l.product_id = new.software_product_id
    and l.license_type = 'urzadzenie'
    and (select count(*) from public.software_license_assignments a where a.license_id = l.id) < l.seats_total
  order by l.created_at
  limit 1;

  if v_license_id is not null then
    insert into public.software_license_assignments (license_id, equipment_id)
    values (v_license_id, new.equipment_id);
  end if;

  return new;
exception
  -- Zajęcie stanowiska nie może zablokować samego oznaczenia jako zainstalowane.
  when others then
    return new;
end;
$$;

drop trigger if exists trg_link_install_to_license on public.equipment_installed_software;
create trigger trg_link_install_to_license
  after insert on public.equipment_installed_software
  for each row execute function public.link_install_to_license();

create or replace function public.unlink_install_from_license()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.software_license_assignments a
  using public.software_licenses l
  where a.license_id = l.id
    and l.product_id = old.software_product_id
    and l.license_type = 'urzadzenie'
    and a.equipment_id = old.equipment_id;
  return old;
exception
  when others then
    return old;
end;
$$;

drop trigger if exists trg_unlink_install_from_license on public.equipment_installed_software;
create trigger trg_unlink_install_from_license
  after delete on public.equipment_installed_software
  for each row execute function public.unlink_install_from_license();

create or replace function public.link_license_to_install()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id uuid;
  v_type public.license_type;
begin
  select product_id, license_type into v_product_id, v_type
  from public.software_licenses where id = new.license_id;

  if v_type = 'urzadzenie' and new.equipment_id is not null then
    insert into public.equipment_installed_software (equipment_id, software_product_id)
    values (new.equipment_id, v_product_id)
    on conflict (equipment_id, software_product_id) do nothing;
  end if;

  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists trg_link_license_to_install on public.software_license_assignments;
create trigger trg_link_license_to_install
  after insert on public.software_license_assignments
  for each row execute function public.link_license_to_install();

create or replace function public.unlink_license_from_install()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id uuid;
begin
  if old.equipment_id is null then
    return old;
  end if;
  select product_id into v_product_id from public.software_licenses where id = old.license_id;
  if v_product_id is not null then
    delete from public.equipment_installed_software
    where equipment_id = old.equipment_id and software_product_id = v_product_id;
  end if;
  return old;
exception
  when others then
    return old;
end;
$$;

drop trigger if exists trg_unlink_license_from_install on public.software_license_assignments;
create trigger trg_unlink_license_from_install
  after delete on public.software_license_assignments
  for each row execute function public.unlink_license_from_install();

-- Jednorazowe uzupełnienie danych: dla sprzętu, gdzie produkt jest już oznaczony jako
-- zainstalowany, ale nie ma żadnej licencji tego produktu, spróbuj przypisać wolne stanowisko
-- pasującej licencji "na urządzenie" — dokładnie ta sama reguła, co przy nowej instalacji.
do $$
declare
  r record;
  v_license_id uuid;
begin
  for r in
    select eis.equipment_id, eis.software_product_id
    from public.equipment_installed_software eis
    where not exists (
      select 1
      from public.software_license_assignments a
      join public.software_licenses l on l.id = a.license_id
      where a.equipment_id = eis.equipment_id and l.product_id = eis.software_product_id
    )
  loop
    select l.id into v_license_id
    from public.software_licenses l
    where l.product_id = r.software_product_id
      and l.license_type = 'urzadzenie'
      and (select count(*) from public.software_license_assignments a where a.license_id = l.id) < l.seats_total
    order by l.created_at
    limit 1;

    if v_license_id is not null then
      insert into public.software_license_assignments (license_id, equipment_id)
      values (v_license_id, r.equipment_id);
    end if;
  end loop;
end $$;
