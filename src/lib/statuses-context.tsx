"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_EQUIPMENT_STATUSES, type EquipmentStatusDef } from "@/lib/types";
import { adaptColorForTheme } from "@/lib/useTheme";

const StatusesContext = createContext<EquipmentStatusDef[]>(DEFAULT_EQUIPMENT_STATUSES);

export function StatusesProvider({
  value,
  children,
}: {
  value: EquipmentStatusDef[];
  children: React.ReactNode;
}) {
  return <StatusesContext.Provider value={value}>{children}</StatusesContext.Provider>;
}

export function useStatuses(): EquipmentStatusDef[] {
  return useContext(StatusesContext);
}

// Słownik key -> definicja. Nieznany klucz (np. status usunięty w międzyczasie) dostaje
// neutralny wygląd, żeby lista nigdy się nie wywróciła.
export function useStatusLookup() {
  const statuses = useStatuses();
  return useMemo(() => {
    const map = new Map(statuses.map((s) => [s.key, s]));
    return (key: string): EquipmentStatusDef =>
      map.get(key) ?? {
        key,
        label: key,
        textColor: "#6b7280",
        backgroundColor: null,
        isSystem: false,
        sortOrder: 999,
      };
  }, [statuses]);
}
// Kolory statusu do wyświetlenia w danym motywie: w ciemnym — ustawione przez administratora
// kolory ciemne, a gdy ich brak, automatycznie rozjaśniony kolor jasnego motywu.
export function resolveStatusColors(
  def: EquipmentStatusDef,
  isDark: boolean
): { text: string; background: string | null } {
  if (!isDark) return { text: def.textColor, background: def.backgroundColor };
  return {
    text: def.textColorDark ?? adaptColorForTheme(def.textColor, true) ?? def.textColor,
    background: def.backgroundColorDark ?? def.backgroundColor,
  };
}