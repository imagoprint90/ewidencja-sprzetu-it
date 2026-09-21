// Zakładki, które można niezależnie włączyć/wyłączyć dla kont innych niż administrator (widok
// Użytkownicy). "Pulpit" jest zawsze dostępny (strona startowa), a "Użytkownicy" jest zawsze
// dostępny wyłącznie dla roli "administrator" — obie celowo nie są tu wymienione.
export const ASSIGNABLE_TABS = [
  { key: "sprzet", label: "Sprzęt" },
  { key: "pracownicy", label: "Pracownicy" },
  { key: "oprogramowanie", label: "Oprogramowanie" },
  { key: "protokoly", label: "Protokoły" },
  { key: "kategorie", label: "Kategorie" },
  { key: "lokalizacje", label: "Lokalizacje" },
  { key: "ustawienia", label: "Ustawienia" },
] as const;

export type TabKey = (typeof ASSIGNABLE_TABS)[number]["key"];

export const ASSIGNABLE_TAB_KEYS: TabKey[] = ASSIGNABLE_TABS.map((t) => t.key);

// "administrator" — pełny dostęp wszędzie, wyłącza się z pozostałych ustawień (uprawnienia
// dodatkowe poniżej są dla niego bez znaczenia, zawsze ma wszystko). "podglad" — bazowa rola
// każdego innego konta: tylko odczyt, zakładki opcjonalnie ograniczone przez visibleTabs.
// "edycja_podglad" to historyczna wartość (Etap wcześniejszy) — nowe konta jej nie dostają,
// zastępują ją poniższe addytywne flagi; typ ją zawiera tylko na wypadek danych sprzed migracji.
export type AppRole = "administrator" | "podglad" | "edycja_podglad";

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  administrator: "Administrator",
  podglad: "Tylko podgląd",
  edycja_podglad: "Edycja i podgląd (sprzęt)",
};

// Uprawnienia dodatkowe — można je dowolnie łączyć na jednym koncie (poza administratorem,
// który ma je wszystkie niejawnie). Patrz current-user-context.tsx dla hooków korzystających
// z tych flag (useCanEditEquipment, useCanTransferEquipment, useCanEditEquipmentCategory).
export interface ExtraPermissions {
  canEditEquipment: boolean;
  canTransferEquipment: boolean;
  visibleCategories: string[] | null;
}

// null/undefined w visibleTabs = brak ograniczeń (widzi wszystko) — dotyczy zarówno
// administratora (zawsze pełny dostęp, wartość visibleTabs jest dla niego ignorowana) jak i
// kont bez jawnie skonfigurowanej listy (stan sprzed wprowadzenia tej funkcji).
export function canViewTab(
  role: AppRole,
  visibleTabs: string[] | null | undefined,
  tab: TabKey
): boolean {
  if (role === "administrator") return true;
  if (!visibleTabs) return true;
  return visibleTabs.includes(tab);
}
