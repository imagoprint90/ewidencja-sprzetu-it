"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

// Prosta paginacja po stronie klienta (filtr/sort już zawęził listę, to tylko dzieli wynik na
// strony) — żaden inny moduł w aplikacji jeszcze tego nie potrzebował, więc to nowy,
// samodzielny komponent w stylu reszty UI (nie wzorowany na istniejącym odpowiedniku).
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted">{total === 0 ? "Brak pozycji" : `${from}–${to} z ${total}`}</p>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-muted">
          Na stronę:
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-md border border-border bg-surface px-2 py-1 text-sm outline-none focus:border-primary"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft size={14} />
          </Button>
          <span className="px-2 text-muted">
            {page} / {totalPages}
          </span>
          <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
