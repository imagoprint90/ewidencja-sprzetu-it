"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Archive, ArchiveRestore, Check, X, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { inputClass } from "@/components/ui/Form";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";
import { useIsAdmin } from "@/lib/current-user-context";
import { useLocalStorage } from "@/lib/useLocalStorage";
import type { Location } from "@/lib/types";
import {
  addLocationAction,
  archiveLocationAction,
  deleteLocationAction,
  renameLocationAction,
  unarchiveLocationAction,
} from "@/lib/supabase/actions/location-actions";

type StatusFilter = "aktywna" | "nieaktywna";

interface LocationFiltersState {
  query: string;
  statuses: StatusFilter[];
}

const DEFAULT_FILTERS: LocationFiltersState = { query: "", statuses: [] };

export function LokalizacjeClient({
  locations,
  employeeCounts,
  equipmentCounts,
}: {
  locations: Location[];
  employeeCounts: Record<string, number>;
  equipmentCounts: Record<string, number>;
}) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useLocalStorage<LocationFiltersState>(
    "lokalizacje-filtry",
    DEFAULT_FILTERS
  );

  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleAdd() {
    startTransition(async () => {
      const result = await addLocationAction(newName);
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
      const result = await renameLocationAction(id, editValue);
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
      const result = await archiveLocationAction(archiveTarget);
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
      const result = await unarchiveLocationAction(id);
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
      const result = await deleteLocationAction(deleteTarget.id);
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
    return locations.filter((l) => {
      if (filters.statuses.length > 0) {
        const status: StatusFilter = l.isArchived ? "nieaktywna" : "aktywna";
        if (!filters.statuses.includes(status)) return false;
      }
      if (q && !l.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [locations, filters]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Lokalizacje</h1>
        <p className="text-sm text-muted">
          Lokalizacje pracowników i sprzętu. Lokalizacja sprzętu jest ustawiana automatycznie
          — zmienia się razem z przydzielonym pracownikiem, a przy zwrocie do magazynu
          wraca do lokalizacji „Magazyn”. Nieaktywna lokalizacja nie jest proponowana przy
          wyborze lokalizacji pracownika.
        </p>
      </div>

      {isAdmin && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="mb-2 text-sm font-medium">Dodaj nową lokalizację</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="np. Kraków, oddział"
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
            placeholder="Szukaj lokalizacji…"
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <MultiSelectFilter
          label="Aktywna"
          options={[
            { value: "aktywna", label: "Tak" },
            { value: "nieaktywna", label: "Nie" },
          ]}
          selected={filters.statuses}
          onChange={(v) => setFilters({ ...filters, statuses: v as StatusFilter[] })}
        />
        <span className="text-xs text-muted">
          {filtered.length} z {locations.length} pozycji
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Nazwa</th>
              <th className="px-4 py-3 font-medium">Aktywna</th>
              <th className="px-4 py-3 font-medium">Pracownicy</th>
              <th className="px-4 py-3 font-medium">Sprzęt</th>
              {isAdmin && <th className="px-4 py-3 font-medium text-right">Działania</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  {editingId === l.id ? (
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
                    <span className="flex items-center gap-2">
                      {l.name}
                      {l.isWarehouse && <Badge tone="default">domyślny magazyn</Badge>}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={l.isArchived ? "default" : "success"}>
                    {l.isArchived ? "Nie" : "Tak"}
                  </Badge>
                </td>
                <td className="px-4 py-3">{employeeCounts[l.id] ?? 0}</td>
                <td className="px-4 py-3">{equipmentCounts[l.id] ?? 0}</td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {editingId === l.id ? (
                        <>
                          <Button size="sm" variant="secondary" disabled={isPending} onClick={() => saveEdit(l.id)}>
                            <Check size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X size={14} />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => startEdit(l.id, l.name)}>
                            <Pencil size={14} />
                            Zmień nazwę
                          </Button>
                          {!l.isWarehouse && (
                            <>
                              {l.isArchived ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isPending}
                                  onClick={() => handleUnarchive(l.id)}
                                >
                                  <ArchiveRestore size={14} />
                                  Aktywuj
                                </Button>
                              ) : (
                                <Button size="sm" variant="ghost" onClick={() => setArchiveTarget(l.id)}>
                                  <Archive size={14} />
                                  Dezaktywuj
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(l)}>
                                <Trash2 size={14} />
                                Usuń
                              </Button>
                            </>
                          )}
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
        title="Dezaktywować lokalizację?"
        description="Nieaktywna lokalizacja nie będzie proponowana przy wyborze lokalizacji pracownika. Nie można dezaktywować lokalizacji, która jest w użyciu."
        confirmLabel="Dezaktywuj"
        onCancel={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Usunąć lokalizację?"
        description={
          deleteTarget
            ? `„${deleteTarget.name}” zostanie usunięta trwale. Tej operacji nie można cofnąć. Nie można usunąć lokalizacji przypisanej do pracowników lub sprzętu.`
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
