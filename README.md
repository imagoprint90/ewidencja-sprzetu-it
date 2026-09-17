# Ewidencja sprzętu IT

Wewnętrzny system inwentaryzacji sprzętu IT: sprzęt, pracownicy, przydziały, zestawy
powiązanego sprzętu, oprogramowanie/licencje i protokoły PDF.

Stos technologiczny: Next.js (App Router) + TypeScript + Tailwind CSS, Supabase
(baza danych, logowanie, prywatne przechowywanie plików), hosting docelowo na Vercel.

## Stan projektu (Etap 1 z 5)

**Gotowe i działające:**
- Sprzęt: lista z wyszukiwarką, filtrami, wyborem widocznych kolumn, dodawanie i edycja
  (walidacja unikalności numeru inwentarzowego, spójność dat gwarancji).
- Kategorie: dodawanie, zmiana nazwy, archiwizacja z blokadą, gdy kategoria jest używana.
- Pracownicy: lista, karta pracownika, dodawanie, aktywacja/dezaktywacja.
- Karta sprzętu z zakładkami: Szczegóły, Przydziały (odczyt historii), Powiązany sprzęt
  (dodawanie/usuwanie powiązań w zestawie), Oprogramowanie/Dokumenty/Historia zmian
  (zakładki informacyjne — pełna funkcjonalność w kolejnych etapach).
- Układ responsywny (boczne menu chowane na telefonie), polskie daty i komunikaty.

**Tryb demonstracyjny:** wszystkie dane (sprzęt, pracownicy, przydziały) żyją wyłącznie
w pamięci przeglądarki i znikają po odświeżeniu strony. To **nie jest** jeszcze trwały
system firmowy — trwałość, logowanie i uprawnienia to Etap 2.

**Przygotowane, ale jeszcze niepodłączone:**
- Pełny schemat bazy danych i reguły dostępu (RLS) dla Supabase — `supabase/migrations/`.
- Operacja „Przekaż sprzęt” / zwrot do magazynu jako atomowe funkcje SQL — Etap 3.
- Generowanie protokołów PDF — Etap 4.
- Katalog oprogramowania i licencji, pulpit z gwarancjami/licencjami — Etap 5.

## Uruchomienie lokalne (tryb demonstracyjny)

Wymagany Node.js 20+ (masz zainstalowane Node 24 — wystarczy).

```bash
npm install
npm run dev
```

Aplikacja będzie dostępna pod adresem **http://localhost:3000** (przekierowuje na
`/pulpit`). Dane są fikcyjne i resetują się po odświeżeniu strony.

## Konfiguracja Supabase (Etap 2 — wymaga Twojego działania)

Gdy zdecydujesz się podłączyć trwałą bazę danych, wykonaj kolejno:

1. **Utwórz projekt** w [supabase.com](https://supabase.com) (jeśli jeszcze go nie masz).
2. **Zastosuj migracje** z folderu `supabase/migrations/` w kolejności numerycznej —
   najprościej przez SQL Editor w panelu Supabase (wklej zawartość każdego pliku
   `000X_*.sql` po kolei i uruchom), albo przez [Supabase CLI](https://supabase.com/docs/guides/cli):
   ```bash
   supabase link --project-ref <twoj-project-ref>
   supabase db push
   ```
3. **Wgraj dane początkowe** — uruchom `supabase/seed.sql` w SQL Editor (ustawia
   7 początkowych kategorii i przykładowe dane firmy).
4. **Skopiuj klucze API**: Project Settings → API. Skopiuj plik `.env.example` do
   `.env.local` i uzupełnij:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (tylko do operacji serwerowych, np. generowania PDF)

   **Nie wklejaj tych wartości do rozmowy ze mną** — wpisz je bezpośrednio do pliku
   `.env.local` na swoim komputerze (nie jest on commitowany do repozytorium).
5. **Włącz logowanie e-mail/hasło** w Authentication → Providers.
6. **Utwórz pierwsze konto administratora**: zaloguj się raz w aplikacji (po
   uruchomieniu Etapu 2), a następnie w SQL Editor uruchom:
   ```sql
   insert into public.profiles (id, full_name, role)
   values ('<uuid-uzytkownika-z-auth.users>', 'Twoje Imię i Nazwisko', 'administrator');
   ```
   (RLS celowo nie pozwala nikomu samodzielnie nadać sobie roli administratora —
   pierwsze konto trzeba założyć ręcznie).
7. Poinformuj mnie, że baza jest gotowa — podłączę interfejs do rzeczywistych danych
   zamiast trybu demonstracyjnego.

## GitHub

Repozytorium Git nie zostało jeszcze zainicjowane w tym folderze — **Git nie jest
zainstalowany** na tym komputerze. Zainstaluj go (przez winget) i zainicjuj repozytorium:

```bash
winget install --id Git.Git -e --source winget
```

Po instalacji (w nowym oknie terminala, żeby PATH się odświeżył):

```bash
git init
git add .
git commit -m "Etap 1: szkielet aplikacji, dane demonstracyjne, migracje Supabase"
```

Następnie utwórz puste repozytorium na GitHub (bez README/gitignore, żeby uniknąć
konfliktów) i połącz je:

```bash
git remote add origin https://github.com/<twoj-login>/<nazwa-repo>.git
git branch -M main
git push -u origin main
```

## Wdrożenie na Vercel (dopiero na Twoje polecenie)

Nie wdrażam aplikacji automatycznie. Gdy będziesz gotów/gotowa:

1. Zaloguj się na [vercel.com](https://vercel.com) i zaimportuj repozytorium z GitHub.
2. W ustawieniach projektu (Environment Variables) dodaj te same zmienne co w
   `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`).
3. Kliknij Deploy.

## Kopie zapasowe

- **Kod aplikacji** — kopią zapasową jest historia commitów w GitHubie (patrz wyżej).
- **Dane i dokumenty** — po podłączeniu Supabase kopię zapasową bazy danych i plików
  (Storage) zapewnia panel Supabase: Project Settings → Database → Backups (kopie
  automatyczne, zależne od planu) oraz możliwość ręcznego eksportu przez
  `supabase db dump`. To są dwie osobne kopie zapasowe (kod ≠ dane) — żadna z nich
  nie zastępuje drugiej.

## Struktura projektu

```
src/app/            strony (App Router) — jedna podfolder na moduł
src/components/     komponenty UI, pogrupowane wg modułu
src/lib/            typy, dane demo, magazyn stanu demo, formatowanie, walidacja (zod)
src/lib/supabase/   klienci Supabase (przeglądarka / serwer) — nieużywane do Etapu 2
supabase/migrations/ pełny schemat bazy danych, reguły RLS, funkcje operacji na przydziałach
supabase/seed.sql   dane początkowe (kategorie, dane firmy)
```
