// Typy domenowe odzwierciedlające docelowy schemat bazy Supabase (patrz supabase/migrations).
// W trybie demonstracyjnym te same typy są używane dla danych trzymanych w przeglądarce.

// Statusy sprzętu to słownik w bazie (tabela equipment_statuses), zarządzany w Ustawienia →
// Statusy sprzętu. Klucz jest tekstem; pięć kluczy systemowych ma znaczenie w logice aplikacji.
export type EquipmentStatus = string;

export interface EquipmentStatusDef {
  key: string;
  label: string;
  textColor: string;
  backgroundColor: string | null;
  // Kolory dla ciemnego motywu; null = automatycznie z kolorów jasnego motywu
  textColorDark?: string | null;
  backgroundColorDark?: string | null;
  isSystem: boolean;
  sortOrder: number;
}

// Wartości domyślne — używane, gdy słownik nie jest jeszcze dostępny (przed migracją 0039).
export const DEFAULT_EQUIPMENT_STATUSES: EquipmentStatusDef[] = [
  { key: "w_magazynie", label: "W magazynie", textColor: "#16a34a", backgroundColor: null, isSystem: true, sortOrder: 1 },
  { key: "przydzielony", label: "Przydzielony", textColor: "#1d1d1b", backgroundColor: null, isSystem: true, sortOrder: 2 },
  { key: "w_naprawie", label: "W naprawie", textColor: "#ef7d00", backgroundColor: null, isSystem: true, sortOrder: 3 },
  { key: "zepsuty", label: "Zepsuty", textColor: "#dc2626", backgroundColor: null, isSystem: true, sortOrder: 4 },
  { key: "wycofany", label: "Wycofany", textColor: "#6b7280", backgroundColor: null, isSystem: true, sortOrder: 5 },
];
export type WindowsEdition = "pro" | "home";

