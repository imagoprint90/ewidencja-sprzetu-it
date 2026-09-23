"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Department, Employee } from "@/lib/types";
import { employeeFullName, getDepartmentName } from "@/lib/equipment-helpers";

// Wyszukiwarka + lista checkboxów do zaznaczania kilku pracowników naraz — używana zarówno
// przy ręcznej wysyłce (SendTab), jak i przy definiowaniu harmonogramów (SchedulesTab).
export function EmployeeMultiSelect({
  employees,
  departments,
  selectedIds,
  onChange,
}: {
  employees: Employee[];
  departments: Department[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      const haystack = [employeeFullName(e), e.email ?? "", getDepartmentName(departments, e.departmentId)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [employees, departments, query]);

  function toggle(id: string) {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((v) => v !== id));
    else onChange([...selectedIds, id]);
  }

  function selectAllFiltered() {
    const ids = new Set(selectedIds);
    for (const e of filtered) ids.add(e.id);
    onChange(Array.from(ids));
  }

  const selectedEmployees = employees.filter((e) => selectedIds.includes(e.id));

  return (
    <div className="rounded-lg border border-border">
      <div className="relative border-b border-border p-2">
        <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj pracownika (imię, nazwisko, e-mail, dział)…"
          className="w-full rounded-md border border-border bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      {selectedEmployees.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border p-2">
          {selectedEmployees.map((e) => (
            <span
              key={e.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
            >
              {employeeFullName(e)}
              <button type="button" onClick={() => toggle(e.id)} aria-label={`Odznacz ${employeeFullName(e)}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5 text-xs">
        <span className="text-muted">Zaznaczono: {selectedIds.length}</span>
        <div className="flex gap-3">
          <button type="button" onClick={selectAllFiltered} className="text-primary hover:underline">
            Zaznacz widoczne ({filtered.length})
          </button>
          {selectedIds.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="text-danger hover:underline">
              Wyczyść
            </button>
          )}
        </div>
      </div>

      <div className="max-h-56 overflow-y-auto p-1">
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-center text-sm text-muted">Brak wyników.</p>
        ) : (
          filtered.map((e) => (
            <label key={e.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-black/5">
              <input
                type="checkbox"
                checked={selectedIds.includes(e.id)}
                onChange={() => toggle(e.id)}
                className="h-4 w-4 shrink-0 rounded border-border text-primary"
              />
              <span className="flex-1 truncate">{employeeFullName(e)}</span>
              <span className="shrink-0 text-xs text-muted">{e.email ?? "brak e-maila"}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
