"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Archive, ArchiveRestore, Check, X, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ExpandableList } from "@/components/ui/ExpandableList";
import { inputClass } from "@/components/ui/Form";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";
import { ColumnPicker } from "@/components/ui/ColumnPicker";
import { SortableTh } from "@/components/ui/SortableTh";
import { useIsAdmin } from "@/lib/current-user-context";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { useSort } from "@/lib/useSort";
import { applySort, compareNumbers, compareStrings } from "@/lib/sort";
import type { Department } from "@/lib/types";
import {
  addDepartmentAction,
  archiveDepartmentAction,
  deleteDepartmentAction,
  renameDepartmentAction,
  unarchiveDepartmentAction,
} from "@/lib/supabase/actions/department-actions";

type StatusFilter = "aktywny" | "nieaktywny";

interface DepartmentFiltersState {
  query: string;
  statuses: StatusFilter[];
}

const DEFAULT_FILTERS: DepartmentFiltersState = { query: "", statuses: [] };

type DepartmentColumnKey = "isActive" | "employees";

const DEPARTMENT_COLUMNS: DepartmentColumnKey[] = ["isActive", "employees"];
const DEPARTMENT_COLUMN_LABELS: Record<DepartmentColumnKey, string> = {
  isActive: "Aktywny",
  employees: "Pracownicy",
};
const DEFAULT_DEPARTMENT_COLUMNS: DepartmentColumnKey[] = ["isActive", "employees"];

type SortKey = "name" | DepartmentColumnKey;

