"use client";

import { TICKET_PERMISSION_PRESETS, type TicketPermissions } from "@/lib/access";
import type { TicketCategory } from "@/lib/types";

type PermissionKey = keyof Omit<TicketPermissions, "visibleTicketCategories">;

const PERMISSION_FIELDS: { key: PermissionKey; label: string; hint: string }[] = [
  { key: "canCreate", label: "Tworzenie zgłoszeń", hint: "Dodawanie nowych ticketów." },
  { key: "canViewOwn", label: "Podgląd własnych", hint: "Przeglądanie zgłoszeń utworzonych przez siebie." },
  { key: "canViewAssigned", label: "Podgląd przypisanych", hint: "Przeglądanie zgłoszeń przydzielonych do obsługi." },
  { key: "canViewAll", label: "Podgląd wszystkich", hint: "Przeglądanie wszystkich zgłoszeń w dostępnych kategoriach." },
  { key: "canEdit", label: "Edycja zgłoszeń", hint: "Zmiana tytułu, opisu i kategorii." },
  { key: "canComment", label: "Komentowanie", hint: "Dodawanie komentarzy do dostępnych zgłoszeń." },
  { key: "canChangeStatus", label: "Zmiana statusu", hint: "Przekazywanie do realizacji, oczekiwania lub rozwiązania." },
  { key: "canChangePriority", label: "Zmiana priorytetu", hint: "Ustawianie priorytetu: zwykły, wysoki, krytyczny." },
  { key: "canAssign", label: "Przydzielanie zgłoszeń", hint: "Przypisywanie i przepisywanie ticketów innym użytkownikom." },
  { key: "canClose", label: "Zamykanie i ponowne otwieranie", hint: "Zamykanie zgłoszeń i przywracanie ich do obsługi." },
  { key: "canAdmin", label: "Administracja modułem", hint: "Zarządzanie kategoriami zgłoszeń i archiwizowanie ticketów." },
];

// Edytor 11 uprawnień modułu Tickety + lista kategorii widocznych przy "Podgląd wszystkich" —
// używany zarówno przy tworzeniu konta (NowyUzytkownikForm), jak i edycji istniejącego
// (UzytkownicyClient), więc jest to jeden kontrolowany komponent zamiast dwóch kopii JSX.
export function TicketPermissionsEditor({
  value,
  onChange,
  categories,
}: {
  value: TicketPermissions;
  onChange: (next: TicketPermissions) => void;
  categories: TicketCategory[];
}) {
  function toggle(key: PermissionKey) {
    onChange({ ...value, [key]: !value[key] });
  }

  function applyPreset(presetKey: keyof typeof TICKET_PERMISSION_PRESETS) {
    onChange({ ...TICKET_PERMISSION_PRESETS[presetKey].permissions, visibleTicketCategories: value.visibleTicketCategories });
  }

  function toggleCategory(id: string) {
    const current = value.visibleTicketCategories ?? [];
    const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id];
    onChange({ ...value, visibleTicketCategories: next });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {Object.entries(TICKET_PERMISSION_PRESETS).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            onClick={() => applyPreset(key as keyof typeof TICKET_PERMISSION_PRESETS)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/40 hover:bg-primary/5"
          >
            Szablon: {preset.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {PERMISSION_FIELDS.map((f) => (
          <label key={f.key} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={value[f.key]}
              onChange={() => toggle(f.key)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary"
            />
            <span>
              {f.label}
              <span className="block text-xs text-muted">{f.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {value.canViewAll && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            Kategorie zgłoszeń do podglądu „wszystkich”
          </p>
          {categories.length === 0 ? (
            <p className="text-sm text-muted">Brak kategorii zgłoszeń w systemie.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {categories
                .filter((c) => !c.isArchived)
                .map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={(value.visibleTicketCategories ?? []).includes(c.id)}
                      onChange={() => toggleCategory(c.id)}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                    {c.name}
                  </label>
                ))}
            </div>
          )}
          {(value.visibleTicketCategories ?? []).length === 0 && (
            <p className="mt-1.5 text-xs text-danger">
              Brak zaznaczonej kategorii — przez „Podgląd wszystkich” to konto zobaczy tylko
              zgłoszenia bez przypisanej kategorii (nie zobaczy żadnej skategoryzowanych).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
