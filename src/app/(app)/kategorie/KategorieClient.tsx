"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Archive, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SortableTh } from "@/components/ui/SortableTh";
import { inputClass } from "@/components/ui/Form";
import { useIsAdmin } from "@/lib/current-user-context";
import { useSort } from "@/lib/useSort";
import { applySort, compareNumbers, compareStrings } from "@/lib/sort";
import type { Category } from "@/lib/types";
import {
  addCategoryAction,
  archiveCategoryAction,
  renameCategoryAction,
} from "@/lib/supabase/actions/category-actions";

type SortKey = "name" | "count";

export function KategorieClient({
  categories,
  equipmentCounts,
}: {
  categories: Category[];
  equipmentCounts: Record<string, number>;
}) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [isPending, startTransition] = useTransition();
  const { sortKey, sortDir, toggleSort } = useSort<SortKey>("name");

  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  function handleAdd() {
    startTransition(async () => {
      const result = await addCategoryAction(newName);
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
      const result = await renameCategoryAction(id, editValue);
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
      const result = await archiveCategoryAction(archiveTarget);
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

  const active = categories.filter((c) => !c.isArchived);
  const archived = categories.filter((c) => c.isArchived);

  const sortedActive = useMemo(() => {
    const comparators: Record<string, (a: Category, b: Category) => number> = {
      name: (a, b) => compareStrings(a.name, b.name),
      count: (a, b) => compareNumbers(equipmentCounts[a.id] ?? 0, equipmentCounts[b.id] ?? 0),
    };
    return applySort(active, sortKey, sortDir, comparators);
  }, [active, sortKey, sortDir, equipmentCounts]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Kategorie</h1>
        <p className="text-sm text-muted">
          Kategorie sprzętu są zapisane w bazie danych. Kategorii używanej przez istniejący
          sprzęt nie można zarchiwizować bez wcześniejszej zmiany kategorii tego sprzętu.
        </p>
      </div>

      {isAdmin && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="mb-2 text-sm font-medium">Dodaj nową kategorię</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="np. Skanery"
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

      <div className="rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
              <SortableTh label="Nazwa" sortKey="name" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} />
              <SortableTh label="Liczba sprzętu" sortKey="count" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} />
              {isAdmin && <th className="px-4 py-3 font-medium text-right">Działania</th>}
            </tr>
          </thead>
          <tbody>
            {sortedActive.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  {editingId === c.id ? (
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
                    c.name
                  )}
                </td>
                <td className="px-4 py-3">{equipmentCounts[c.id] ?? 0}</td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {editingId === c.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isPending}
                            onClick={() => saveEdit(c.id)}
                          >
                            <Check size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X size={14} />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => startEdit(c.id, c.name)}
                          >
                            <Pencil size={14} />
                            Zmień nazwę
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setArchiveTarget(c.id)}
                          >
                            <Archive size={14} />
                            Archiwizuj
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

      {archived.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted">Zarchiwizowane kategorie</h2>
          <div className="flex flex-wrap gap-2">
            {archived.map((c) => (
              <Badge key={c.id}>{c.name}</Badge>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Zarchiwizować kategorię?"
        description="Zarchiwizowana kategoria nie będzie proponowana przy dodawaniu nowego sprzętu, ale pozostanie widoczna w historii."
        confirmLabel="Archiwizuj"
        onCancel={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
      />
    </div>
  );
}
