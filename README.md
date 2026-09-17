# Ewidencja sprzętu IT

Wewnętrzny system inwentaryzacji sprzętu IT: sprzęt, pracownicy, przydziały, zestawy
powiązanego sprzętu, oprogramowanie/licencje i protokoły PDF.

Stos technologiczny: Next.js (App Router) + TypeScript + Tailwind CSS, Supabase
(baza danych, logowanie, prywatne przechowywanie plików), hosting na Vercel.

- **Kod**: https://github.com/imagoprint90/ewidencja-sprzetu-it
- **Wersja na żywo**: https://ewidencja-sprzetu-it.vercel.app

## Stan projektu (Etap 2 ukończony)

**Gotowe i działające, z danymi trwałymi w Supabase (nie w przeglądarce):**
- Logowanie e-mail/hasło przez Supabase Auth, z opcją przypomnienia hasła (link e-mail).
  Wszystkie strony poza `/logowanie` wymagają zalogowania (wymuszane w middleware/proxy
  i ponownie sprawdzane po stronie serwera — nie tylko ukrywaniem przycisków).
- Role „administrator” (pełny dostęp) i „podgląd” (tylko odczyt) — wymuszane realnie przez
  reguły RLS w bazie danych, a dodatkowo interfejs ukrywa akcje edycji przed rolą „podgląd”.
- Sprzęt: lista z wyszukiwarką, filtrami, wyborem widocznych kolumn, dodawanie i edycja
  (walidacja unikalności numeru inwentarzowego, spójność dat gwarancji) — wszystko zapisywane
  w bazie.
- Kategorie: dodawanie, zmiana nazwy, archiwizacja z blokadą, gdy kategoria jest używana.
- Pracownicy: lista, karta pracownika, dodawanie, aktywacja/dezaktywacja.
- Karta sprzętu z zakładkami: Szczegóły, Przydziały (odczyt historii z bazy), Powiązany
  sprzęt (dodawanie/usuwanie powiązań w zestawie), Oprogramowanie/Dokumenty (informacyjne —
  pełna funkcjonalność w kolejnych etapach), Historia zmian.
- Układ responsywny (boczne menu chowane na telefonie), polskie daty i komunikaty.
- Pełny schemat bazy danych i reguły dostępu (RLS) zastosowane w Supabase —
  `supabase/migrations/`. Każda zmiana sprzętu/pracownika/kategorii jest też zapisywana w
  wewnętrznym dzienniku zdarzeń (`audit_log`) — podgląd tego dziennika w interfejsie to
  kolejny krok.

**Przygotowane, ale jeszcze niepodłączone:**
- Operacja „Przekaż sprzęt” / zwrot do magazynu jako atomowe funkcje SQL (funkcje już są w
  `supabase/migrations/0003_assignments.sql`, brakuje tylko interfejsu) — Etap 3.
- Generowanie protokołów PDF — Etap 4.
- Katalog oprogramowania i licencji, pulpit z gwarancjami/licencjami — Etap 5.

## Uruchomienie lokalne

Wymagany Node.js 20+ (masz zainstalowane Node 24 — wystarczy).

```bash
npm install
npm run dev
```

Aplikacja będzie dostępna pod adresem **http://localhost:3000**. Do zalogowania i
korzystania z aplikacji lokalnie potrzebny jest plik `.env.local` — patrz niżej. Bez niego
zobaczysz czytelny komunikat „Brak konfiguracji Supabase” zamiast błędu.

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
