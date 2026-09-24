"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { inputClass } from "./Form";

export interface SearchableOption {
  value: string;
  label: string;
  // Dopisek po prawej stronie opcji (np. "użyty 3×") — wyszukiwanie działa tylko po label.
  hint?: string;
}

// Lista wyboru z wyszukiwarką: kliknięcie otwiera listę, pisanie filtruje, strzałki + Enter
// wybierają, Esc zamyka. Zamiennik zwykłego <select> tam, gdzie opcji jest dużo.
export function SearchableSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "Wybierz…",
  searchPlaceholder = "Szukaj…",
}: {
  id?: string;
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const selected = options.find((o) => o.value === value);

  function choose(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[active];
      if (opt) choose(opt.value);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        id={id}
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setActive(0);
        }}
        className={`${inputClass} flex items-center justify-between gap-2 text-left`}
      >
        <span className={selected ? "truncate" : "truncate text-muted"}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={16} className="shrink-0 text-muted" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded-lg border border-border bg-surface shadow-lg">
          <div className="relative border-b border-border p-2">
            <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-border bg-surface py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto p-1" role="listbox">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted">Brak wyników.</li>
            ) : (
              filtered.map((o, i) => (
                <li key={o.value} role="option" aria-selected={o.value === value}>
                  <button
                    type="button"
                    onClick={() => choose(o.value)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm ${
                      i === active ? "bg-primary/10" : ""
                    }`}
                  >
                    <span className="flex-1 truncate">{o.label}</span>
                    {o.hint && <span className="shrink-0 text-xs text-muted">{o.hint}</span>}
                    {o.value === value && <Check size={14} className="shrink-0 text-primary" />}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
