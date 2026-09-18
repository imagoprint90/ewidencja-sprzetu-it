"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "./Button";

export interface MultiSelectOption {
  value: string;
  label: string;
}

// Filtr wielokrotnego wyboru w formie rozwijanej listy checkboxów — zastępuje pojedyncze
// <select>, żeby dało się np. zaznaczyć naraz kilka statusów albo kilka lokalizacji.
export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggle(value: string) {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value));
    else onChange([...selected, value]);
  }

  const summary =
    selected.length === 0
      ? "wszystkie"
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? "1 wybrana")
        : `wybrano ${selected.length}`;

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="whitespace-nowrap"
      >
        {label}: {summary}
        <ChevronDown size={14} />
      </Button>
      {open && (
        <div className="absolute left-0 z-20 mt-2 max-h-72 w-56 overflow-y-auto rounded-lg border border-border bg-surface p-2 shadow-lg">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mb-1 w-full rounded px-2 py-1 text-left text-xs text-primary hover:bg-primary/5"
            >
              Wyczyść ({selected.length})
            </button>
          )}
          {options.length === 0 ? (
            <p className="px-2 py-1 text-xs text-muted">Brak opcji</p>
          ) : (
            options.map((o) => (
              <label
                key={o.value}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-black/5"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(o.value)}
                  onChange={() => toggle(o.value)}
                  className="h-4 w-4 shrink-0 rounded border-border text-primary"
                />
                <span className="truncate">{o.label}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
