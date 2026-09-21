"use client";

import { createContext, useContext, type ReactNode } from "react";
import { canViewTab, type AppRole, type TabKey } from "@/lib/access";

interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  visibleTabs: string[] | null;
  visibleCategories: string[] | null;
}

const CurrentUserContext = createContext<CurrentUser | null>(null);

export function CurrentUserProvider({
  value,
  children,
}: {
  value: CurrentUser;
  children: ReactNode;
}) {
  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): CurrentUser {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error("useCurrentUser musi być używany wewnątrz CurrentUserProvider");
  return ctx;
}

export function useIsAdmin(): boolean {
  return useCurrentUser().role === "administrator";
}

// "administrator" edytuje wszystko; "edycja_podglad" edytuje tylko sprzęt (i tylko w swoich
// kategoriach — to jest wymuszane przez RLS, tu tylko decydujemy czy w ogóle pokazać UI edycji).
export function useCanEditEquipment(): boolean {
  const role = useCurrentUser().role;
  return role === "administrator" || role === "edycja_podglad";
}

// Czy dana kategoria jest w zasięgu obecnego użytkownika do EDYCJI sprzętu (nie tylko
// odczytu — podgląd sprzętu poza własnymi kategoriami dla "edycja_podglad" i tak nie zdarzy
// się w praktyce, bo RLS filtruje listę sprzętu już na poziomie zapytania).
export function useCanEditEquipmentCategory(categoryId: string): boolean {
  const { role, visibleCategories } = useCurrentUser();
  if (role === "administrator") return true;
  if (role !== "edycja_podglad") return false;
  return (visibleCategories ?? []).includes(categoryId);
}

export function useCanViewTab(tab: TabKey): boolean {
  const { role, visibleTabs } = useCurrentUser();
  return canViewTab(role, visibleTabs, tab);
}
