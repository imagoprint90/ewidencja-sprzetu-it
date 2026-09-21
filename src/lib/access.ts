// Zakładki, które można niezależnie włączyć/wyłączyć dla konta z rolą "podglad" (widok
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

// "administrator" — pełny dostęp wszędzie. "podglad" — tylko odczyt, zakładki opcjonalnie
// ograniczone przez visible_tabs. "edycja_podglad" — jak "podglad" wszędzie poza Sprzętem,
// gdzie może też edytować, ale tylko w kategoriach z visible_categories (patrz
// current-user-context.tsx, useCanEditEquipment / useCanEditEquipmentCategory).
export type AppRole = "administrator" | "podglad" | "edycja_podglad";

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  administrator: "Administrator",
  podglad: "Tylko podgląd",
  edycja_podglad: "Edycja i podgląd (sprzęt)",
};

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
