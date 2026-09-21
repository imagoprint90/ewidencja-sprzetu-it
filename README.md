# Ewidencja sprzętu IT

Wewnętrzny system inwentaryzacji sprzętu IT: sprzęt, pracownicy, przydziały, zestawy
powiązanego sprzętu, oprogramowanie/licencje i protokoły PDF.

Stos technologiczny: Next.js (App Router) + TypeScript + Tailwind CSS, Supabase
(baza danych, logowanie, prywatne przechowywanie plików), hosting na Vercel.

- **Kod**: https://github.com/imagoprint90/ewidencja-sprzetu-it
- **Wersja na żywo**: https://ewidencja-sprzetu-it.vercel.app

## Stan projektu (Etapy 1-6 ukończone)

**Gotowe i działające, z danymi trwałymi w Supabase (nie w przeglądarce):**
- Logowanie e-mail/hasło przez Supabase Auth, z opcją przypomnienia hasła (link e-mail).
  Wszystkie strony poza `/logowanie` wymagają zalogowania (wymuszane w middleware/proxy
  i ponownie sprawdzane po stronie serwera — nie tylko ukrywaniem przycisków). Każdy
  zalogowany użytkownik (niezależnie od roli) może zmienić własne hasło z poziomu menu przy
  swoim e-mailu w prawym górnym rogu — wymaga podania obecnego hasła.
- Uprawnienia są addytywne: każde konto ma rolę bazową — „administrator” (pełny dostęp i
  edycja wszędzie) albo „podgląd” (domyślnie tylko odczyt wszędzie) — a do tego dowolną
  kombinację dwóch niezależnie włączanych uprawnień dodatkowych (można mieć jedno, oba albo
  żadne):
  - **Edycja i podgląd sprzętu** — dodawanie, edycja i usuwanie sprzętu, wyłącznie w
    przypisanych kategoriach; sprzęt spoza tych kategorii jest całkowicie niewidoczny, nie
    tylko niedostępny do edycji.
  - **Przekazywanie sprzętu** — operacja „Przekaż sprzęt” (przydzielenie/zwrot) i generowanie
    protokołów, plus wgląd i usuwanie WYŁĄCZNIE własnych wystawionych protokołów.

  Wymuszane realnie przez reguły RLS w bazie danych (`supabase/migrations/0023...`–`0025...`),
  a dodatkowo interfejs ukrywa akcje niedostępne dla danego konta.
- **Użytkownicy** (Etap 6, zakładka `/uzytkownicy`, tylko dla administratora): zakładanie,
  usuwanie i reset hasła kont bezpośrednio z aplikacji (przez Supabase Admin API), zmiana roli
  i uprawnień dodatkowych, wybór widocznych zakładek oraz wybór kategorii sprzętu do edycji.
  Lista kont ma osobną kolumnę **Kategorie sprzętu do edycji**. Patrz sekcja „Zakładanie kont
  użytkowników” niżej.
- Sprzęt: lista z wyszukiwarką, filtrami wielokrotnego wyboru (checkboxy — np. kilka statusów
  albo kilka lokalizacji naraz), wyborem widocznych kolumn, dodawanie i edycja (walidacja
  unikalności numeru inwentarzowego, spójność dat gwarancji) — wszystko zapisywane w bazie.
  Filtry są zapamiętywane w przeglądarce (localStorage) i odtwarzane po przeładowaniu strony;
  link z pulpitu (np. „W naprawie”) zawsze nadpisuje zapamiętany filtr statusu.
- Kategorie i Lokalizacje: dodawanie, zmiana nazwy, oraz trwałe usuwanie (zablokowane, gdy
  lokalizacja/kategoria jest przypisana do pracowników lub sprzętu). Lokalizacje mają kolumnę
  **Aktywna: Tak/Nie** (przycisk Dezaktywuj/Aktywuj) — nieaktywna lokalizacja nie jest
  proponowana przy wyborze lokalizacji pracownika, ale zostaje widoczna na liście z filtrem
  po statusie (zamiast osobnej sekcji „zarchiwizowane”). Kolumny „Pracownicy” i „Sprzęt”
  pokazują konkretne imiona i nazwiska / nazwy sprzętu przypisane do danej lokalizacji (nie
  tylko liczbę), a wybór widocznych kolumn i ich kolejności (przycisk „Kolumny”) działa tak
  samo jak na liście Sprzęt. Lokalizacja **sprzętu nie jest
  ręcznie edytowalna** — jest zsynchronizowana automatycznie z lokalizacją aktualnie
  przypisanego pracownika, a przy zwrocie do magazynu wraca do domyślnej lokalizacji
  „Magazyn” (ustawiane w `transfer_equipment_set`). Zmiana lokalizacji pracownika aktualizuje
  też lokalizację jego aktualnie przydzielonego sprzętu.
