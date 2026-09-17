"use client";

import { useEffect, useState } from "react";

// Wygoda dla pojedynczej przeglądarki (np. zapamiętanie widocznych kolumn).
// Nigdy nie używać do danych firmowych — te muszą trafiać do Supabase.
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignorujemy — np. tryb prywatny przeglądarki
    }
  }, [key, value]);

  return [value, setValue] as const;
}
