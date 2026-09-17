import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCompanySettings } from "@/lib/supabase/queries";

export default async function UstawieniaPage() {
  const supabase = await createSupabaseServerClient();
  const companySettings = await getCompanySettings(supabase);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Ustawienia</h1>
        <p className="text-sm text-muted">
          Dane firmy używane w nagłówku protokołów PDF oraz zarządzanie dostępem.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Dane firmy</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">Nazwa</dt>
            <dd className="mt-1 text-sm">{companySettings.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">NIP</dt>
            <dd className="mt-1 text-sm">{companySettings.nip ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">Adres</dt>
            <dd className="mt-1 text-sm">{companySettings.address}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-muted">
          Edycja tych pól z poziomu interfejsu (dla roli administratora) pojawi się w
          kolejnym etapie. Na razie zmień je bezpośrednio w tabeli{" "}
          <code className="rounded bg-black/10 px-1">company_settings</code> w Supabase.
        </p>
      </section>

      <section className="rounded-xl border border-dashed border-border bg-surface p-5">
        <h2 className="mb-2 text-sm font-semibold">Konta i dostęp</h2>
        <p className="text-sm text-muted">
          Logowanie działa (Supabase Auth). Role „administrator” i „podgląd” są już
          wymuszane w bazie danych (RLS) i częściowo w interfejsie. Konta zakłada się ręcznie
          w panelu Supabase — patrz README.md, sekcja „Zakładanie kont użytkowników”.
        </p>
      </section>

      <section className="rounded-xl border border-dashed border-border bg-surface p-5">
        <h2 className="mb-2 text-sm font-semibold">Kopie zapasowe</h2>
        <p className="text-sm text-muted">
          Kopią zapasową kodu aplikacji jest historia commitów w GitHubie. Kopię zapasową
          danych i dokumentów zapewnia panel Supabase (Project Settings → Database →
          Backups). Szczegóły w pliku README.md.
        </p>
      </section>
    </div>
  );
}
