"use client";

import { useState } from "react";
import type { SortDirection } from "./sort";

// Stan sortowania jednej tabeli: klik na nagłówek ustawia rosnąco, kolejny klik na ten sam
// nagłówek odwraca kierunek, klik na inny nagłówek zaczyna od rosnąco.
export function useSort<K extends string>(
  defaultKey: K | null = null,
  defaultDirection: SortDirection = "asc"
) {
  const [sortKey, setSortKey] = useState<K | null>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDirection>(defaultDirection);

  function toggleSort(key: K) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return { sortKey, sortDir, toggleSort };
}
