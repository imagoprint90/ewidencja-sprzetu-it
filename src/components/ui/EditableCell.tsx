"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";
import { inputClass } from "@/components/ui/Form";

interface EditableCellProps {
  value: string;
  displayValue?: React.ReactNode;
  options?: { value: string; label: string }[];
  multiline?: boolean;
  onSave: (newValue: string) => Promise<{ ok: boolean; error?: string }>;
}

export function EditableCell({ value, displayValue, options, multiline, onSave }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(value);
    setError(null);
    setEditing(true);
  }

  async function save() {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const result = await onSave(draft);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Nie udało się zapisać.");
      return;
    }
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
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
        <span className="min-w-0 flex-1 truncate">{displayValue ?? value}</span>
        <Pencil size={12} className="shrink-0 text-muted opacity-0 group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1">
        {options ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            className={inputClass}
            value={draft}
            disabled={saving}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
            }}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            className={inputClass}
            rows={2}
            value={draft}
            disabled={saving}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
            }}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            className={inputClass}
            value={draft}
            disabled={saving}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
          />
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="text-xs font-medium text-primary hover:underline"
        >
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