export const WINDOWS_EDITION_LABELS: Record<WindowsEdition, string> = {
  pro: "Pro",
  home: "Home",
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
  // Sprzęt z tej kategorii ma pole "Windows" (Pro/Home) — domyślnie tylko "Komputery".
  supportsWindows: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Location {
  id: string;
  name: string;
  isArchived: boolean;
  isWarehouse: boolean;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  isArchived: boolean;
  createdAt: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  departmentId: string | null;
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
  windowsEdition: WindowsEdition | null;
  inDomain: boolean;
  hasOpenvpn: boolean;
  status: EquipmentStatus;
  // null = brak lokalizacji (lokalizacja sprzętu jest niezależna od lokalizacji pracownika)
  locationId: string | null;
  // Pracownik wskazany ręcznie jako poprzedni posiadacz sprzętu — niezależny od historii
  // przydziałów (assignments), przydatny np. dla sprzętu wprowadzonego do systemu z historią.
  // Dokładnie jedno z lastHolderId / lastHolderName jest ustawione naraz (albo żadne).
  lastHolderId: string | null;
  // Nazwisko wpisane ręcznie, gdy osoby nie ma na liście pracowników.
  lastHolderName: string | null;
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
  purchaseDate: string | null;
  invoicePath: string | null;
  notes: string | null;
}

export interface SoftwareLicenseAssignment {
  id: string;
  licenseId: string;
  equipmentId: string | null;
  employeeId: string | null;
  assignedAt: string;
}

export interface LicenseHistoryEntry {
  id: string;
  licenseId: string | null;
  productName: string;
  licenseType: string;
  action: "przypisano" | "usunieto";
  equipmentName: string | null;
  employeeName: string | null;
  actorName: string | null;
  happenedAt: string;
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

// Skrót ostatniego protokołu sprzętu używany na liście Sprzęt.
export interface LastProtocolInfo {
  id: string;
  protocolNumber: string;
  pdfStatus: ProtocolPdfStatus;
  pdfPath: string | null;
  createdAt: string;
  condition: string | null;
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

// ------------------------------------------------------------------------------------------
// Moduł Tickety
// ------------------------------------------------------------------------------------------

export type TicketPriority = "zwykly" | "wysoki" | "krytyczny";
export type TicketStatus = "nowe" | "w_trakcie" | "oczekujace" | "rozwiazane" | "zamkniete";

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  zwykly: "Zwykły",
  wysoki: "Wysoki",
  krytyczny: "Krytyczny",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  nowe: "Nowe",
  w_trakcie: "W trakcie",
  oczekujace: "Oczekujące",
  rozwiazane: "Rozwiązane",
  zamkniete: "Zamknięte",
};

// Statusy, na które można przełączyć ticket operacją "Zmień status" (uprawnienie
// can_change_ticket_status) — "nowe" to tylko stan startowy, a "zamkniete" wymaga osobnego
// uprawnienia "Zamykanie i ponowne otwieranie" (patrz closeTicketAction/reopenTicketAction).
export const TICKET_WORKFLOW_STATUSES: TicketStatus[] = ["w_trakcie", "oczekujace", "rozwiazane"];

export interface TicketCategory {
  id: string;
  name: string;
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  createdBy: string;
  createdByName: string;
  assignedTo: string | null;
  assignedToName: string | null;
  createdAt: string;
  firstAssignedAt: string | null;
  lastAssigneeChangedAt: string | null;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  isArchived: boolean;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export type TicketHistoryAction =
  | "utworzono"
  | "przydzielono"
  | "zmiana_statusu"
  | "zmiana_priorytetu"
  | "zmiana_kategorii";

export const TICKET_HISTORY_ACTION_LABELS: Record<TicketHistoryAction, string> = {
  utworzono: "Utworzono zgłoszenie",
  przydzielono: "Zmieniono osobę odpowiedzialną",
  zmiana_statusu: "Zmieniono status",
  zmiana_priorytetu: "Zmieniono priorytet",
  zmiana_kategorii: "Zmieniono kategorię",
};

export interface TicketHistoryEntry {
  id: string;
  ticketId: string;
  actorId: string | null;
  actorName: string | null;
  action: TicketHistoryAction;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  happenedAt: string;
}

// Osoba, której można przydzielić ticket — lista z public.list_ticket_assignable_users()
// (RPC, bo zwykłe RLS na profiles nie pozwala odczytać cudzych wierszy).
export interface TicketAssignableUser {
  id: string;
  fullName: string;
}

// Kolumny dostępne do wyboru w tabeli sprzętu.
export const EQUIPMENT_COLUMNS = [
  "inventoryNumber",
  "category",
  "employee",
  "assignmentDates",
  "name",
  "manufacturer",
  "model",
  "serialNumber",
  "software",
  "linkedEquipment",
  "status",
  "location",
  "notes",
  "lastProtocol",
  "invoice",
  "domain",
  "openvpn",
  "protocolCondition",
  "windows",
  "lastHolder",
] as const;

export type EquipmentColumnKey = (typeof EQUIPMENT_COLUMNS)[number];

// Formatowanie tekstu kolumny na liście Sprzęt (pogrubienie/kursywa/przekreślenie) —
// zapamiętywane per przeglądarkę, tak samo jak kolor kolumny (ColumnPicker).
export interface ColumnFormat {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
}

export const EQUIPMENT_COLUMN_LABELS: Record<EquipmentColumnKey, string> = {
  inventoryNumber: "Nr inwentarzowy",
  category: "Kategoria",
  employee: "Pracownik",
  assignmentDates: "Przydzielenie / zwrot",
  name: "Nazwa sprzętu",
  manufacturer: "Producent/model",
  model: "Parametry",
  serialNumber: "Nr seryjny",
  software: "Oprogramowanie",
  linkedEquipment: "Powiązany sprzęt",
  status: "Status",
  location: "Lokalizacja",
  notes: "Uwagi",
  lastProtocol: "Ostatni protokół",
  invoice: "FV",
  domain: "Domena",
  openvpn: "OpenVPN",
  protocolCondition: "Stan techniczny",
  windows: "Windows",
  lastHolder: "Ostatni posiadacz",
};
