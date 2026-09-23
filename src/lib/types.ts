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
  w_magazynie: "#16a34a",
  przydzielony: "#1d1d1b",
  w_naprawie: "#ef7d00",
  zepsuty: "#dc2626",
  wycofany: "#6b7280",
};

export type TechnicalCondition = "nowy" | "bardzo_dobry" | "dobry" | "dostateczny" | "uszkodzony";

export const TECHNICAL_CONDITION_LABELS: Record<TechnicalCondition, string> = {
  nowy: "Nowy",
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
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
  locationId: string | null;
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
  purchaseInvoicePath: string | null;
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
  // Wewnętrzna nazwa ewidencyjna sprzętu — nie pokazywana na PDF (tam sprzęt identyfikuje
  // producent+model, pole "name"), tylko w kolumnie "Nazwa sprzętu" listy Protokołów.
  // Opcjonalne, bo starsze protokoły (sprzed tej zmiany) nie mają tego pola w migawce.
  equipmentName?: string;
  // Opcjonalne z tego samego powodu co equipmentName — starsze protokoły miały tylko
  // jedno globalne pole "Stan techniczny" (poza tabelą), nie per-pozycja.
  technicalConditionLabel?: string;
  quantity: number;
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
  // Osoba, która fizycznie wydała sprzęt — opcjonalna, niekoniecznie ta sama osoba co
  // reprezentant firmy z issuedByName (np. informatyk dostarczający sprzęt w imieniu firmy).
  // Gdy podana, protokół pokazuje ją jako dodatkową stronę z miejscem na podpis.
  // Opcjonalne pole (?) — starsze protokoły sprzed tej zmiany nie mają go w migawce.
  handoverPersonName?: string | null;
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
  representativeName: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationStatus = "wyslano" | "blad";

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  wyslano: "Wysłano",
  blad: "Błąd wysyłki",
};

export interface NotificationLogEntry {
  id: string;
  employeeId: string | null;
  employeeName: string;
  employeeEmail: string;
  templateId: string | null;
  templateName: string | null;
  subject: string;
  body: string;
  status: NotificationStatus;
  errorMessage: string | null;
  sentBy: string | null;
  sentByName: string;
  scheduleId: string | null;
  createdAt: string;
}

// Dni tygodnia w numeracji ISO-8601 (1 = poniedziałek ... 7 = niedziela), tak jak
// przechowywane w notification_schedules.days_of_week.
export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  1: "Pon",
  2: "Wt",
  3: "Śr",
  4: "Czw",
  5: "Pt",
  6: "Sob",
  7: "Nd",
};

export interface NotificationSchedule {
  id: string;
  name: string;
  templateId: string;
  employeeIds: string[];
  sendTime: string; // "HH:MM"
  daysOfWeek: number[];
  isActive: boolean;
  lastSentDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// Placeholdery dostępne w treści szablonu — podstawiane danymi konkretnego pracownika przy
// wysyłce (patrz src/lib/notification-helpers.ts).
export const NOTIFICATION_PLACEHOLDERS: { token: string; description: string }[] = [
  { token: "{{imie}}", description: "Imię pracownika" },
  { token: "{{nazwisko}}", description: "Nazwisko pracownika" },
  { token: "{{email}}", description: "E-mail pracownika" },
  { token: "{{dzial}}", description: "Dział pracownika" },
  { token: "{{sprzet}}", description: "Lista aktualnie przydzielonego sprzętu" },
];

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
  "lastProtocol",
  "invoice",
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
  lastProtocol: "Ostatni protokół",
  invoice: "FV",
};
