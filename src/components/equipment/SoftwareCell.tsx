"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export interface AssignedDeviceLicense {
  assignmentId: string;
  label: string;
}

export interface AvailableDeviceLicense {
  licenseId: string;
  label: string;
}

// Oprogramowanie sprzętu na liście zbiorczej: zainstalowane produkty (informacyjne chipy) oraz
// przypisane licencje "na urządzenie" (z możliwością odpięcia). Administrator/edytor może też
// od razu przypisać wolną licencję na urządzenie bez wchodzenia w moduł Oprogramowanie.
export function SoftwareCell({
  installedNames,
  deviceLicenses,
  availableLicenses,
  canEdit,
  onAssign,
  onRemove,
}: {
  installedNames: string[];
  deviceLicenses: AssignedDeviceLicense[];
  availableLicenses: AvailableDeviceLicense[];
  canEdit: boolean;
  onAssign: (licenseId: string) => Promise<{ ok: boolean; error?: string }>;
  onRemove: (assignmentId: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const empty = installedNames.length === 0 && deviceLicenses.length === 0;

  async function handleAssign() {
    if (!selected) return;
    setPending(true);
    const result = await onAssign(selected);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Nie udało się przypisać licencji.");
      return;
    }
    setError(null);
    setSelected("");
    setOpen(false);
  }

  async function handleRemove(assignmentId: string) {
    setPending(true);
    const result = await onRemove(assignmentId);
    setPending(false);
    if (!result.ok) setError(result.error ?? "Nie udało się usunąć przypisania.");
    else setError(null);
  }

  return (
    <div className="flex w-full flex-col gap-1" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-1">
        {empty && !canEdit && <span className="text-muted">—</span>}
        {installedNames.map((name) => (
          <span
            key={name}
            title="Zainstalowane oprogramowanie"
            className="inline-flex rounded bg-black/5 px-1.5 py-0.5 text-xs"
          >
            {name}
          </span>
        ))}
        {deviceLicenses.map((l) => (
          <span
            key={l.assignmentId}
            title="Licencja na urządzenie"
            className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
          >
            {l.label}
            {canEdit && (
              <button
                type="button"
                disabled={pending}
                onClick={() => handleRemove(l.assignmentId)}
                aria-label={`Odepnij licencję: ${l.label}`}
                title="Odepnij licencję"
                className="text-primary/70 hover:text-danger"
              >
                <X size={11} />
              </button>
            )}
          </span>
        ))}
        {canEdit && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            title="Przypisz wolną licencję (na urządzenie)"
            aria-label="Przypisz licencję"
            className="inline-flex items-center rounded p-0.5 text-muted hover:bg-black/5 hover:text-primary"
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      {open && (
        <div className="flex items-center gap-1">
          <div className="min-w-[180px] flex-1">
            <SearchableSelect
              options={availableLicenses.map((l) => ({ value: l.licenseId, label: l.label }))}
              value={selected}
              onChange={setSelected}
              placeholder={availableLicenses.length === 0 ? "Brak wolnych licencji" : "Wybierz licencję…"}
              searchPlaceholder="Szukaj licencji…"
            />
          </div>
          <button
            type="button"
            disabled={!selected || pending}
            onClick={handleAssign}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-40"
          >
            Przypisz
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted hover:underline">
            Anuluj
          </button>
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
