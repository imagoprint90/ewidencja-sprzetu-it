import type { Employee } from "@/lib/types";
import { employeeFullName } from "@/lib/equipment-helpers";

// Podstawia placeholdery (patrz NOTIFICATION_PLACEHOLDERS w types.ts) danymi konkretnego
// pracownika — używane zarówno w podglądzie przed wysyłką, jak i w samej treści maila.
export function renderNotificationText(
  text: string,
  employee: Pick<Employee, "firstName" | "lastName" | "email" | "department">,
  assignedEquipmentNames: string[]
): string {
  return text
    .replaceAll("{{imie}}", employee.firstName)
    .replaceAll("{{nazwisko}}", employee.lastName ?? "")
    .replaceAll("{{email}}", employee.email ?? "")
    .replaceAll("{{dzial}}", employee.department ?? "")
    .replaceAll("{{sprzet}}", assignedEquipmentNames.length > 0 ? assignedEquipmentNames.join(", ") : "brak");
}

export function employeeDisplayLabel(employee: {
  firstName: string;
  lastName: string | null;
  email: string | null;
}): string {
  const name = employeeFullName(employee);
  return employee.email ? `${name} (${employee.email})` : `${name} — brak e-maila`;
}
