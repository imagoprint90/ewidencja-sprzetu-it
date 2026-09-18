# Ewidencja sprzętu IT

Wewnętrzny system inwentaryzacji sprzętu IT: sprzęt, pracownicy, przydziały, zestawy
powiązanego sprzętu, oprogramowanie/licencje i protokoły PDF.

Stos technologiczny: Next.js (App Router) + TypeScript + Tailwind CSS, Supabase
(baza danych, logowanie, prywatne przechowywanie plików), hosting na Vercel.

- **Kod**: https://github.com/imagoprint90/ewidencja-sprzetu-it
- **Wersja na żywo**: https://ewidencja-sprzetu-it.vercel.app

## Stan projektu (Etapy 1-5 ukończone)

**Gotowe i działające, z danymi trwałymi w Supabase (nie w przeglądarce):**
- Logowanie e-mail/hasło przez Supabase Auth, z opcją przypomnienia hasła (link e-mail).
  Wszystkie strony poza `/logowanie` wymagają zalogowania (wymuszane w middleware/proxy
  i ponownie sprawdzane po stronie serwera — nie tylko ukrywaniem przycisków).
- Role „administrator” (pełny dostęp) i „podgląd” (tylko odczyt) — wymuszane realnie przez
  reguły RLS w bazie danych, a dodatkowo interfejs ukrywa akcje edycji przed rolą „podgląd”.
- Sprzęt: lista z wyszukiwarką, filtrami, wyborem widocznych kolumn, dodawanie i edycja
  (walidacja unikalności numeru inwentarzowego, spójność dat gwarancji) — wszystko zapisywane
  w bazie.
- Kategorie i Lokalizacje: dodawanie, zmiana nazwy, archiwizacja z blokadą, gdy są używane.
  Lokalizacja **sprzętu nie jest ręcznie edytowalna** — jest zsynchronizowana automatycznie
  z lokalizacją aktualnie przypisanego pracownika, a przy zwrocie do magazynu wraca do
  domyślnej lokalizacji „Magazyn” (ustawiane w `transfer_equipment_set`). Zmiana lokalizacji
  pracownika aktualizuje też lokalizację jego aktualnie przydzielonego sprzętu.
- Pracownicy: lista, karta pracownika, dodawanie, edycja, aktywacja/dezaktywacja.
- Lista sprzętu: edycja wprost w komórkach tabeli (kategoria, nazwa, nr seryjny, uwagi,
  status), zmiana kolejności i kolorów tekstu kolumn (zapamiętywane w przeglądarce),
  numeracja L.p. Status ma 5 wartości: W magazynie/Przydzielony (automatyczne, sterowane
  operacją „Przekaż sprzęt”) oraz W naprawie/Zepsuty/Wycofany (ustawiane ręcznie) — cały
  wiersz przyjmuje kolor odpowiadający statusowi (czarny/pomarańczowy/czerwony/szary).
- Karta sprzętu z zakładkami: Szczegóły, Przydziały (odczyt historii z bazy), Powiązany
  sprzęt (dodawanie/usuwanie powiązań w zestawie), Oprogramowanie/Dokumenty (informacyjne —
  pełna funkcjonalność w kolejnych etapach), Historia zmian.
- Układ responsywny (boczne menu chowane na telefonie), polskie daty i komunikaty.
- Pełny schemat bazy danych i reguły dostępu (RLS) zastosowane w Supabase —
  `supabase/migrations/`. Każda zmiana sprzętu/pracownika/kategorii jest też zapisywana w
  wewnętrznym dzienniku zdarzeń (`audit_log`) — podgląd tego dziennika w interfejsie to
  kolejny krok.

- **„Przekaż sprzęt”** (zakładka Przydziały na karcie sprzętu): pierwsze wydanie, przekazanie
  od pracownika A do B (z zachowaniem historii A), zwrot do magazynu, oraz przekazanie całego
  zestawu (sprzęt + zaznaczone powiązane urządzenia) — wszystko w jednej atomowej transakcji
  SQL (`transfer_equipment_set`, `supabase/migrations/0009_transfer_sets.sql`). Blokada dwóch
  aktywnych przydziałów tego samego sprzętu i walidacja dat są wymuszane w bazie danych, nie
  tylko w interfejsie.

