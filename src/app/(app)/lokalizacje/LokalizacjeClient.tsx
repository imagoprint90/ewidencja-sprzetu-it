"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Archive, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { inputClass } from "@/components/ui/Form";
import { useIsAdmin } from "@/lib/current-user-context";
import type { Location } from "@/lib/types";
import {
  addLocationAction,
  archiveLocationAction,
  renameLocationAction,
} from "@/lib/supabase/actions/location-actions";

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

  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

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

  const active = locations.filter((l) => !l.isArchived);
  const archived = locations.filter((l) => l.isArchived);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Lokalizacje</h1>
        <p className="text-sm text-muted">
          Lokalizacje pracowników i sprzętu. Lokalizacja sprzętu jest ustawiana automatycznie
          — zmienia się razem z przydzielonym pracownikiem, a przy zwrocie do magazynu
          wraca do lokalizacji „Magazyn”.
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

      <div className="rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Nazwa</th>
              <th className="px-4 py-3 font-medium">Pracownicy</th>
              <th className="px-4 py-3 font-medium">Sprzęt</th>
              {isAdmin && <th className="px-4 py-3 font-medium text-right">Działania</th>}
            </tr>
          </thead>
          <tbody>
            {active.map((l) => (
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
                            <Button size="sm" variant="ghost" onClick={() => setArchiveTarget(l.id)}>
                              <Archive size={14} />
                              Archiwizuj
                            </Button>
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

      {archived.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted">Zarchiwizowane lokalizacje</h2>
          <div className="flex flex-wrap gap-2">
            {archived.map((l) => (
              <Badge key={l.id}>{l.name}</Badge>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Zarchiwizować lokalizację?"
        description="Zarchiwizowana lokalizacja nie będzie proponowana przy dodawaniu nowego pracownika. Nie można zarchiwizować lokalizacji, która jest w użyciu."
        confirmLabel="Archiwizuj"
        onCancel={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
      />
    </div>
  );
}
