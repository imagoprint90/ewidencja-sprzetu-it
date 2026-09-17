"use client";

import { useStore } from "@/lib/store";

export default function UstawieniaPage() {
  const { companySettings } = useStore();

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
          W trybie demonstracyjnym dane są tylko do odczytu. Po podłączeniu Supabase (Etap 2)
          edycja tych pól będzie dostępna wyłącznie dla roli administratora.
        </p>
      </section>

      <section className="rounded-xl border border-dashed border-border bg-surface p-5">
        <h2 className="mb-2 text-sm font-semibold">Konta i dostęp</h2>
        <p className="text-sm text-muted">
          Logowanie oraz role „administrator” i „podgląd” zostaną uruchomione w Etapie 2, po
          podłączeniu Supabase Auth. Uprawnienia będą wymuszane po stronie serwera i przez
          polityki RLS w bazie danych — nie tylko przez ukrywanie przycisków w interfejsie.
        </p>
      </section>

      <section className="rounded-xl border border-dashed border-border bg-surface p-5">
        <h2 className="mb-2 text-sm font-semibold">Kopie zapasowe</h2>
        <p className="text-sm text-muted">
          Po podłączeniu Supabase kopia kodu aplikacji będzie utrzymywana w GitHubie, a kopia
          danych i dokumentów — przez mechanizmy kopii zapasowych Supabase (baza danych i
          Storage). Szczegóły znajdziesz w pliku README.md projektu.
        </p>
      </section>
    </div>
  );
}