- Pracownicy: imię i nazwisko to dwie osobne kolumny (nie jedno pole) — dotyczy listy,
  karty pracownika, formularzy i importu CSV. Lista ma filtry wielokrotnego wyboru
  (lokalizacja, dział, status — zapamiętywane jak w Sprzęcie), wybór widocznych kolumn i ich
  kolejności (przycisk „Kolumny”, tak jak w Sprzęcie) oraz edycję wprost w komórkach tabeli
  (e-mail, telefon, dział — bez wchodzenia na kartę pracownika). Karta pracownika: dodawanie,
  edycja, aktywacja/dezaktywacja, usuwanie (zablokowane, gdy pracownik ma historię
  przydziałów sprzętu — wtedy zamiast usuwania używa się dezaktywacji, żeby zachować
  historię). Dział i lokalizacja są opcjonalne — nie każdy pracownik musi je mieć
  uzupełnione. Import z pliku CSV — przycisk „Importuj CSV” obok listy, patrz sekcja
  „Import pracowników z CSV” niżej po strukturę pliku.
- **Sortowanie list kliknięciem w nagłówek kolumny** — działa na wszystkich tabelach
  w aplikacji (Sprzęt, Pracownicy, Lokalizacje, Kategorie, Protokoły, Użytkownicy). Pierwsze
  kliknięcie sortuje rosnąco, drugie na tym samym nagłówku — malejąco, strzałka przy
  nagłówku pokazuje aktualny kierunek. Sortowanie nie jest zapamiętywane między
  przeładowaniami strony (w przeciwieństwie do filtrów i widoczności kolumn).
- Lista sprzętu: edycja wprost w komórkach tabeli (kategoria, nazwa, nr seryjny, uwagi,
  status), zmiana kolejności i kolorów tekstu kolumn (zapamiętywane w przeglądarce),
  numeracja L.p. Status ma 5 wartości: W magazynie/Przydzielony (automatyczne, sterowane
  operacją „Przekaż sprzęt”) oraz W naprawie/Zepsuty/Wycofany (ustawiane ręcznie) — cały
  wiersz przyjmuje kolor odpowiadający statusowi (czarny/pomarańczowy/czerwony/szary).
  Checkboxy przy wierszach (tylko dla administratora) pozwalają zaznaczyć kilka pozycji
  naraz i użyć paska akcji zbiorczych nad tabelą: „Przydziel zaznaczone” (przenosi do
  formularza przekazania z resztą zaznaczonych pozycji dopiętą jako zestaw, niezależnie od
  formalnych powiązań) i „Usuń zaznaczone” (usuwa po kolei, pomijając zablokowane przez
  protokoły i informując, ile się udało). Dodatkowo każdy wiersz ma ikony szybkich akcji
  (Edytuj / Przydziel / Usuń) bez wchodzenia na kartę sprzętu.
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
  tylko w interfejsie. Opcjonalne pole **„Osoba przekazująca”** (checkbox, potem wybór z listy
  pracowników albo wpisanie ręcznie) — gdy uzupełnione, na protokole pojawia się jako
  dodatkowa strona z miejscem na podpis, obok Przekazującego i Odbierającego. Przydatne, gdy
  fizycznie sprzęt wydaje inna osoba niż reprezentant firmy z protokołu (np. informatyk).

