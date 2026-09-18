"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, FormSection, inputClass } from "@/components/ui/Form";
import { useIsAdmin } from "@/lib/current-user-context";
import type { CompanySettings } from "@/lib/types";
import { updateCompanySettingsAction } from "@/lib/supabase/actions/company-actions";

export function UstawieniaClient({ companySettings }: { companySettings: CompanySettings }) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(companySettings.name);
  const [address, setAddress] = useState(companySettings.address);
  const [nip, setNip] = useState(companySettings.nip ?? "");
  const [representativeName, setRepresentativeName] = useState(companySettings.representativeName);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function startEdit() {
    setName(companySettings.name);
    setAddress(companySettings.address);
    setNip(companySettings.nip ?? "");
    setRepresentativeName(companySettings.representativeName);
    setError(null);
    setEditing(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    const result = await updateCompanySettingsAction({
      name,
      address,
      nip: nip || null,
      representativeName,
    });
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Ustawienia</h1>
        <p className="text-sm text-muted">
          Dane firmy używane w nagłówku protokołów PDF oraz zarządzanie dostępem.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Dane firmy</h2>
          {isAdmin && !editing && (
            <Button size="sm" variant="secondary" onClick={startEdit}>
              <Pencil size={14} />
              Edytuj dane
            </Button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormSection title="Dane firmy">
              <FormField label="Nazwa firmy" htmlFor="name" required full>
                <input id="name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
              </FormField>
              <FormField label="NIP" htmlFor="nip">
                <input id="nip" className={inputClass} value={nip} onChange={(e) => setNip(e.target.value)} />
              </FormField>
              <FormField label="Osoba reprezentująca (imię i nazwisko)" htmlFor="representativeName" required>
                <input
                  id="representativeName"
                  className={inputClass}
                  value={representativeName}
                  onChange={(e) => setRepresentativeName(e.target.value)}
                  placeholder="np. Jan Kowalski"
                />
              </FormField>
              <FormField label="Adres" htmlFor="address" required full>
                <textarea
                  id="address"
                  rows={2}
                  className={inputClass}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </FormField>
            </FormSection>
            {error && (
              <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
            )}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                Anuluj
              </Button>
              <Button type="submit" disabled={isSaving}>
                Zapisz zmiany
              </Button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">Nazwa</dt>
              <dd className="mt-1 text-sm">{companySettings.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">NIP</dt>
              <dd className="mt-1 text-sm">{companySettings.nip || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                Osoba reprezentująca
              </dt>
              <dd className="mt-1 text-sm">{companySettings.representativeName || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">Adres</dt>
              <dd className="mt-1 text-sm">{companySettings.address}</dd>
            </div>
          </dl>
        )}
        {!editing && (
          <p className="mt-4 text-xs text-muted">
            Osoba reprezentująca widnieje na protokołach PDF jako strona wydająca/odbierająca
            w imieniu firmy.
          </p>
        )}
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
