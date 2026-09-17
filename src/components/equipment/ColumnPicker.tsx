"use client";

import { useState, useRef, useEffect } from "react";
import { Columns3 } from "lucide-react";
import { EQUIPMENT_COLUMNS, EQUIPMENT_COLUMN_LABELS, type EquipmentColumnKey } from "@/lib/types";
import { Button } from "@/components/ui/Button";

export function ColumnPicker({
  visible,
  onChange,
}: {
  visible: EquipmentColumnKey[];
  onChange: (cols: EquipmentColumnKey[]) => void;
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

  function toggle(col: EquipmentColumnKey) {
    if (visible.includes(col)) {
      onChange(visible.filter((c) => c !== col));
    } else {
      onChange([...visible, col]);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)}>
        <Columns3 size={16} />
        Kolumny
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-border bg-surface p-3 shadow-lg">
          <p className="mb-2 text-xs font-medium text-muted">Widoczne kolumny</p>
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {EQUIPMENT_COLUMNS.map((col) => (
              <label key={col} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-black/5">
                <input
                  type="checkbox"
                  checked={visible.includes(col)}
                  onChange={() => toggle(col)}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                {EQUIPMENT_COLUMN_LABELS[col]}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
