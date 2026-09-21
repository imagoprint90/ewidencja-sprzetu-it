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
  canEditEquipment: boolean;
  canTransferEquipment: boolean;
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

// "administrator" edytuje wszystko. Inne konta edytują sprzęt tylko z jawnie włączoną flagą
// canEditEquipment (albo historyczną rolą "edycja_podglad" sprzed wprowadzenia addytywnych
// uprawnień) — i tylko w swoich kategoriach, co wymusza RLS, tu tylko decydujemy o UI edycji.
export function useCanEditEquipment(): boolean {
  const { role, canEditEquipment } = useCurrentUser();
  return role === "administrator" || role === "edycja_podglad" || canEditEquipment;
}

// Czy dana kategoria jest w zasięgu obecnego użytkownika do EDYCJI sprzętu.
export function useCanEditEquipmentCategory(categoryId: string): boolean {
  const { role, visibleCategories } = useCurrentUser();
  if (role === "administrator") return true;
  return (visibleCategories ?? []).includes(categoryId);
}

// Operacja "Przekaż sprzęt" (przekazanie/zwrot) i generowanie protokołów, plus wgląd/usuwanie
// WŁASNYCH wystawionych protokołów — patrz ProtokolyClient.tsx.
export function useCanTransferEquipment(): boolean {
  const { role, canTransferEquipment } = useCurrentUser();
  return role === "administrator" || canTransferEquipment;
}

export function useCanViewTab(tab: TabKey): boolean {
  const { role, visibleTabs } = useCurrentUser();
  return canViewTab(role, visibleTabs, tab);
}
