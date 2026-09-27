"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { EmployeeOrManualSelect, MANUAL_OPTION } from "@/components/ui/EmployeeOrManualSelect";
import type { Employee } from "@/lib/types";

// Edytowalna komórka "Ostatni posiadacz" na liście Sprzęt — jak EditableCell, ale z dodatkową
// opcją wpisania nazwiska ręcznie (EditableCell tego nie obsługuje, bo to zwykły <select>).
export function LastHolderCell({
  employees,
  lastHolderId,
  lastHolderName,
  displayText,
  onSave,
}: {
  employees: Employee[];
  lastHolderId: string | null;
  lastHolderName: string | null;
  displayText: string;
  onSave: (patch: { lastHolderId: string | null; lastHolderName: string | null }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [editing, setEditing] = useState(false);
  const [selectValue, setSelectValue] = useState("");
  const [manualValue, setManualValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setSelectValue(lastHolderId ?? (lastHolderName ? MANUAL_OPTION : ""));
    setManualValue(lastHolderName ?? "");
    setError(null);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    const patch =
      selectValue === MANUAL_OPTION
        ? { lastHolderId: null, lastHolderName: manualValue.trim() || null }
        : { lastHolderId: selectValue || null, lastHolderName: null };
    const result = await onSave(patch);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Nie udało się zapisać.");
      return;
    }
    setEditing(false);
  }

  function cancel() {
    setError(null);
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEdit}
        className="group flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-black/5"
      >
        <span className="min-w-0 flex-1 truncate">{displayText}</span>
        <Pencil size={12} className="shrink-0 text-muted opacity-0 group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <div className="flex min-w-[220px] flex-col gap-1" onClick={(e) => e.stopPropagation()}>
      <EmployeeOrManualSelect
        employees={employees}
        selectValue={selectValue}
        onSelectChange={setSelectValue}
        manualValue={manualValue}
        onManualChange={setManualValue}
      />
      <div className="flex gap-2">
        <button type="button" disabled={saving} onClick={save} className="text-xs font-medium text-primary hover:underline">
          Zapisz
        </button>
        <button type="button" onClick={cancel} className="text-xs text-muted hover:underline">
          Anuluj
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
