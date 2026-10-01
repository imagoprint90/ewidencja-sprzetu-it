// Zakładki, które można niezależnie włączyć/wyłączyć dla kont innych niż administrator (widok
// Użytkownicy). "Pulpit" jest zawsze dostępny (strona startowa), a "Użytkownicy" jest zawsze
// dostępny wyłącznie dla roli "administrator" — obie celowo nie są tu wymienione.
export const ASSIGNABLE_TABS = [
  { key: "sprzet", label: "Sprzęt" },
  { key: "pracownicy", label: "Pracownicy" },
  { key: "oprogramowanie", label: "Oprogramowanie" },
  { key: "protokoly", label: "Protokoły" },
  { key: "tickety", label: "Tickety" },
  { key: "kategorie", label: "Kategorie" },
  { key: "lokalizacje", label: "Lokalizacje" },
  { key: "ustawienia", label: "Ustawienia (dane firmy)" },
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

// Uprawnienia modułu Tickety — wyłącznie addytywne flagi (ten sam wzorzec co ExtraPermissions
// powyżej), dostęp do samej zakładki idzie przez ASSIGNABLE_TABS/visibleTabs jak zawsze.
// visibleTicketCategories: null = widzi tickety ze wszystkich kategorii (gdy canViewAll).
export interface TicketPermissions {
  canCreate: boolean;
  canViewOwn: boolean;
  canViewAssigned: boolean;
  canViewAll: boolean;
  canEdit: boolean;
  canComment: boolean;
  canChangeStatus: boolean;
  canChangePriority: boolean;
  canAssign: boolean;
  canClose: boolean;
  canAdmin: boolean;
  visibleTicketCategories: string[] | null;
}

export const EMPTY_TICKET_PERMISSIONS: TicketPermissions = {
  canCreate: false,
  canViewOwn: false,
  canViewAssigned: false,
  canViewAll: false,
  canEdit: false,
  canComment: false,
  canChangeStatus: false,
  canChangePriority: false,
  canAssign: false,
  canClose: false,
  canAdmin: false,
  visibleTicketCategories: [],
};

// Trzy gotowe szablony uprawnień proponowane w panelu Użytkownicy — tylko wygoda UI (ustawiają
// checkboxy za jednym kliknięciem), nie są osobnym bytem w bazie.
export const TICKET_PERMISSION_PRESETS: Record<string, { label: string; permissions: Omit<TicketPermissions, "visibleTicketCategories"> }> = {
  zglaszajacy: {
    label: "Zgłaszający",
    permissions: {
      canCreate: true,
      canViewOwn: true,
      canViewAssigned: false,
      canViewAll: false,
      canEdit: false,
      canComment: true,
      canChangeStatus: false,
      canChangePriority: false,
      canAssign: false,
      canClose: false,
      canAdmin: false,
    },
  },
  obslugujacy: {
    label: "Obsługujący",
    permissions: {
      canCreate: true,
      canViewOwn: true,
      canViewAssigned: true,
      canViewAll: false,
      canEdit: false,
      canComment: true,
      canChangeStatus: true,
      canChangePriority: false,
      canAssign: false,
      canClose: false,
      canAdmin: false,
    },
  },
  koordynator: {
    label: "Koordynator / administrator",
    permissions: {
      canCreate: true,
      canViewOwn: true,
      canViewAssigned: true,
      canViewAll: true,
      canEdit: true,
      canComment: true,
      canChangeStatus: true,
      canChangePriority: true,
      canAssign: true,
      canClose: true,
      canAdmin: true,
    },
  },
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
