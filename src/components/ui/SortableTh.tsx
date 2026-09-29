"use client";

import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import type { SortDirection } from "@/lib/sort";

// Nagłówek kolumny klikalny do sortowania: pierwszy klik sortuje rosnąco, kolejny klik na
// ten sam nagłówek — malejąco. Używać wewnątrz <tr> zamiast zwykłego <th>.
export function SortableTh({
  label,
  sortKey,
  currentKey,
  direction,
  onSort,
  className = "px-4 py-3 font-medium",
  align,
  resizeHandle,
}: {
  label: string;
  sortKey: string;
  currentKey: string | null;
  direction: SortDirection;
  onSort: (key: string) => void;
  className?: string;
  align?: "right";
  // Uchwyt do ręcznego rozciągania kolumny (patrz EquipmentTable) — opcjonalny, żeby nie
  // dotykać innych tabel korzystających z tego komponentu.
  resizeHandle?: React.ReactNode;
}) {
  const active = currentKey === sortKey;
  return (
    <th className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 truncate hover:text-foreground ${align === "right" ? "ml-auto" : ""}`}
      >
        <span className="truncate">{label}</span>
        {active ? (
          direction === "asc" ? (
            <ChevronUp size={14} className="shrink-0" />
          ) : (
            <ChevronDown size={14} className="shrink-0" />
          )
        ) : (
          <ChevronsUpDown size={12} className="shrink-0 opacity-40" />
        )}
      </button>
      {resizeHandle}
    </th>
  );
}
