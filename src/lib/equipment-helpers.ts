import type { Assignment, Category, Employee, Equipment, EquipmentLink } from "./types";

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

export function getEmployeeName(employees: Employee[], employeeId: string | undefined): string {
  if (!employeeId) return "—";
  return employees.find((e) => e.id === employeeId)?.fullName ?? "—";
}
