"use client";

import { Search } from "lucide-react";
import type { Category, Employee, EquipmentStatus } from "@/lib/types";
import { EQUIPMENT_STATUS_LABELS } from "@/lib/types";

export interface EquipmentFiltersState {
  query: string;
  categoryId: string;
  status: EquipmentStatus | "";
  location: string;
  employeeId: string;
}

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
  locations: string[];
}) {
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

      <select
        value={value.categoryId}
        onChange={(e) => set("categoryId", e.target.value)}
        className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
      >
        <option value="">Wszystkie kategorie</option>
        {categories
          .filter((c) => !c.isArchived)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </select>

      <select
        value={value.status}
        onChange={(e) => set("status", e.target.value as EquipmentStatus | "")}
        className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
      >
        <option value="">Wszystkie statusy</option>
        {Object.entries(EQUIPMENT_STATUS_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>

      <select
        value={value.location}
        onChange={(e) => set("location", e.target.value)}
        className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
      >
        <option value="">Wszystkie lokalizacje</option>
        {locations.map((loc) => (
          <option key={loc} value={loc}>
            {loc}
          </option>
        ))}
      </select>

      <select
        value={value.employeeId}
        onChange={(e) => set("employeeId", e.target.value)}
        className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
      >
        <option value="">Wszyscy pracownicy</option>
        {employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.fullName}
          </option>
        ))}
      </select>
    </div>
  );
}
