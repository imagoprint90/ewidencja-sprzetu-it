"use client";

import { FilterX, Search } from "lucide-react";
import type { Category, Employee, EquipmentStatus, Location, SoftwareLicense, SoftwareProduct } from "@/lib/types";
import { TECHNICAL_CONDITION_LABELS, WINDOWS_EDITION_LABELS } from "@/lib/types";
import { useStatuses } from "@/lib/statuses-context";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";
import { employeeFullName, NO_LOCATION_FILTER, NO_PROTOCOL_CONDITION } from "@/lib/equipment-helpers";

export interface EquipmentFiltersState {
  query: string;
  categoryIds: string[];
  statuses: EquipmentStatus[];
  locationIds: string[];
  employeeIds: string[];
  domains?: ("tak" | "nie")[];
  openvpns?: ("tak" | "nie")[];
  conditions?: string[];
  windows?: string[];
  lastHolderIds?: string[];
  // "Oprogramowanie" — po produkcie (zainstalowanym albo z przypisaną licencją).
  softwareProductIds?: string[];
  // "Licencja" — po konkretnej licencji "na urządzenie" (tylko taki typ da się przypisać do
  // sprzętu — patrz kolumna Oprogramowanie).
  licenseIds?: string[];
}

export const EMPTY_EQUIPMENT_FILTERS: EquipmentFiltersState = {
  query: "",
  categoryIds: [],
  statuses: [],
  locationIds: [],
  employeeIds: [],
  domains: [],
  openvpns: [],
  conditions: [],
  windows: [],
  lastHolderIds: [],
  softwareProductIds: [],
  licenseIds: [],
};

export function EquipmentFilters({
  value,
  onChange,
  onClear,
  categories,
  employees,
  locations,
  softwareProducts,
  licenses,
}: {
  value: EquipmentFiltersState;
  onChange: (next: EquipmentFiltersState) => void;
  onClear: () => void;
  categories: Category[];
  employees: Employee[];
  locations: Location[];
  softwareProducts: SoftwareProduct[];
  licenses: SoftwareLicense[];
}) {
  const statusList = useStatuses();
  const productNameById = new Map(softwareProducts.map((p) => [p.id, p.name]));
  // Tylko licencje "na urządzenie" — tylko one da się kiedykolwiek przypisać do sprzętu
  // (licencje "na użytkownika" wiążą się z pracownikiem, nie z konkretnym urządzeniem).
  const deviceLicenseOptions = licenses
    .filter((l) => l.licenseType === "urzadzenie")
    .map((l) => ({
      value: l.id,
      label: `${productNameById.get(l.productId) ?? "Nieznany produkt"} (${l.seatsTotal} stan.)`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "pl"));

  const hasActiveFilters =
    value.query.trim() !== "" ||
    value.categoryIds.length > 0 ||
    value.statuses.length > 0 ||
    value.locationIds.length > 0 ||
    value.employeeIds.length > 0 ||
    [value.domains, value.openvpns, value.conditions, value.windows, value.lastHolderIds, value.softwareProductIds, value.licenseIds].some(
      (f) => (f ?? []).length > 0
    );

  function set<K extends keyof EquipmentFiltersState>(key: K, val: EquipmentFiltersState[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative flex-1 sm:min-w-[240px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={value.query}
          onChange={(e) => set("query", e.target.value)}
          placeholder="Szukaj: nazwa, nr seryjny, nr inwentarzowy, pracownik…"
          className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <MultiSelectFilter
        label="Kategoria"
        options={categories.filter((c) => !c.isArchived).map((c) => ({ value: c.id, label: c.name }))}
        selected={value.categoryIds}
        onChange={(v) => set("categoryIds", v)}
      />

      <MultiSelectFilter
        label="Status"
        options={statusList.map((s) => ({ value: s.key, label: s.label }))}
        selected={value.statuses}
        onChange={(v) => set("statuses", v as EquipmentStatus[])}
      />

      <MultiSelectFilter
        label="Lokalizacja"
        options={[
          ...locations.map((l) => ({ value: l.id, label: l.name })),
          { value: NO_LOCATION_FILTER, label: "Bez lokalizacji" },
        ]}
        selected={value.locationIds}
        onChange={(v) => set("locationIds", v)}
      />

      <MultiSelectFilter
        label="Domena"
        options={[
          { value: "tak", label: "TAK" },
          { value: "nie", label: "NIE" },
        ]}
        selected={value.domains ?? []}
        onChange={(v) => set("domains", v as ("tak" | "nie")[])}
      />

      <MultiSelectFilter
        label="OpenVPN"
        options={[
          { value: "tak", label: "TAK" },
          { value: "nie", label: "NIE" },
        ]}
        selected={value.openvpns ?? []}
        onChange={(v) => set("openvpns", v as ("tak" | "nie")[])}
      />

      <MultiSelectFilter
        label="Stan techniczny"
        options={[
          ...Object.values(TECHNICAL_CONDITION_LABELS).map((l) => ({ value: l, label: l })),
          { value: NO_PROTOCOL_CONDITION, label: "Nie określono" },
        ]}
        selected={value.conditions ?? []}
        onChange={(v) => set("conditions", v)}
      />

      <MultiSelectFilter
        label="Windows"
        options={[
          ...Object.entries(WINDOWS_EDITION_LABELS).map(([value, label]) => ({ value, label })),
          { value: "brak", label: "Nie określono" },
        ]}
        selected={value.windows ?? []}
        onChange={(v) => set("windows", v)}
      />

      <MultiSelectFilter
        label="Pracownik"
        options={employees.map((e) => ({ value: e.id, label: employeeFullName(e) }))}
        selected={value.employeeIds}
        onChange={(v) => set("employeeIds", v)}
      />

      <MultiSelectFilter
        label="Ostatni posiadacz"
        options={employees.map((e) => ({ value: e.id, label: employeeFullName(e) }))}
        selected={value.lastHolderIds ?? []}
        onChange={(v) => set("lastHolderIds", v)}
      />

      <MultiSelectFilter
        label="Oprogramowanie"
        options={softwareProducts.map((p) => ({
          value: p.id,
          label: p.version ? `${p.name} ${p.version}` : p.name,
        }))}
        selected={value.softwareProductIds ?? []}
        onChange={(v) => set("softwareProductIds", v)}
      />

      <MultiSelectFilter
        label="Licencja"
        options={deviceLicenseOptions}
        selected={value.licenseIds ?? []}
        onChange={(v) => set("licenseIds", v)}
      />

      <button
        type="button"
        onClick={onClear}
        disabled={!hasActiveFilters}
        title="Czyść wszystkie filtry"
        aria-label="Czyść wszystkie filtry"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm text-muted transition-colors hover:border-danger/40 hover:text-danger disabled:cursor-default disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted"
      >
        <FilterX size={14} />
        Wyczyść
      </button>
    </div>
  );
}