- **Protokoły PDF** (Etap 4): automatyczne generowanie przy każdym przekazaniu/zwrocie —
  numer dokumentu, dane firmy, strony, lista sprzętu identyfikowanego przez producenta i model
  (nie wewnętrzną nazwę ewidencyjną) wraz z numerem seryjnym i ilością, z powtarzanym
  nagłówkiem tabeli na kolejnych stronach, stan techniczny jako osobna kolumna w tabeli sprzętu
  (nie jako oddzielny akapit — ważne, gdy na jednym protokole jest kilka różnych urządzeń),
  miejsca na podpis. Treść jest zamrożoną migawką (`snapshot` w tabeli `protocols`) —
  późniejsza edycja danych firmy/pracownika/sprzętu nie zmienia już wystawionych dokumentów.
  Strona **Protokoły** i zakładka **Dokumenty** na karcie sprzętu pozwalają pobrać PDF (prywatny
  magazyn plików, link ważny 60 s), ponowić nieudane generowanie (bez duplikowania numeru),
  dołączyć podpisany skan, wyszukiwać po numerze/sprzęcie/pracowniku/miejscowości i usunąć
  protokół (nieodwracalnie, razem z PDF). Lista Protokołów ma osobne kolumny „Sprzęt”
  (producent+model, jak na PDF) i „Nazwa sprzętu” (wewnętrzna nazwa ewidencyjna). Lista sprzętu
  ma kolumnę z ikoną otwierającą ostatni protokół danego sprzętu.
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
- Import CSV sprzętu, eksport CSV, etykiety z kodami QR, przegląd inwentaryzacyjny.
  (Import CSV pracowników już działa — patrz sekcja „Import pracowników z CSV” niżej.)
- Pełne ukrycie akcji edycji przed rolą „podgląd” we wszystkich miejscach interfejsu (RLS w
  bazie już i tak blokuje te operacje niezależnie od interfejsu).

## Import pracowników z CSV

Na liście **Pracownicy** przycisk „Importuj CSV” (widoczny tylko dla administratora) wczytuje
plik CSV i dodaje z niego wielu pracowników naraz.

**Wymagany nagłówek** (pierwszy wiersz pliku) — dokładne nazwy kolumn, wielkość liter i polskie
znaki nie mają znaczenia:

| Kolumna | Wymagana | Opis |
|---|---|---|
| `Imię` | tak | imię pracownika |
| `Nazwisko` | tak | nazwisko pracownika |
| `Email` | nie | adres e-mail, może być pusty |
| `Telefon` | nie | numer telefonu, może być pusty |
| `Dział` | nie | nazwa działu (dowolny tekst), może być pusta |
| `Lokalizacja` | nie | jeśli podana, musi dokładnie odpowiadać nazwie istniejącej, niezarchiwizowanej lokalizacji (patrz strona **Lokalizacje**) — pusta komórka po prostu zostawia pracownika bez lokalizacji |

Kolumny `Email`, `Telefon`, `Dział` i `Lokalizacja` można też całkiem pominąć w pliku, jeśli
nie są potrzebne — wymagane są tylko `Imię` i `Nazwisko`.

Przykładowy plik (separator przecinek lub średnik — wykrywany automatycznie, więc plik
wyeksportowany z polskiego Excela ze średnikami też zadziała):

```csv
Imię,Nazwisko,Email,Telefon,Dział,Lokalizacja
Jan,Kowalski,jan.kowalski@firma.pl,+48 600 000 000,IT,Warszawa
Anna,Nowak,,,Księgowość,Kraków
Piotr,Zieliński,,,,
```

Zapisz plik jako **CSV UTF-8** (w Excelu: Zapisz jako → „CSV UTF-8 (rozdzielany przecinkami)”),
żeby polskie znaki się nie posypały. Wiersz bez imienia albo nazwiska, albo z nierozpoznaną
lokalizacją (literówka w nazwie), jest pomijany, a system po imporcie pokazuje dokładnie które
wiersze i dlaczego — reszta i tak zostaje zaimportowana.

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
co już istnieje. Pliki 0009–0022 zostały już zastosowane. Nowe pliki do zastosowania, **w
podanej kolejności, każdy osobnym Run** (nie da się ich połączyć w jedno uruchomienie —
Postgres nie pozwala użyć nowej wartości enuma w tej samej transakcji, w której ją dodano):
1. `0023_equipment_editor_role.sql` (dodaje rolę „edycja_podglad” i kolumnę
   `visible_categories` w `profiles`)
2. `0024_equipment_editor_role_rls.sql` (reguły RLS dla tej roli — dopiero po zastosowaniu
   pliku 1)
3. `0025_multi_role_permissions.sql` (zastępuje pojedynczą rolę „edycja_podglad” addytywnymi
   flagami `can_edit_equipment`/`can_transfer_equipment`, dodaje uprawnienie „Przekazywanie
   sprzętu” i rozszerza „Edycja i podgląd” o dodawanie/usuwanie sprzętu — to pojedynczy plik,
   w przeciwieństwie do 0023/0024 nie trzeba go dzielić)

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

