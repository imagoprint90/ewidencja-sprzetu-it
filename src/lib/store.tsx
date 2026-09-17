"use client";

// TRYB DEMONSTRACYJNY: prosty magazyn stanu w pamięci przeglądarki (React Context).
// Naśladuje kształt przyszłych zapytań do Supabase, żeby w Etapie 2 podmienić
// tylko warstwę dostępu do danych, bez przebudowy interfejsu.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEMO_ASSIGNMENTS,
  DEMO_CATEGORIES,
  DEMO_COMPANY_SETTINGS,
  DEMO_EMPLOYEES,
  DEMO_EQUIPMENT,
  DEMO_EQUIPMENT_LINKS,
  generateId,
} from "./demo-data";
import type {
  Assignment,
  Category,
  CompanySettings,
  Employee,
  Equipment,
  EquipmentLink,
} from "./types";

interface StoreState {
  categories: Category[];
  employees: Employee[];
  equipment: Equipment[];
  assignments: Assignment[];
  equipmentLinks: EquipmentLink[];
  companySettings: CompanySettings;
}

interface StoreApi extends StoreState {
  addCategory: (name: string) => { ok: boolean; error?: string };
  renameCategory: (id: string, name: string) => { ok: boolean; error?: string };
  archiveCategory: (id: string) => { ok: boolean; error?: string };

  addEmployee: (data: Omit<Employee, "id" | "createdAt">) => Employee;
  updateEmployee: (id: string, data: Partial<Omit<Employee, "id" | "createdAt">>) => void;
  setEmployeeActive: (id: string, isActive: boolean) => void;

  addEquipment: (
    data: Omit<Equipment, "id" | "createdAt" | "updatedAt" | "status">
  ) => { ok: boolean; error?: string; equipment?: Equipment };
  updateEquipment: (
    id: string,
    data: Partial<Omit<Equipment, "id" | "createdAt" | "updatedAt">>
  ) => { ok: boolean; error?: string };

  activeAssignmentFor: (equipmentId: string) => Assignment | undefined;
  assignmentsFor: (equipmentId: string) => Assignment[];
  employeeAssignments: (employeeId: string) => Assignment[];

  addEquipmentLink: (
    equipmentId: string,
    linkedEquipmentId: string
  ) => { ok: boolean; error?: string };
  removeEquipmentLink: (linkId: string) => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(DEMO_CATEGORIES);
  const [employees, setEmployees] = useState<Employee[]>(DEMO_EMPLOYEES);
  const [equipment, setEquipment] = useState<Equipment[]>(DEMO_EQUIPMENT);
  const [assignments] = useState<Assignment[]>(DEMO_ASSIGNMENTS);
  const [equipmentLinks, setEquipmentLinks] = useState<EquipmentLink[]>(DEMO_EQUIPMENT_LINKS);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(
    DEMO_COMPANY_SETTINGS
  );

