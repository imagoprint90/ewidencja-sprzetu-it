import type { Assignment, Category, Employee, Equipment, EquipmentLink } from "@/lib/types";

// Mapowanie wierszy z bazy (snake_case) na typy używane w interfejsie (camelCase).

export function mapCategory(row: {
  id: string;
  name: string;
  is_archived: boolean;
  created_at: string;
}): Category {
  return {
    id: row.id,
    name: row.name,
    isArchived: row.is_archived,
    createdAt: row.created_at,
  };
}

export function mapEmployee(row: {
  id: string;
  full_name: string;
  email: string | null;
  department: string;
  location: string;
  is_active: boolean;
  created_at: string;
}): Employee {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    department: row.department,
    location: row.location,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export function mapEquipment(row: {
  id: string;
  inventory_number: string;
  category_id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  warranty_end: string | null;
  technical_condition: Equipment["technicalCondition"];
  purchase_price: number | string | null;
  status: Equipment["status"];
  location: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}): Equipment {
  return {
    id: row.id,
    inventoryNumber: row.inventory_number,
    categoryId: row.category_id,
    name: row.name,
    manufacturer: row.manufacturer,
    model: row.model,
    serialNumber: row.serial_number,
    purchaseDate: row.purchase_date,
    warrantyEnd: row.warranty_end,
    technicalCondition: row.technical_condition,
    purchasePrice: row.purchase_price === null ? null : Number(row.purchase_price),
    status: row.status,
    location: row.location,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAssignment(row: {
  id: string;
  equipment_id: string;
  employee_id: string;
  assigned_at: string;
  returned_at: string | null;
  assigned_condition: Assignment["assignedCondition"];
  returned_condition: Assignment["returnedCondition"];
  notes: string | null;
  created_at: string;
}): Assignment {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    employeeId: row.employee_id,
    assignedAt: row.assigned_at,
    returnedAt: row.returned_at,
    assignedCondition: row.assigned_condition,
    returnedCondition: row.returned_condition,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function mapEquipmentLink(row: {
  id: string;
  equipment_id: string;
  linked_equipment_id: string;
}): EquipmentLink {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    linkedEquipmentId: row.linked_equipment_id,
  };
}
