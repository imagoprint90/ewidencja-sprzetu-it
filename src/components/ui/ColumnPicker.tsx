"use client";

import { useState, useRef, useEffect } from "react";
import { Columns3, ChevronUp, ChevronDown, X } from "lucide-react";
import { Button } from "./Button";

// Ogólna wersja wyboru widocznych/kolejności kolumn (bez kolorów tekstu — to jest
// specyficzne dla tabeli sprzętu, patrz components/equipment/ColumnPicker.tsx).
export function ColumnPicker<T extends string>({
  allColumns,
  labels,
  visible,
  onChange,
}: {
  allColumns: readonly T[];
  labels: Record<T, string>;
  visible: T[];
  onChange: (cols: T[]) => void;
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

  const hidden = allColumns.filter((c) => !visible.includes(c));

  function remove(col: T) {
    onChange(visible.filter((c) => c !== col));
  }

  function add(col: T) {
    onChange([...visible, col]);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= visible.length) return;
    const next = [...visible];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="relative" ref={ref}>
      <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)}>
        <Columns3 size={16} />
        Kolumny
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-border bg-surface p-3 shadow-lg">
          <p className="mb-2 text-xs font-medium text-muted">
            Widoczne kolumny — kolejność jak na liście (strzałki zmieniają kolejność)
          </p>
          <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
            {visible.map((col, i) => (
              <div
                key={col}
                className="flex items-center gap-1 rounded px-2 py-1.5 text-sm hover:bg-black/5"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className="text-muted hover:text-foreground disabled:opacity-20"
                    aria-label="Przesuń w górę"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={i === visible.length - 1}
                    onClick={() => move(i, 1)}
                    className="text-muted hover:text-foreground disabled:opacity-20"
                    aria-label="Przesuń w dół"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <span className="flex-1">{labels[col]}</span>
                <button
                  type="button"
                  onClick={() => remove(col)}
                  className="text-muted hover:text-danger"
                  aria-label="Ukryj kolumnę"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {hidden.length > 0 && (
            <>
              <p className="mb-2 mt-3 text-xs font-medium text-muted">Dodaj kolumnę</p>
              <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
                {hidden.map((col) => (
                  <label
                    key={col}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-black/5"
                  >
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => add(col)}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                    {labels[col]}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