  const addCategory = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: "Nazwa kategorii nie może być pusta." };
      if (
        categories.some(
          (c) => c.name.toLowerCase() === trimmed.toLowerCase() && !c.isArchived
        )
      ) {
        return { ok: false, error: "Kategoria o tej nazwie już istnieje." };
      }
      setCategories((prev) => [
        ...prev,
        {
          id: generateId("cat"),
          name: trimmed,
          isArchived: false,
          createdAt: new Date().toISOString(),
        },
      ]);
      return { ok: true };
    },
    [categories]
  );

  const renameCategory = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: "Nazwa kategorii nie może być pusta." };
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c))
      );
      return { ok: true };
    },
    []
  );

  const archiveCategory = useCallback(
    (id: string) => {
      const inUse = equipment.some((e) => e.categoryId === id);
      if (inUse) {
        return {
          ok: false,
          error:
            "Nie można zarchiwizować kategorii — jest przypisana do istniejącego sprzętu. Przypisz ten sprzęt do innej kategorii.",
        };
      }
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isArchived: true } : c))
      );
      return { ok: true };
    },
    [equipment]
  );

  const addEmployee = useCallback((data: Omit<Employee, "id" | "createdAt">) => {
    const newEmployee: Employee = {
      ...data,
      id: generateId("emp"),
      createdAt: new Date().toISOString(),
    };
    setEmployees((prev) => [...prev, newEmployee]);
    return newEmployee;
  }, []);

  const updateEmployee = useCallback(
    (id: string, data: Partial<Omit<Employee, "id" | "createdAt">>) => {
      setEmployees((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...data } : e))
      );
    },
    []
  );

  const setEmployeeActive = useCallback((id: string, isActive: boolean) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isActive } : e))
    );
  }, []);

  const addEquipment = useCallback(
    (data: Omit<Equipment, "id" | "createdAt" | "updatedAt" | "status">) => {
      const trimmedInv = data.inventoryNumber.trim();
      if (!trimmedInv) {
        return { ok: false, error: "Numer inwentarzowy jest wymagany." };
      }
      if (equipment.some((e) => e.inventoryNumber.toLowerCase() === trimmedInv.toLowerCase())) {
        return { ok: false, error: "Ten numer inwentarzowy już istnieje w systemie." };
      }
      const now = new Date().toISOString();
      const newEquipment: Equipment = {
        ...data,
        inventoryNumber: trimmedInv,
        id: generateId("eq"),
        status: "w_magazynie",
        createdAt: now,
        updatedAt: now,
      };
      setEquipment((prev) => [...prev, newEquipment]);
      return { ok: true, equipment: newEquipment };
    },
    [equipment]
  );

  const updateEquipment = useCallback(
    (id: string, data: Partial<Omit<Equipment, "id" | "createdAt" | "updatedAt">>) => {
      if (data.inventoryNumber) {
        const trimmed = data.inventoryNumber.trim();
        const duplicate = equipment.some(
          (e) => e.id !== id && e.inventoryNumber.toLowerCase() === trimmed.toLowerCase()
        );
        if (duplicate) {
          return { ok: false, error: "Ten numer inwentarzowy już istnieje w systemie." };
        }
      }
      setEquipment((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e
        )
      );
      return { ok: true };
    },
    [equipment]
  );

  const activeAssignmentFor = useCallback(
    (equipmentId: string) =>
      assignments.find((a) => a.equipmentId === equipmentId && a.returnedAt === null),
    [assignments]
  );

  const assignmentsFor = useCallback(
    (equipmentId: string) =>
      assignments
        .filter((a) => a.equipmentId === equipmentId)
        .sort((a, b) => (a.assignedAt < b.assignedAt ? 1 : -1)),
    [assignments]
  );

  const employeeAssignments = useCallback(
    (employeeId: string) =>
      assignments
        .filter((a) => a.employeeId === employeeId)
        .sort((a, b) => (a.assignedAt < b.assignedAt ? 1 : -1)),
    [assignments]
  );

  const addEquipmentLink = useCallback(
    (equipmentId: string, linkedEquipmentId: string) => {
      if (equipmentId === linkedEquipmentId) {
        return { ok: false, error: "Nie można powiązać sprzętu z samym sobą." };
      }
      const exists = equipmentLinks.some(
        (l) =>
          (l.equipmentId === equipmentId && l.linkedEquipmentId === linkedEquipmentId) ||
          (l.equipmentId === linkedEquipmentId && l.linkedEquipmentId === equipmentId)
      );
      if (exists) {
        return { ok: false, error: "To powiązanie już istnieje." };
      }
      setEquipmentLinks((prev) => [
        ...prev,
        { id: generateId("lnk"), equipmentId, linkedEquipmentId },
      ]);
      return { ok: true };
    },
    [equipmentLinks]
  );

  const removeEquipmentLink = useCallback((linkId: string) => {
    setEquipmentLinks((prev) => prev.filter((l) => l.id !== linkId));
  }, []);

  const value = useMemo<StoreApi>(
    () => ({
      categories,
      employees,
      equipment,
      assignments,
      equipmentLinks,
      companySettings,
      addCategory,
      renameCategory,
      archiveCategory,
      addEmployee,
      updateEmployee,
      setEmployeeActive,
      addEquipment,
      updateEquipment,
      activeAssignmentFor,
      assignmentsFor,
      employeeAssignments,
      addEquipmentLink,
      removeEquipmentLink,
    }),
    [
      categories,
      employees,
      equipment,
      assignments,
      equipmentLinks,
      companySettings,
      addCategory,
      renameCategory,
      archiveCategory,
      addEmployee,
      updateEmployee,
      setEmployeeActive,
      addEquipment,
      updateEquipment,
      activeAssignmentFor,
      assignmentsFor,
      employeeAssignments,
      addEquipmentLink,
      removeEquipmentLink,
    ]
  );

  // setCompanySettings jest obecnie nieużywane w Etapie 1 (Ustawienia to podgląd) —
  // zapobiega ostrzeżeniu lintera o nieużywanym stanie.
  void setCompanySettings;

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore musi być używany wewnątrz DemoStoreProvider");
  }
  return ctx;
}
