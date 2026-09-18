-- Zarządzanie kontami z poziomu aplikacji (zakładka "Użytkownicy", tylko dla administratora):
-- e-mail w profilu (potrzebny do wyświetlenia listy kont bez wywoływania Admin API za
-- każdym razem) oraz lista zakładek widocznych dla konta z rolą "podglad".
-- visible_tabs = null oznacza "brak ograniczeń, widzi wszystkie zakładki" — to bezpieczny
-- domyślny stan dla już istniejących kont, żeby ta migracja nikogo nie zablokowała.
-- Istniejące reguły RLS na public.profiles ("admin zarzadza profilami") już obejmują te
-- nowe kolumny — nie trzeba nic dodawać.

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists visible_tabs text[];

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;