export function DepartmentsTab({
  departments,
  employeeNames,
}: {
  departments: Department[];
  employeeNames: Record<string, string[]>;
}) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useLocalStorage<DepartmentFiltersState>(
    "dzialy-filtry",
    DEFAULT_FILTERS
  );
  const [visibleColumns, setVisibleColumns] = useLocalStorage<DepartmentColumnKey[]>(
    "dzialy-kolumny",
    DEFAULT_DEPARTMENT_COLUMNS
  );
  const { sortKey, sortDir, toggleSort } = useSort<SortKey>("name");

  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleAdd() {
    startTransition(async () => {
      const result = await addDepartmentAction(newName);
      if (!result.ok) {
        setAddError(result.error);
        return;
      }
      setNewName("");
      setAddError(null);
      router.refresh();
    });
  }

  function startEdit(id: string, current: string) {
    setEditingId(id);
    setEditValue(current);
    setEditError(null);
  }

  function saveEdit(id: string) {
    startTransition(async () => {
      const result = await renameDepartmentAction(id, editValue);
      if (!result.ok) {
        setEditError(result.error);
        return;
      }
      setEditingId(null);
      router.refresh();
    });
  }

  function confirmArchive() {
    if (!archiveTarget) return;
    startTransition(async () => {
      const result = await archiveDepartmentAction(archiveTarget);
      if (!result.ok) {
        setArchiveError(result.error);
        setArchiveTarget(null);
        return;
      }
      setArchiveTarget(null);
      setArchiveError(null);
      router.refresh();
    });
  }

  function handleUnarchive(id: string) {
    startTransition(async () => {
      const result = await unarchiveDepartmentAction(id);
      if (!result.ok) {
        setArchiveError(result.error);
        return;
      }
      setArchiveError(null);
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteDepartmentAction(deleteTarget.id);
      if (!result.ok) {
        setDeleteError(result.error);
        setDeleteTarget(null);
        return;
      }
      setDeleteTarget(null);
      setDeleteError(null);
      router.refresh();
    });
  }

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return departments.filter((d) => {
      if (filters.statuses.length > 0) {
        const status: StatusFilter = d.isArchived ? "nieaktywny" : "aktywny";
        if (!filters.statuses.includes(status)) return false;
      }
      if (q && !d.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [departments, filters]);

  const sorted = useMemo(() => {
    const comparators: Record<string, (a: Department, b: Department) => number> = {
      name: (a, b) => compareStrings(a.name, b.name),
      isActive: (a, b) => compareNumbers(Number(!a.isArchived), Number(!b.isArchived)),
      employees: (a, b) => compareNumbers((employeeNames[a.id] ?? []).length, (employeeNames[b.id] ?? []).length),
    };
    return applySort(filtered, sortKey, sortDir, comparators);
  }, [filtered, sortKey, sortDir, employeeNames]);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">
        Działy pracowników — z góry ustalona lista, przypisywana pracownikom z rozwijanej
        listy (zamiast wpisywania ręcznie). Nieaktywny dział nie jest proponowany przy
        wyborze działu pracownika.
      </p>

      {isAdmin && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="mb-2 text-sm font-medium">Dodaj nowy dział</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="np. Księgowość"
              className={inputClass}
            />
            <Button onClick={handleAdd} disabled={isPending}>
              <Plus size={16} />
              Dodaj
            </Button>
          </div>
          {addError && <p className="mt-2 text-sm text-danger">{addError}</p>}
        </div>
      )}

      {archiveError && (
        <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
          {archiveError}
        </p>
      )}
      {deleteError && (
        <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
          {deleteError}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            placeholder="Szukaj działu…"
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <MultiSelectFilter
          label="Aktywny"
          options={[
            { value: "aktywny", label: "Tak" },
            { value: "nieaktywny", label: "Nie" },
          ]}
          selected={filters.statuses}
          onChange={(v) => setFilters({ ...filters, statuses: v as StatusFilter[] })}
        />
        <span className="text-xs text-muted">
          {filtered.length} z {departments.length} pozycji
        </span>
        <div className="sm:ml-auto">
          <ColumnPicker
            allColumns={DEPARTMENT_COLUMNS}
            labels={DEPARTMENT_COLUMN_LABELS}
            visible={visibleColumns}
            onChange={setVisibleColumns}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
              <SortableTh label="Nazwa" sortKey="name" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} />
              {visibleColumns.map((col) => (
                <SortableTh
                  key={col}
                  label={DEPARTMENT_COLUMN_LABELS[col]}
                  sortKey={col}
                  currentKey={sortKey}
                  direction={sortDir}
                  onSort={(k) => toggleSort(k as SortKey)}
                />
              ))}
              {isAdmin && <th className="px-4 py-3 font-medium text-right">Działania</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((d) => (
              <tr key={d.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  {editingId === d.id ? (
                    <div className="flex flex-col gap-1">
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className={inputClass}
                      />
                      {editError && <span className="text-xs text-danger">{editError}</span>}
                    </div>
                  ) : (
                    d.name
                  )}
                </td>
                {visibleColumns.map((col) => (
                  <td key={col} className="px-4 py-3">
                    {col === "isActive" && (
                      <Badge tone={d.isArchived ? "default" : "success"}>
                        {d.isArchived ? "Nie" : "Tak"}
                      </Badge>
                    )}
                    {col === "employees" && <ExpandableList items={employeeNames[d.id] ?? []} />}
                  </td>
                ))}
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {editingId === d.id ? (
                        <>
                          <Button size="sm" variant="secondary" disabled={isPending} onClick={() => saveEdit(d.id)}>
                            <Check size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X size={14} />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => startEdit(d.id, d.name)}>
                            <Pencil size={14} />
                            Zmień nazwę
                          </Button>
                          {d.isArchived ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isPending}
                              onClick={() => handleUnarchive(d.id)}
                            >
                              <ArchiveRestore size={14} />
                              Aktywuj
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => setArchiveTarget(d.id)}>
                              <Archive size={14} />
                              Dezaktywuj
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(d)}>
                            <Trash2 size={14} />
                            Usuń
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Dezaktywować dział?"
        description="Nieaktywny dział nie będzie proponowany przy wyborze działu pracownika. Nie można dezaktywować działu, który jest w użyciu."
        confirmLabel="Dezaktywuj"
        onCancel={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Usunąć dział?"
        description={
          deleteTarget
            ? `„${deleteTarget.name}” zostanie usunięty trwale. Tej operacji nie można cofnąć. Nie można usunąć działu przypisanego do pracowników.`
            : undefined
        }
        confirmLabel="Usuń"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
