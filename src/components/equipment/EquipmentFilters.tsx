"use client";

import { Search } from "lucide-react";
import type { Category, Employee, EquipmentStatus, Location } from "@/lib/types";
import { TECHNICAL_CONDITION_LABELS } from "@/lib/types";
import { useStatuses } from "@/lib/statuses-context";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";
import { employeeFullName, NO_PROTOCOL_CONDITION } from "@/lib/equipment-helpers";

export interface EquipmentFiltersState {
  query: string;
  categoryIds: string[];
  statuses: EquipmentStatus[];
  locationIds: string[];
  employeeIds: string[];
  domains?: ("tak" | "nie")[];
  conditions?: string[];
}

export const EMPTY_EQUIPMENT_FILTERS: EquipmentFiltersState = {
  query: "",
  categoryIds: [],
  statuses: [],
  locationIds: [],
  employeeIds: [],
  domains: [],
  conditions: [],
};

export function EquipmentFilters({
  value,
  onChange,
  categories,
  employees,
  locations,
}: {
  value: EquipmentFiltersState;
  onChange: (next: EquipmentFiltersState) => void;
  categories: Category[];
  employees: Employee[];
  locations: Location[];
}) {
  const statusList = useStatuses();

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
        options={locations.map((l) => ({ value: l.id, label: l.name }))}
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
        label="Stan techniczny"
        options={[
          ...Object.values(TECHNICAL_CONDITION_LABELS).map((l) => ({ value: l, label: l })),
          { value: NO_PROTOCOL_CONDITION, label: "Nie określono" },
        ]}
        selected={value.conditions ?? []}
        onChange={(v) => set("conditions", v)}
      />

      <MultiSelectFilter
        label="Pracownik"
        options={employees.map((e) => ({ value: e.id, label: employeeFullName(e) }))}
        selected={value.employeeIds}
        onChange={(v) => set("employeeIds", v)}
      />
    </div>
  );
}