- **Protokoły PDF** (Etap 4): automatyczne generowanie przy każdym przekazaniu/zwrocie —
  numer dokumentu, dane firmy, strony, lista sprzętu identyfikowanego przez producenta i model
  (nie wewnętrzną nazwę ewidencyjną) wraz z numerem seryjnym, z powtarzanym nagłówkiem tabeli
  na kolejnych stronach, stan techniczny, miejsca na podpis. Treść jest zamrożoną migawką
  (`snapshot` w tabeli `protocols`) — późniejsza edycja danych firmy/pracownika/sprzętu nie
  zmienia już wystawionych dokumentów. Strona **Protokoły** i zakładka **Dokumenty** na
  karcie sprzętu pozwalają pobrać PDF (prywatny magazyn plików, link ważny 60 s), ponowić
  nieudane generowanie (bez duplikowania numeru), dołączyć podpisany skan, wyszukiwać po
  numerze/sprzęcie/pracowniku/miejscowości i usunąć protokół (nieodwracalnie, razem z PDF).
  Lista sprzętu ma kolumnę z ikoną otwierającą ostatni protokół danego sprzętu.
- **Usuwanie sprzętu**: dostępne na karcie sprzętu. Zablokowane, dopóki istnieją powiązane
  protokoły (`protocol_items.equipment_id` ma teraz `ON DELETE RESTRICT`) — po ich usunięciu
  usunięcie sprzętu kasuje kaskadowo też jego historię przydziałów.
- **Oprogramowanie i licencje** (Etap 5): katalog produktów, rejestr licencji (na
  urządzenie / na użytkownika) z limitem stanowisk wymuszanym w bazie danych, przypisania do
  sprzętu lub pracowników, lista zainstalowanego oprogramowania na karcie sprzętu. Przy
  przekazaniu sprzętu system pokazuje, co zostaje przy urządzeniu, a jakie licencje osobiste
  poprzedniego użytkownika wymagają osobnej decyzji (nie są przenoszone automatycznie).
  Pulpit pokazuje licencje wygasające w ciągu 60 dni. Klucze aktywacyjne nie są nigdzie
  przechowywane ani wyświetlane.

**Zostało na później (dodatki, nieblokujące podstawowego procesu):**
- Import/eksport CSV, etykiety z kodami QR, przegląd inwentaryzacyjny.
- Pełne ukrycie akcji edycji przed rolą „podgląd” we wszystkich miejscach interfejsu (RLS w
  bazie już i tak blokuje te operacje niezależnie od interfejsu).

## Uruchomienie lokalne

Wymagany Node.js 20+ (masz zainstalowane Node 24 — wystarczy).

```bash
npm install
npm run dev
```

Aplikacja będzie dostępna pod adresem **http://localhost:3000**. Do zalogowania i
korzystania z aplikacji lokalnie potrzebny jest plik `.env.local` — patrz niżej. Bez niego
zobaczysz czytelny komunikat „Brak konfiguracji Supabase” zamiast błędu.

## Aktualizacja bazy po zmianach w kodzie

Gdy w repozytorium pojawi się nowy plik w `supabase/migrations/` (np. przy okazji nowego
etapu), zastosuj **tylko ten nowy plik** w SQL Editor Supabase (skopiuj jego zawartość,
wklej, Run) — nie uruchamiaj ponownie `apply_all.sql`, bo próbowałby odtworzyć od zera to,
co już istnieje. Nowy plik do zastosowania: `0018_delete_equipment_via_protocols.sql`
(zmienia, co blokuje usunięcie sprzętu — patrz niżej). Pliki 0009–0017 zostały już
zastosowane.
Pliki 0009–0011 zostały już zastosowane.

## Konfiguracja Supabase

