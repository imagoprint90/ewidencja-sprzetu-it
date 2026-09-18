"use client";

import { createContext, useContext, type ReactNode } from "react";
import { canViewTab, type TabKey } from "@/lib/access";

interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: "administrator" | "podglad";
  visibleTabs: string[] | null;
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

export function useCanViewTab(tab: TabKey): boolean {
  const { role, visibleTabs } = useCurrentUser();
  return canViewTab(role, visibleTabs, tab);
}
