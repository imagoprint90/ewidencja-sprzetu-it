import { TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from "./types";
import type { TicketCategory, TicketHistoryEntry, TicketPriority, TicketStatus } from "./types";

export function getTicketCategoryName(categories: TicketCategory[], categoryId: string | null): string {
  if (!categoryId) return "—";
  return categories.find((c) => c.id === categoryId)?.name ?? "—";
}

type BadgeTone = "default" | "success" | "warning" | "danger";

// Priorytet krytyczny musi rzucać się w oczy na liście — stąd "danger" (czerwień), nie tylko
// pogrubienie. Wysoki = ostrzegawczy pomarańcz, zwykły = neutralny.
export function ticketPriorityTone(priority: TicketPriority): BadgeTone {
  if (priority === "krytyczny") return "danger";
  if (priority === "wysoki") return "warning";
  return "default";
}

export function ticketStatusTone(status: TicketStatus): BadgeTone {
  switch (status) {
    case "rozwiazane":
      return "success";
    case "w_trakcie":
      return "warning";
    case "oczekujace":
      return "warning";
    case "zamkniete":
      return "default";
    case "nowe":
    default:
      return "default";
  }
}

// Wpisy "zmiana_statusu"/"zmiana_priorytetu" trzymają w bazie surowe wartości enuma (np.
// "w_trakcie") — tu zamieniane na etykiety PL. Wpisy "zmiana_kategorii"/"przydzielono" trzymają
// już gotowe nazwy (migawka z triggera), więc wyświetlane są wprost.
export function ticketHistoryChangeText(entry: TicketHistoryEntry): string {
  if (entry.action === "zmiana_statusu") {
    const oldLabel = entry.oldValue ? (TICKET_STATUS_LABELS[entry.oldValue as TicketStatus] ?? entry.oldValue) : "—";
    const newLabel = entry.newValue ? (TICKET_STATUS_LABELS[entry.newValue as TicketStatus] ?? entry.newValue) : "—";
    return `${oldLabel} → ${newLabel}`;
  }
  if (entry.action === "zmiana_priorytetu") {
    const oldLabel = entry.oldValue ? (TICKET_PRIORITY_LABELS[entry.oldValue as TicketPriority] ?? entry.oldValue) : "—";
    const newLabel = entry.newValue ? (TICKET_PRIORITY_LABELS[entry.newValue as TicketPriority] ?? entry.newValue) : "—";
    return `${oldLabel} → ${newLabel}`;
  }
  if (entry.action === "zmiana_kategorii" || entry.action === "przydzielono") {
    return `${entry.oldValue ?? "—"} → ${entry.newValue ?? "—"}`;
  }
  if (entry.action === "wyslano_powiadomienie") {
    return entry.newValue ?? "";
  }
  return "";
}