Projekt Supabase jest już utworzony i skonfigurowany (schemat bazy, RLS, dane początkowe).
Żeby uruchomić aplikację **lokalnie** z prawdziwym logowaniem:

1. Skopiuj plik `.env.example` do `.env.local`.
2. W panelu Supabase: **Project Settings → API Keys** skopiuj `Project URL`,
   `Publishable key` i `Secret key` i wklej je do `.env.local` jako:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (wartość z „Publishable key”)
   - `SUPABASE_SERVICE_ROLE_KEY` (wartość z „Secret key”)

   **Nie wklejaj tych wartości do rozmowy ze mną** — wpisz je bezpośrednio do pliku
   `.env.local` na swoim komputerze (plik nie jest commitowany do repozytorium).
3. Uruchom ponownie `npm run dev`.

Te same trzy zmienne są już ustawione w Vercelu dla wersji produkcyjnej.

### Zakładanie kont użytkowników

Aplikacja **nie ma publicznej rejestracji** — konta administratorów i osób z dostępem
tylko do odczytu zakłada się ręcznie w panelu Supabase:

1. **Authentication → Users → Add user** — podaj e-mail i hasło (albo wyślij zaproszenie),
   zaznacz „Auto Confirm User”, żeby nie trzeba było potwierdzać e-maila.
2. Skopiuj `UID` nowo utworzonego użytkownika.
3. W **SQL Editor** uruchom (rola `administrator` — pełny dostęp, lub `podglad` — tylko
   odczyt, gdy interfejs zacznie to wymuszać w kolejnym etapie):
   ```sql
   insert into public.profiles (id, full_name, role)
   values ('<UID-uzytkownika>', 'Imię i Nazwisko', 'administrator');
   ```
   (RLS celowo nie pozwala nikomu samodzielnie nadać sobie roli — każde konto zakłada się
   w ten sposób).
4. Ta osoba może się teraz zalogować pod `/logowanie` swoim e-mailem i hasłem, oraz użyć
   „Nie pamiętasz hasła?”, żeby ustawić je samodzielnie linkiem e-mail.

## GitHub

```bash
git add .
git commit -m "opis zmiany"
git push
```

Każdy `git push` na branch `main` automatycznie uruchamia nowe wdrożenie na Vercelu.

## Wdrożenie na Vercel

Projekt jest połączony z repozytorium GitHub — wdrożenie produkcyjne
(https://ewidencja-sprzetu-it.vercel.app) aktualizuje się automatycznie po każdym
`git push` na `main`. Zmienne środowiskowe konfiguruje się w panelu Vercel:
Project → Settings → Environment Variables.

## Kopie zapasowe

- **Kod aplikacji** — kopią zapasową jest historia commitów w GitHubie.
- **Dane i dokumenty** — kopię zapasową bazy danych i plików (Storage) zapewnia panel
  Supabase: Project Settings → Database → Backups (kopie automatyczne, zależne od planu)
  oraz możliwość ręcznego eksportu przez `supabase db dump`. To są dwie osobne kopie
  zapasowe (kod ≠ dane) — żadna z nich nie zastępuje drugiej.

## Struktura projektu

```
src/app/(auth)/       strony logowania i resetu hasła (bez bocznego menu)
src/app/(app)/        chronione strony aplikacji (wymagają zalogowania) — jedna
                       podfolder na moduł: pulpit, sprzet, pracownicy, kategorie...
src/app/auth/callback/ wymiana linku e-mail (reset hasła) na sesję
src/proxy.ts           middleware: wymusza logowanie na chronionych trasach
src/components/       komponenty UI, pogrupowane wg modułu
src/lib/               typy, dane demo, magazyn stanu demo, formatowanie, walidacja (zod)
src/lib/supabase/      klienci Supabase (przeglądarka / serwer), błędy logowania po polsku
supabase/migrations/  pełny schemat bazy danych, reguły RLS, funkcje operacji na przydziałach
supabase/seed.sql     dane początkowe (kategorie, dane firmy)
```
