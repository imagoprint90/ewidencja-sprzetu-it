"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X, GripVertical } from "lucide-react";
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
  deleteCategoryAction,
  renameCategoryAction,
  reorderCategoriesAction,
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
  const { sortKey, sortDir, toggleSort } = useSort<SortKey>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteCategoryAction(deleteTarget);
      if (!result.ok) {
        setActionError(result.error);
        setDeleteTarget(null);
        return;
      }
      setDeleteTarget(null);
      setActionError(null);
      router.refresh();
    });
  }

  const active = useMemo(() => categories.filter((c) => !c.isArchived), [categories]);
  const canDrag = isAdmin && !sortKey;

  function moveCategory(fromId: string, toId: string) {
    if (fromId === toId) return;
    const ids = active.map((c) => c.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    startTransition(async () => {
      const result = await reorderCategoriesAction(ids);
      if (!result.ok) setActionError(result.error);
      router.refresh();
    });
  }
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
          Kategorie sprzętu są zapisane w bazie danych. Kategorię można usunąć tylko wtedy, gdy żaden
          sprzęt nie jest do niej przypisany — najpierw zmień kategorię tego sprzętu.
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

      {actionError && (
        <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
          {actionError}
        </p>
      )}

      <div className="rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
              {canDrag && <th className="w-8 px-2 py-3" />}
              <SortableTh label="Nazwa" sortKey="name" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} />
              <SortableTh label="Liczba sprzętu" sortKey="count" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} />
              {isAdmin && <th className="px-4 py-3 font-medium text-right">Działania</th>}
            </tr>
          </thead>
          <tbody>
            {sortedActive.map((c) => (
              <tr
                key={c.id}
                onDragOver={(e) => {
                  if (dragId) {
                    e.preventDefault();
                    setOverId(c.id);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId) moveCategory(dragId, c.id);
                  setDragId(null);
                  setOverId(null);
                }}
                className={`border-b border-border last:border-0 ${dragId === c.id ? "opacity-40" : ""} ${
                  overId === c.id && dragId && dragId !== c.id ? "bg-primary/10" : ""
                }`}
              >
                {canDrag && (
                  <td className="px-2 py-3">
                    <span
                      draggable
                      onDragStart={(e) => {
                        setDragId(c.id);
                        e.dataTransfer.effectAllowed = "move";
                        const row = e.currentTarget.closest("tr");
                        if (row) e.dataTransfer.setDragImage(row, 10, 10);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverId(null);
                      }}
                      className="inline-flex cursor-grab text-muted hover:text-foreground"
                      title="Przeciągnij, aby zmienić kolejność"
                    >
                      <GripVertical size={16} />
                    </span>
                  </td>
                )}
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
                            disabled={(equipmentCounts[c.id] ?? 0) > 0}
                            title={
                              (equipmentCounts[c.id] ?? 0) > 0
                                ? "Kategoria jest przypisana do sprzętu — nie można jej usunąć"
                                : "Usuń kategorię"
                            }
                            onClick={() => setDeleteTarget(c.id)}
                          >
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

      {archived.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted">Zarchiwizowane kategorie (dawniej)</h2>
          <div className="flex flex-wrap gap-2">
            {archived.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1">
                <Badge>{c.name}</Badge>
                {isAdmin && (equipmentCounts[c.id] ?? 0) === 0 && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(c.id)}
                    title="Usuń kategorię"
                    className="text-muted hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Usunąć kategorię?"
        description="Kategoria zostanie trwale usunięta (także z uprawnień kont). Tej operacji nie można cofnąć. Żaden sprzęt nie jest do niej przypisany."
        confirmLabel="Usuń"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
