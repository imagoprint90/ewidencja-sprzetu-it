"use client";

import { createContext, useContext, type ReactNode } from "react";

interface CurrentUser {
  email: string;
  fullName: string;
  role: "administrator" | "podglad";
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
