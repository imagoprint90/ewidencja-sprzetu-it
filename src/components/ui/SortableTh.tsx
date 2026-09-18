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
}: {
  label: string;
  sortKey: string;
  currentKey: string | null;
  direction: SortDirection;
  onSort: (key: string) => void;
  className?: string;
  align?: "right";
}) {
  const active = currentKey === sortKey;
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 hover:text-foreground ${align === "right" ? "ml-auto" : ""}`}
      >
        {label}
        {active ? (
          direction === "asc" ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )
        ) : (
          <ChevronsUpDown size={12} className="opacity-40" />
        )}
      </button>
    </th>
  );
}
