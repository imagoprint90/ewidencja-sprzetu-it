// Typy domenowe odzwierciedlające docelowy schemat bazy Supabase (patrz supabase/migrations).
// W trybie demonstracyjnym te same typy są używane dla danych trzymanych w przeglądarce.

export type EquipmentStatus =
  | "w_magazynie"
  | "przydzielony"
  | "w_serwisie"
  | "wycofany";

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  w_magazynie: "W magazynie",
  przydzielony: "Przydzielony",
  w_serwisie: "W serwisie",
  wycofany: "Wycofany",
};

export type TechnicalCondition = "bardzo_dobry" | "dobry" | "dostateczny" | "uszkodzony";

export const TECHNICAL_CONDITION_LABELS: Record<TechnicalCondition, string> = {
  bardzo_dobry: "Bardzo dobry",
  dobry: "Dobry",
  dostateczny: "Dostateczny",
  uszkodzony: "Uszkodzony",
};

export interface Category {
  id: string;
  name: string;
  isArchived: boolean;
  createdAt: string;
}

export interface Employee {
  id: string;
  fullName: string;
  email: string | null;
  department: string;
  location: string;
  isActive: boolean;
  createdAt: string;
}

export interface EquipmentLink {
  id: string;
  equipmentId: string;
  linkedEquipmentId: string;
}

export interface Assignment {
  id: string;
  equipmentId: string;
  employeeId: string;
  assignedAt: string; // ISO date
  returnedAt: string | null; // ISO date, null = aktywny przydział
  assignedCondition: TechnicalCondition | null;
  returnedCondition: TechnicalCondition | null;
  notes: string | null;
  createdAt: string;
}

export interface Equipment {
  id: string;
  inventoryNumber: string;
  categoryId: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  warrantyEnd: string | null;
  technicalCondition: TechnicalCondition | null;
  purchasePrice: number | null;
  status: EquipmentStatus;
  location: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LicenseType = "urzadzenie" | "uzytkownik";

export interface SoftwareProduct {
  id: string;
  name: string;
  version: string | null;
  notes: string | null;
}

export interface SoftwareLicense {
  id: string;
  productId: string;
  licenseType: LicenseType;
  seatsTotal: number;
  validUntil: string | null;
  notes: string | null;
}

export interface SoftwareLicenseAssignment {
  id: string;
  licenseId: string;
  equipmentId: string | null;
  employeeId: string | null;
  assignedAt: string;
}

export interface InstalledSoftware {
  id: string;
  equipmentId: string;
  softwareProductId: string;
  installedAt: string;
  notes: string | null;
}

export type ProtocolType = "wydanie" | "zwrot" | "przekazanie";
export type ProtocolPdfStatus = "oczekuje" | "wygenerowany" | "blad";

export interface Protocol {
  id: string;
  protocolNumber: string;
  type: ProtocolType;
  issuedBy: string;
  issuedAt: string;
  city: string;
  pdfStatus: ProtocolPdfStatus;
  pdfPath: string | null;
  createdAt: string;
}

export interface CompanySettings {
  name: string;
  address: string;
  nip: string | null;
}

export interface AuditLogEntry {
  id: string;
  tableName: string;
  recordId: string;
  action: "utworzenie" | "edycja" | "archiwizacja";
  changedBy: string;
  changedAt: string;
  summary: string;
}

// Kolumny dostępne do wyboru w tabeli sprzętu.
export const EQUIPMENT_COLUMNS = [
  "inventoryNumber",
  "category",
  "employee",
  "assignmentDates",
  "name",
  "serialNumber",
  "software",
  "linkedEquipment",
  "status",
  "location",
  "notes",
] as const;

export type EquipmentColumnKey = (typeof EQUIPMENT_COLUMNS)[number];

export const EQUIPMENT_COLUMN_LABELS: Record<EquipmentColumnKey, string> = {
  inventoryNumber: "Nr inwentarzowy",
  category: "Kategoria",
  employee: "Pracownik",
  assignmentDates: "Przydzielenie / zwrot",
  name: "Nazwa sprzętu",
  serialNumber: "Nr seryjny",
  software: "Oprogramowanie",
  linkedEquipment: "Powiązany sprzęt",
  status: "Status",
  location: "Lokalizacja",
  notes: "Uwagi",
};
