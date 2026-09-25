import type { Assignment, Category, Department, Employee, Equipment, EquipmentLink, Location, LastProtocolInfo, Protocol, TechnicalCondition } from "./types";
import { TECHNICAL_CONDITION_LABELS } from "./types";
import type { EquipmentInput } from "./supabase/actions/equipment-actions";

export function equipmentToInput(item: Equipment): EquipmentInput {
  return {
    inventoryNumber: item.inventoryNumber,
    categoryId: item.categoryId,
    name: item.name,
    manufacturer: item.manufacturer,
    model: item.model,
    serialNumber: item.serialNumber,
    purchaseDate: item.purchaseDate,
    warrantyEnd: item.warrantyEnd,
    technicalCondition: item.technicalCondition,
    purchasePrice: item.purchasePrice,
    inDomain: item.inDomain,
    windowsEdition: item.windowsEdition ?? undefined,
    notes: item.notes,
  };
}

export function getLocationName(locations: Location[], locationId: string | null): string {
  return locations.find((l) => l.id === locationId)?.name ?? "—";
}

export function getDepartmentName(departments: Department[], departmentId: string | null): string {
  return departments.find((d) => d.id === departmentId)?.name ?? "—";
}

export function getCategoryName(categories: Category[], categoryId: string): string {
  return categories.find((c) => c.id === categoryId)?.name ?? "—";
}

export function getActiveAssignment(
  assignments: Assignment[],
  equipmentId: string
): Assignment | undefined {
  return assignments.find((a) => a.equipmentId === equipmentId && a.returnedAt === null);
}

export function getLinkedEquipment(
  links: EquipmentLink[],
  equipmentList: Equipment[],
  equipmentId: string
): Equipment[] {
  const linkedIds = links
    .filter((l) => l.equipmentId === equipmentId || l.linkedEquipmentId === equipmentId)
    .map((l) => (l.equipmentId === equipmentId ? l.linkedEquipmentId : l.equipmentId));
  return equipmentList.filter((e) => linkedIds.includes(e.id));
}

// Pracownik ma osobne pola imię/nazwisko w bazie (nie jedno pole "pełne imię i nazwisko") —
// to jedyne miejsce, które je łączy do wyświetlenia. Używać wszędzie tam, gdzie wcześniej
// było employee.fullName.
export function employeeFullName(employee: { firstName: string; lastName: string | null }): string {
  return [employee.firstName, employee.lastName].filter(Boolean).join(" ");
}

export function getEmployeeName(employees: Employee[], employeeId: string | undefined): string {
  if (!employeeId) return "—";
  const employee = employees.find((e) => e.id === employeeId);
  return employee ? employeeFullName(employee) : "—";
}

// Nazwy sprzętu aktualnie przydzielonego danemu pracownikowi — używane m.in. jako
// placeholder {{sprzet}} w treści powiadomień mailowych.
export function getAssignedEquipmentNames(
  assignments: Assignment[],
  equipment: Equipment[],
  employeeId: string
): string[] {
  const equipmentIds = assignments
    .filter((a) => a.employeeId === employeeId && a.returnedAt === null)
    .map((a) => a.equipmentId);
  return equipment.filter((e) => equipmentIds.includes(e.id)).map((e) => e.name);
}

// Dla każdego sprzętu: ostatni protokół (wg daty utworzenia) wraz ze stanem technicznym
// z tego protokołu. Liczone raz na serwerze — do przeglądarki idzie tylko ten skrót, a nie
// wszystkie protokoły z pełnymi migawkami.
export function buildLastProtocols(
  equipment: { id: string; inventoryNumber: string }[],
  protocols: Protocol[],
  protocolItemLinks: { protocolId: string; equipmentId: string }[]
): Record<string, LastProtocolInfo> {
  const protocolById = new Map(protocols.map((p) => [p.id, p]));
  const latest = new Map<string, Protocol>();
  for (const link of protocolItemLinks) {
    const p = protocolById.get(link.protocolId);
    if (!p) continue;
    const current = latest.get(link.equipmentId);
    if (!current || current.createdAt < p.createdAt) latest.set(link.equipmentId, p);
  }
  const result: Record<string, LastProtocolInfo> = {};
  for (const e of equipment) {
    const p = latest.get(e.id);
    if (!p) continue;
    result[e.id] = {
      id: p.id,
      protocolNumber: p.protocolNumber,
      pdfStatus: p.pdfStatus,
      pdfPath: p.pdfPath,
      createdAt: p.createdAt,
      condition: getProtocolCondition(p, e.inventoryNumber),
    };
  }
  return result;
}
// Stan techniczny zapisany w protokole dla danej pozycji (per-pozycja, a w starszych
// protokołach — jedno pole globalne). null, gdy sprzęt nie ma jeszcze żadnego protokołu.
export function getProtocolCondition(protocol: Protocol | undefined, inventoryNumber: string): string | null {
  if (!protocol) return null;
  const item = protocol.snapshot.items.find((i) => i.inventoryNumber === inventoryNumber);
  return item?.technicalConditionLabel ?? protocol.snapshot.technicalConditionLabel ?? null;
}

// Stan techniczny do pokazania na liście: z ostatniego protokołu, a gdy sprzęt nie ma protokołu
// (albo protokół nie niesie tej informacji) — z pola "Stan techniczny" na karcie sprzętu.
export function getEffectiveCondition(
  item: { technicalCondition: TechnicalCondition | null },
  lastProtocol: { condition: string | null } | undefined
): string | null {
  return (
    lastProtocol?.condition ?? (item.technicalCondition ? TECHNICAL_CONDITION_LABELS[item.technicalCondition] : null)
  );
}

export const NO_PROTOCOL_CONDITION = "__brak";