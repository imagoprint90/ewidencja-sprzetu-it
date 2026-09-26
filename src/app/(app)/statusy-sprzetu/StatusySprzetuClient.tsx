"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Badge } from "@/components/ui/Badge";
import { inputClass } from "@/components/ui/Form";
import { useIsAdmin } from "@/lib/current-user-context";
import { resolveStatusColors } from "@/lib/statuses-context";
import { DEFAULT_EQUIPMENT_STATUSES, type EquipmentStatusDef } from "@/lib/types";
import {
  addEquipmentStatusAction,
  deleteEquipmentStatusAction,
  updateEquipmentStatusDefAction,
} from "@/lib/supabase/actions/equipment-status-actions";

type Result = { ok: true } | { ok: false; error: string };

// Tło wiersza jest półprzezroczyste, żeby dobrze wyglądało na jasnym i ciemnym tle.
const rowBackground = (hex: string | null) => (hex ? `${hex}2e` : undefined);

const colorInputClass =
  "h-8 w-12 cursor-pointer rounded border border-border bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-50";

function Preview({ def, dark }: { def: EquipmentStatusDef; dark: boolean }) {
  const c = resolveStatusColors(def, dark);
  const tint = c.background ? rowBackground(c.background) : undefined;
  // Tło podglądu ustawiamy wprost (nie klasą Tailwinda), bo w ciemnym motywie klasa bg-white
  // jest nadpisywana i podgląd "jasnego" motywu wyglądałby na ciemnym tle.
  return (
    <div
      className="rounded px-3 py-1.5 text-sm font-medium"
      style={{
        color: c.text,
        backgroundColor: dark ? "#161c29" : "#ffffff",
        backgroundImage: tint ? `linear-gradient(${tint}, ${tint})` : undefined,
      }}
    >
      {dark ? "Ciemny: " : "Jasny: "}Komputer-1 · INW/001
    </div>
  );
}
export function StatusySprzetuClient({
  statuses,
  counts,
}: {
  statuses: EquipmentStatusDef[];
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [newLabel, setNewLabel] = useState("");
  const [newText, setNewText] = useState("#2563eb");
  const [newBackground, setNewBackground] = useState<string | null>(null);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EquipmentStatusDef | null>(null);

  function run(action: () => Promise<Result>, onDone?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      onDone?.();
      router.refresh();
    });
  }

  function handleAdd() {
    run(
      () => addEquipmentStatusAction(newLabel, newText, newBackground),
      () => {
        setNewLabel("");
        setNewBackground(null);
      }
    );
  }

  function update(key: string, patch: Parameters<typeof updateEquipmentStatusDefAction>[1]) {
    run(() => updateEquipmentStatusDefAction(key, patch));
  }

  function saveLabel(key: string) {
    run(
      () => updateEquipmentStatusDefAction(key, { label: editLabel }),
      () => setEditingKey(null)
    );
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const key = deleteTarget.key;
    setDeleteTarget(null);
    run(() => deleteEquipmentStatusAction(key));
  }

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Statusy sprzętu</h1>
        <p className="text-sm text-muted">
          Statusy dostępne dla sprzętu oraz kolory, którymi na liście Sprzęt oznaczany jest cały wiersz
          — osobno dla jasnego i ciemnego motywu. Kolory zapisują się w bazie i obowiązują wszystkich
          użytkowników, każdy w swoim motywie. Dla ciemnego motywu możesz zostawić „auto” (kolor z
          jasnego motywu jest wtedy rozjaśniany automatycznie). Statusy systemowe sterują
          przekazaniami i zwrotami — można zmienić ich nazwę i kolory, ale nie usunąć.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="mb-2 text-sm font-medium">Dodaj nowy status</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="np. Do utylizacji"
            className={inputClass}
          />
          <label className="flex items-center gap-2 text-sm text-muted">
            Tekst
            <input type="color" value={newText} onChange={(e) => setNewText(e.target.value)} className={colorInputClass} />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            Tło
            <input
              type="color"
              value={newBackground ?? "#ffffff"}
              onChange={(e) => setNewBackground(e.target.value)}
              className={colorInputClass}
            />
            {newBackground && (
              <button type="button" className="text-xs hover:text-foreground" onClick={() => setNewBackground(null)}>
                bez tła
              </button>
            )}
          </label>
          <Button onClick={handleAdd} disabled={isPending}>
            <Plus size={16} />
            Dodaj
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted">Kolory dla ciemnego motywu ustawisz po dodaniu statusu (domyślnie auto).</p>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium" rowSpan={2}>Status</th>
              <th className="px-4 py-3 font-medium" rowSpan={2}>Sprzętu</th>
              <th className="border-l border-border px-4 py-2 font-medium" colSpan={2}>Jasny motyw</th>
              <th className="border-l border-border px-4 py-2 font-medium" colSpan={2}>Ciemny motyw</th>
              <th className="border-l border-border px-4 py-3 font-medium" rowSpan={2}>Podgląd (jasny / ciemny)</th>
              <th className="px-4 py-3 text-right font-medium" rowSpan={2}>Działania</th>
            </tr>
            <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
              <th className="border-l border-border px-4 py-2 font-medium">Tekst</th>
              <th className="px-4 py-2 font-medium">Tło</th>
              <th className="border-l border-border px-4 py-2 font-medium">Tekst</th>
              <th className="px-4 py-2 font-medium">Tło</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((s) => {
              const defaults = DEFAULT_EQUIPMENT_STATUSES.find((d) => d.key === s.key);
              const used = counts[s.key] ?? 0;
              const editing = editingKey === s.key;
              const autoDark = resolveStatusColors({ ...s, textColorDark: null }, true).text;
              return (
                <tr key={s.key} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    {editing ? (
                      <input
                        autoFocus
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveLabel(s.key);
                          if (e.key === "Escape") setEditingKey(null);
                        }}
                        className={inputClass}
                      />
                    ) : (
                      <span className="flex items-center gap-2 font-medium">
                        {s.label}
                        {s.isSystem && <Badge>systemowy</Badge>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{used}</td>

                  <td className="border-l border-border px-4 py-3">
                    <input
                      type="color"
                      value={s.textColor}
                      disabled={!isAdmin || isPending}
                      onChange={(e) => update(s.key, { textColor: e.target.value })}
                      className={colorInputClass}
                      aria-label={`Kolor tekstu (jasny motyw): ${s.label}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={s.backgroundColor ?? "#ffffff"}
                        disabled={!isAdmin || isPending}
                        onChange={(e) => update(s.key, { backgroundColor: e.target.value })}
                        className={colorInputClass}
                        aria-label={`Tło wiersza (jasny motyw): ${s.label}`}
                      />
                      {s.backgroundColor ? (
                        <button type="button" onClick={() => update(s.key, { backgroundColor: null })} className="text-xs text-muted hover:text-foreground">
                          bez tła
                        </button>
                      ) : (
                        <span className="text-xs text-muted">brak</span>
                      )}
                    </div>
                  </td>

                  <td className="border-l border-border px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={s.textColorDark ?? (autoDark.startsWith("#") ? autoDark : "#ffffff")}
                        disabled={!isAdmin || isPending}
                        onChange={(e) => update(s.key, { textColorDark: e.target.value })}
                        className={colorInputClass}
                        aria-label={`Kolor tekstu (ciemny motyw): ${s.label}`}
                      />
                      {s.textColorDark ? (
                        <button type="button" onClick={() => update(s.key, { textColorDark: null })} className="text-xs text-muted hover:text-foreground">
                          auto
                        </button>
                      ) : (
                        <span className="text-xs text-muted">auto</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={s.backgroundColorDark ?? s.backgroundColor ?? "#ffffff"}
                        disabled={!isAdmin || isPending}
                        onChange={(e) => update(s.key, { backgroundColorDark: e.target.value })}
                        className={colorInputClass}
                        aria-label={`Tło wiersza (ciemny motyw): ${s.label}`}
                      />
                      {s.backgroundColorDark ? (
                        <button type="button" onClick={() => update(s.key, { backgroundColorDark: null })} className="text-xs text-muted hover:text-foreground">
                          auto
                        </button>
                      ) : (
                        <span className="text-xs text-muted">{s.backgroundColor ? "jak jasny" : "brak"}</span>
                      )}
                    </div>
                  </td>

                  <td className="border-l border-border px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <Preview def={s} dark={false} />
                      <Preview def={s} dark />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {editing ? (
                        <>
                          <Button size="sm" variant="secondary" disabled={isPending} onClick={() => saveLabel(s.key)}>
                            <Check size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingKey(null)}>
                            <X size={14} />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditingKey(s.key);
                              setEditLabel(s.label);
                            }}
                          >
                            <Pencil size={14} />
                            Zmień nazwę
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() =>
                              update(s.key, {
                                textColor: defaults?.textColor ?? "#1d1d1b",
                                backgroundColor: null,
                                textColorDark: null,
                                backgroundColorDark: null,
                              })
                            }
                          >
                            Domyślne
                          </Button>
                          {!s.isSystem && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isPending || used > 0}
                              title={used > 0 ? "Status jest używany przez sprzęt" : "Usuń status"}
                              onClick={() => setDeleteTarget(s)}
                            >
                              <Trash2 size={14} />
                              Usuń
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Usunąć ten status?"
        description={
          deleteTarget ? `Status „${deleteTarget.label}” zostanie usunięty. Żaden sprzęt go nie używa.` : undefined
        }
        confirmLabel="Usuń"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
