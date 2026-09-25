"use client";

import { useState } from "react";
import type { SortDirection } from "./sort";
import { useLocalStorage } from "./useLocalStorage";

interface SortState<K> {
  key: K | null;
  dir: SortDirection;
}

// Stan sortowania jednej tabeli: klik na nagłówek ustawia rosnąco, kolejny klik na ten sam
// nagłówek odwraca kierunek, klik na inny nagłówek zaczyna od rosnąco. Z podanym storageKey
// sortowanie jest zapamiętywane w przeglądarce (przeżywa przeładowanie strony).
export function useSort<K extends string>(
  defaultKey: K | null = null,
  defaultDirection: SortDirection = "asc",
  storageKey?: string
) {
  const [local, setLocal] = useState<SortState<K>>({ key: defaultKey, dir: defaultDirection });
  const [stored, setStored] = useLocalStorage<SortState<K>>(storageKey ?? "__sort-unused", {
    key: defaultKey,
    dir: defaultDirection,
  });
  const state = storageKey ? stored : local;
  const setState = storageKey ? setStored : setLocal;

  function toggleSort(key: K) {
    setState((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  }

  return { sortKey: state.key, sortDir: state.dir, toggleSort };
}