// Typy domenowe odzwierciedlające docelowy schemat bazy Supabase (patrz supabase/migrations).
// W trybie demonstracyjnym te same typy są używane dla danych trzymanych w przeglądarce.

export type EquipmentStatus =
  | "w_magazynie"
  | "przydzielony"
  | "w_naprawie"
  | "zepsuty"
  | "wycofany";

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  w_magazynie: "W magazynie",
  przydzielony: "Przydzielony",
  w_naprawie: "W naprawie",
  zepsuty: "Zepsuty",
  wycofany: "Wycofany",
};

// Kolor czcionki całego wiersza sprzętu na liście, zależny od statusu. "W magazynie" i
// "Przydzielony" są sterowane automatycznie (operacja "Przekaż sprzęt"), pozostałe trzy
// ustawia się ręcznie na liście sprzętu.
export const EQUIPMENT_STATUS_COLORS: Record<EquipmentStatus, string> = {
  w_magazynie: "#1a2332",
  przydzielony: "#1a2332",
  w_naprawie: "#d97706",
  zepsuty: "#dc2626",
  wycofany: "#6b7280",
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

export interface Location {
  id: string;
  name: string;
  isArchived: boolean;
  isWarehouse: boolean;
  createdAt: string;
}

export interface Employee {
  id: string;
  fullName: string;
  email: string | null;
  department: string;
  locationId: string;
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
  locationId: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LicenseType = "urzadzenie" | "uzytkownik";

export const LICENSE_TYPE_LABELS: Record<LicenseType, string> = {
  urzadzenie: "Na urządzenie",
  uzytkownik: "Na użytkownika",
};

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

export const PROTOCOL_TYPE_LABELS: Record<ProtocolType, string> = {
  wydanie: "Wydanie sprzętu",
  przekazanie: "Przekazanie sprzętu",
  zwrot: "Zwrot do magazynu",
};

export const PROTOCOL_STATUS_LABELS: Record<ProtocolPdfStatus, string> = {
  oczekuje: "Oczekuje",
  wygenerowany: "Wygenerowany",
  blad: "Błąd generowania",
};

export interface ProtocolItemData {
  name: string;
  category: string;
  inventoryNumber: string;
  serialNumber: string | null;
}

export interface ProtocolSnapshot {
  protocolNumber: string;
  type: ProtocolType;
  companyName: string;
  companyAddress: string;
  companyNip: string | null;
  city: string;
  issuedAt: string;
  issuedByName: string;
  previousEmployeeName: string | null;
  newEmployeeName: string | null;
  technicalConditionLabel: string;
  notes: string | null;
  items: ProtocolItemData[];
}

export interface Protocol {
  id: string;
  protocolNumber: string;
  type: ProtocolType;
  issuedBy: string | null;
  issuedByName: string;
  issuedAt: string;
  city: string;
  snapshot: ProtocolSnapshot;
  pdfStatus: ProtocolPdfStatus;
  pdfPath: string | null;
  pdfError: string | null;
  signedScanPath: string | null;
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
