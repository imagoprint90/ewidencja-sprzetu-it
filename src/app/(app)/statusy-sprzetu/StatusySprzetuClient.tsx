"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  defaultStatusColors,
  EQUIPMENT_STATUS_LABELS,
  type EquipmentStatus,
  type StatusColors,
} from "@/lib/types";
import { saveStatusColorAction } from "@/lib/supabase/actions/status-color-actions";

const STATUSES = Object.keys(EQUIPMENT_STATUS_LABELS) as EquipmentStatus[];

// Tło wiersza jest półprzezroczyste, żeby działało tak samo w jasnym i ciemnym motywie.
export function rowBackground(hex: string | null): string | undefined {
  return hex ? `${hex}2e` : undefined;
}

export function StatusySprzetuClient({ initialColors }: { initialColors: StatusColors }) {
  const router = useRouter();
  const [colors, setColors] = useState<StatusColors>(initialColors);
  const [savingStatus, setSavingStatus] = useState<EquipmentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(status: EquipmentStatus, next: { text: string; background: string | null }) {
    setColors((prev) => ({ ...prev, [status]: next }));
    setSavingStatus(status);
    setError(null);
    startTransition(async () => {
      const result = await saveStatusColorAction(status, next.text, next.background);
      if (!result.ok) setError(result.error);
      setSavingStatus(null);
      router.refresh();
    });
  }

  const defaults = defaultStatusColors();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Statusy sprzętu</h1>
        <p className="text-sm text-muted">
          Ustaw kolor, którym na liście Sprzęt oznaczany jest cały wiersz zależnie od statusu.
          Kolor tekstu zmienia czcionkę wiersza, a opcjonalne tło podświetla go delikatnie.
          Zmiany zapisują się od razu i obowiązują wszystkich użytkowników.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      <div className="rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Kolor tekstu</th>
              <th className="px-4 py-3 font-medium">Tło wiersza</th>
              <th className="px-4 py-3 font-medium">Podgląd</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {STATUSES.map((s) => {
              const c = colors[s];
              return (
                <tr key={s} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{EQUIPMENT_STATUS_LABELS[s]}</td>
                  <td className="px-4 py-3">
                    <input
                      type="color"
                      value={c.text}
                      onChange={(e) => save(s, { ...c, text: e.target.value })}
                      className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent p-0"
                      aria-label={`Kolor tekstu: ${EQUIPMENT_STATUS_LABELS[s]}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={c.background ?? "#ffffff"}
                        onChange={(e) => save(s, { ...c, background: e.target.value })}
                        className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent p-0"
                        aria-label={`Tło wiersza: ${EQUIPMENT_STATUS_LABELS[s]}`}
                      />
                      {c.background ? (
                        <button
                          type="button"
                          onClick={() => save(s, { ...c, background: null })}
                          className="text-xs text-muted hover:text-foreground"
                        >
                          bez tła
                        </button>
                      ) : (
                        <span className="text-xs text-muted">brak</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="rounded px-3 py-1.5 text-sm font-medium"
                      style={{ color: c.text, backgroundColor: rowBackground(c.background) }}
                    >
                      Komputer-1 · INW/001
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending && savingStatus === s}
                      onClick={() => save(s, defaults[s])}
                    >
                      Domyślne
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}