Aplikacja **nie ma publicznej rejestracji**. Od Etapu 6 konta zakłada się wygodnie z poziomu
samej aplikacji — zakładka **Użytkownicy** (widoczna w bocznym menu tylko dla roli
`administrator`, pod `/uzytkownicy`):

- **Dodaj użytkownika** — podaj imię i nazwisko, e-mail, hasło początkowe oraz rolę bazową:
  - `Administrator` — pełny dostęp i edycja wszędzie (uprawnienia dodatkowe poniżej go nie
    dotyczą, ma zawsze wszystko).
  - `Standardowe konto` — domyślnie wyłącznie odczyt, żadnych przycisków edycji. Do wyboru są
    dwa niezależne uprawnienia dodatkowe, które **można dowolnie łączyć** (jedno, oba albo
    żadne):
    - **Edycja i podgląd sprzętu** — dodawanie, edycja i usuwanie sprzętu (nazwa, numer
      seryjny, kategoria, status, uwagi) — **wyłącznie w zaznaczonych niżej kategoriach**.
      Sprzęt spoza tych kategorii jest dla takiego konta całkowicie niewidoczny, nie tylko
      zablokowany do edycji — to wymuszają reguły RLS w bazie (nie da się tego obejść inaczej
      niż przez zmianę uprawnień w tej zakładce).
    - **Przekazywanie sprzętu** — operacja „Przekaż sprzęt” (przydzielenie/zwrot) i
      generowanie protokołów. Takie konto widzi na liście Protokoły akcje (Usuń/Ponów/Skan)
      wyłącznie przy protokołach, które samo wystawiło — reszta jest dla niego tylko do
      odczytu, również wymuszane przez RLS.

  Wszystkie uprawnienia poza administratorem są wymuszane przez RLS w bazie, nie tylko
  ukryciem przycisków w interfejsie. Dla kont innych niż administrator zaznacz też, które
  zakładki dane konto ma widzieć (np. Sprzęt tak, Pracownicy nie) — zakładka Pulpit jest
  zawsze dostępna, a Użytkownicy zawsze wyłącznie dla administratora. Konto działa od razu,
  użytkownik loguje się podanym hasłem (może je później zmienić przez „Nie pamiętasz hasła?”
  na stronie logowania albo z menu przy swoim e-mailu po zalogowaniu).
- Na liście Użytkownicy przycisk **Zarządzaj** pozwala zmienić rolę/uprawnienia dodatkowe/
  widoczne zakładki/kategorie i zresetować hasło; **kosz** trwale usuwa konto (zablokowane dla
  własnego konta, żeby administrator nie odciął sobie dostępu). Kolumna **Kategorie sprzętu do
  edycji** pokazuje od razu na liście, które kategorie ma przypisane każde konto z uprawnieniem
  „Edycja i podgląd sprzętu” (i ostrzega na czerwono, jeśli uprawnienie jest włączone, ale nie
  zaznaczono żadnej kategorii — takie konto nie widzi wtedy żadnego sprzętu).
- Ograniczenie widoczności zakładek działa na poziomie stron (bezpośrednie wejście pod adres
  ukrytej zakładki też jest blokowane, nie tylko link w menu) — nie jest to jednak pełna
  reguła bazodanowa jak RLS dla uprawnień dodatkowych; np. nazwisko przydzielonego pracownika
  nadal pojawi się przy sprzęcie, nawet jeśli to konto nie ma dostępu do zakładki Pracownicy.
  Ograniczenie kategorii sprzętu i ograniczenie protokołów do własnych to co innego — to są
  twarde reguły RLS na samych tabelach, więc obejmują też ewentualny bezpośredni dostęp do
  bazy.

**Pierwsze konto administratora** trzeba założyć ręcznie w panelu Supabase (zanim ktokolwiek
może zalogować się do zakładki Użytkownicy):

1. **Authentication → Users → Add user** — podaj e-mail i hasło, zaznacz „Auto Confirm User”.
2. Skopiuj `UID` nowo utworzonego użytkownika.
3. W **SQL Editor** uruchom:
   ```sql
   insert into public.profiles (id, full_name, role)
   values ('<UID-uzytkownika>', 'Imię i Nazwisko', 'administrator');
   ```
4. Ta osoba loguje się pod `/logowanie` i od teraz zakłada kolejne konta już przez zakładkę
   Użytkownicy.

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
