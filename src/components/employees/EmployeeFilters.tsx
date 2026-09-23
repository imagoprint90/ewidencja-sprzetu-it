"use client";

import { Search } from "lucide-react";
import type { Department, Location } from "@/lib/types";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";

export type EmployeeStatusFilter = "aktywny" | "nieaktywny";

export interface EmployeeFiltersState {
  query: string;
  locationIds: string[];
  departmentIds: string[];
  statuses: EmployeeStatusFilter[];
}

export const DEFAULT_EMPLOYEE_FILTERS: EmployeeFiltersState = {
  query: "",
  locationIds: [],
  departmentIds: [],
  statuses: ["aktywny"],
};

export function EmployeeFilters({
  value,
  onChange,
  locations,
  departments,
}: {
  value: EmployeeFiltersState;
  onChange: (next: EmployeeFiltersState) => void;
  locations: Location[];
  departments: Department[];
}) {
  function set<K extends keyof EmployeeFiltersState>(key: K, val: EmployeeFiltersState[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative flex-1 sm:min-w-[240px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={value.query}
          onChange={(e) => set("query", e.target.value)}
          placeholder="Szukaj pracownika…"
          className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <MultiSelectFilter
        label="Lokalizacja"
        options={locations.map((l) => ({ value: l.id, label: l.name }))}
        selected={value.locationIds}
        onChange={(v) => set("locationIds", v)}
      />

      <MultiSelectFilter
        label="Dział"
        options={departments.map((d) => ({ value: d.id, label: d.name }))}
        selected={value.departmentIds}
        onChange={(v) => set("departmentIds", v)}
      />

      <MultiSelectFilter
        label="Status"
        options={[
          { value: "aktywny", label: "Aktywny" },
          { value: "nieaktywny", label: "Nieaktywny" },
        ]}
        selected={value.statuses}
        onChange={(v) => set("statuses", v as EmployeeStatusFilter[])}
      />
    </div>
  );
}
