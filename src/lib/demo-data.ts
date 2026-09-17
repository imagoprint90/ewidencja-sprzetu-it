// TRYB DEMONSTRACYJNY: dane fikcyjne trzymane wyłącznie w pamięci przeglądarki (React state).
// Znikają po odświeżeniu strony. To NIE jest trwałe przechowywanie danych firmowych —
// docelowa trwałość zapewni Supabase (patrz supabase/migrations oraz src/lib/supabase).

import type {
  Assignment,
  Category,
  CompanySettings,
  Employee,
  Equipment,
  EquipmentLink,
} from "./types";

export const DEMO_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Komputery", isArchived: false, createdAt: "2025-01-10" },
  { id: "cat-2", name: "Monitory", isArchived: false, createdAt: "2025-01-10" },
  { id: "cat-3", name: "Drukarki", isArchived: false, createdAt: "2025-01-10" },
  { id: "cat-4", name: "Routery", isArchived: false, createdAt: "2025-01-10" },
  { id: "cat-5", name: "Anteny", isArchived: false, createdAt: "2025-01-10" },
  { id: "cat-6", name: "Oprogramowanie", isArchived: false, createdAt: "2025-01-10" },
  { id: "cat-7", name: "Inny sprzęt", isArchived: false, createdAt: "2025-01-10" },
];

export const DEMO_EMPLOYEES: Employee[] = [
  {
    id: "emp-1",
    fullName: "Anna Kowalska",
    email: "anna.kowalska@firma.pl",
    department: "Księgowość",
    location: "Warszawa, biuro główne",
    isActive: true,
    createdAt: "2025-01-15",
  },
  {
    id: "emp-2",
    fullName: "Piotr Nowak",
    email: "piotr.nowak@firma.pl",
    department: "IT",
    location: "Warszawa, biuro główne",
    isActive: true,
    createdAt: "2025-01-15",
  },
  {
    id: "emp-3",
    fullName: "Marta Wiśniewska",
    email: null,
    department: "Sprzedaż",
    location: "Kraków, oddział",
    isActive: true,
    createdAt: "2025-02-01",
  },
  {
    id: "emp-4",
    fullName: "Tomasz Zieliński",
    email: "tomasz.zielinski@firma.pl",
    department: "Marketing",
    location: "Warszawa, biuro główne",
    isActive: false,
    createdAt: "2024-11-20",
  },
];

export const DEMO_EQUIPMENT: Equipment[] = [
  {
    id: "eq-1",
    inventoryNumber: "INW/2025/0001",
    categoryId: "cat-1",
    name: "Laptop Dell Latitude 5440",
    manufacturer: "Dell",
    model: "Latitude 5440",
    serialNumber: "DL5440-0001",
    purchaseDate: "2025-01-20",
    warrantyEnd: "2028-01-20",
    technicalCondition: "bardzo_dobry",
    purchasePrice: 5200,
    status: "przydzielony",
    location: "Warszawa, biuro główne",
    notes: null,
    createdAt: "2025-01-20",
    updatedAt: "2025-01-20",
  },
  {
    id: "eq-2",
    inventoryNumber: "INW/2025/0002",
    categoryId: "cat-2",
    name: "Monitor Dell 24\"",
    manufacturer: "Dell",
    model: "P2422H",
    serialNumber: "MN2422-0002",
    purchaseDate: "2025-01-20",
    warrantyEnd: "2028-01-20",
    technicalCondition: "bardzo_dobry",
    purchasePrice: 750,
    status: "przydzielony",
    location: "Warszawa, biuro główne",
    notes: null,
    createdAt: "2025-01-20",
    updatedAt: "2025-01-20",
  },
  {
    id: "eq-3",
    inventoryNumber: "INW/2025/0003",
    categoryId: "cat-1",
    name: "Laptop Lenovo ThinkPad T14",
    manufacturer: "Lenovo",
    model: "ThinkPad T14 Gen 4",
    serialNumber: "LT14-0003",
    purchaseDate: "2025-03-05",
    warrantyEnd: "2027-03-05",
    technicalCondition: "dobry",
    purchasePrice: 6100,
    status: "w_magazynie",
    location: "Warszawa, magazyn IT",
    notes: "Skonfigurowany, gotowy do wydania.",
    createdAt: "2025-03-05",
    updatedAt: "2025-06-01",
  },
  {
    id: "eq-4",
    inventoryNumber: "INW/2024/0117",
    categoryId: "cat-3",
    name: "Drukarka HP LaserJet Pro",
    manufacturer: "HP",
    model: "LaserJet Pro M404dn",
    serialNumber: null,
    purchaseDate: "2024-06-10",
    warrantyEnd: "2026-06-10",
    technicalCondition: "dostateczny",
    purchasePrice: 1400,
    status: "w_serwisie",
    location: "Kraków, oddział",
    notes: "Zgłoszony problem z podajnikiem papieru.",
    createdAt: "2024-06-10",
    updatedAt: "2025-08-14",
  },
  {
    id: "eq-5",
    inventoryNumber: "INW/2023/0088",
    categoryId: "cat-4",
    name: "Router biurowy",
    manufacturer: "Ubiquiti",
    model: "UniFi Dream Machine",
    serialNumber: "UDM-0088",
    purchaseDate: "2023-09-01",
    warrantyEnd: "2025-09-01",
    technicalCondition: "dobry",
    purchasePrice: 2200,
    status: "wycofany",
    location: "Warszawa, magazyn IT",
    notes: "Wycofany po awarii zasilacza.",
    createdAt: "2023-09-01",
    updatedAt: "2025-09-01",
  },
];

export const DEMO_ASSIGNMENTS: Assignment[] = [
  {
    id: "asg-1",
    equipmentId: "eq-1",
    employeeId: "emp-1",
    assignedAt: "2025-01-22",
    returnedAt: null,
    assignedCondition: "bardzo_dobry",
    returnedCondition: null,
    notes: "Pierwsze wydanie sprzętu.",
    createdAt: "2025-01-22",
  },
  {
    id: "asg-2",
    equipmentId: "eq-2",
    employeeId: "emp-1",
    assignedAt: "2025-01-22",
    returnedAt: null,
    assignedCondition: "bardzo_dobry",
    returnedCondition: null,
    notes: null,
    createdAt: "2025-01-22",
  },
  {
    id: "asg-3",
    equipmentId: "eq-3",
    employeeId: "emp-4",
    assignedAt: "2024-11-25",
    returnedAt: "2025-05-30",
    assignedCondition: "dobry",
    returnedCondition: "dobry",
    notes: "Zwrot po zmianie stanowiska.",
    createdAt: "2024-11-25",
  },
];

export const DEMO_EQUIPMENT_LINKS: EquipmentLink[] = [
  { id: "lnk-1", equipmentId: "eq-1", linkedEquipmentId: "eq-2" },
];

export const DEMO_COMPANY_SETTINGS: CompanySettings = {
  name: "Przykładowa Firma Sp. z o.o.",
  address: "ul. Testowa 1, 00-001 Warszawa",
  nip: "0000000000",
};

export function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
