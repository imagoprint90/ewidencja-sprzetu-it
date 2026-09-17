"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ColumnPicker } from "@/components/equipment/ColumnPicker";
import { EquipmentFilters, type EquipmentFiltersState } from "@/components/equipment/EquipmentFilters";
import { EquipmentTable } from "@/components/equipment/EquipmentTable";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { useIsAdmin } from "@/lib/current-user-context";
import { EQUIPMENT_COLUMNS, type EquipmentColumnKey, type EquipmentStatus } from "@/lib/types";
import { getActiveAssignment } from "@/lib/equipment-helpers";
import type { Assignment, Category, Employee, Equipment, EquipmentLink } from "@/lib/types";

const DEFAULT_COLUMNS: EquipmentColumnKey[] = [
  "inventoryNumber",
  "category",
  "employee",
  "assignmentDates",
  "name",
  "serialNumber",
  "status",
  "location",
];

function SprzetPageInner({
  equipment,
  categories,
  employees,
  assignments,
  equipmentLinks,
}: {
  equipment: Equipment[];
  categories: Category[];
  employees: Employee[];
  assignments: Assignment[];
  equipmentLinks: EquipmentLink[];
}) {
  const isAdmin = useIsAdmin();
  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get("status") as EquipmentStatus | null) ?? "";

  const [filters, setFilters] = useState<EquipmentFiltersState>({
    query: "",
    categoryId: "",
    status: initialStatus,
    location: "",
    employeeId: "",
  });
  const [visibleColumns, setVisibleColumns] = useLocalStorage<EquipmentColumnKey[]>(
    "sprzet-kolumny",
    DEFAULT_COLUMNS
  );

  const locations = useMemo(
    () => Array.from(new Set(equipment.map((e) => e.location))).sort(),
    [equipment]
  );

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return equipment.filter((item) => {
      if (filters.categoryId && item.categoryId !== filters.categoryId) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.location && item.location !== filters.location) return false;
      if (filters.employeeId) {
        const active = getActiveAssignment(assignments, item.id);
        if (!active || active.employeeId !== filters.employeeId) return false;
      }
      if (q) {
        const active = getActiveAssignment(assignments, item.id);
        const employeeName = active
          ? employees.find((e) => e.id === active.employeeId)?.fullName ?? ""
          : "";
        const haystack = [item.name, item.serialNumber ?? "", item.inventoryNumber, employeeName]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [equipment, filters, assignments, employees]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Sprzęt</h1>
          <p className="text-sm text-muted">
            {filtered.length} z {equipment.length} pozycji
          </p>
        </div>
        {isAdmin && (
          <Link href="/sprzet/nowy">
            <Button>
              <Plus size={16} />
              Dodaj sprzęt
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <EquipmentFilters
          value={filters}
          onChange={setFilters}
          categories={categories}
          employees={employees}
          locations={locations}
        />
        <ColumnPicker visible={visibleColumns} onChange={setVisibleColumns} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Brak sprzętu spełniającego kryteria"
          description="Zmień filtry wyszukiwania albo dodaj nowy sprzęt do ewidencji."
          action={
            isAdmin ? (
              <Link href="/sprzet/nowy">
                <Button variant="secondary">Dodaj pierwszy sprzęt</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <EquipmentTable
          equipment={filtered}
          categories={categories}
          employees={employees}
          assignments={assignments}
          links={equipmentLinks}
          visibleColumns={visibleColumns.length ? visibleColumns : EQUIPMENT_COLUMNS.slice(0, 3)}
        />
      )}
    </div>
  );
}

export function SprzetClient(props: {
  equipment: Equipment[];
  categories: Category[];
  employees: Employee[];
  assignments: Assignment[];
  equipmentLinks: EquipmentLink[];
}) {
  return (
    <Suspense>
      <SprzetPageInner {...props} />
    </Suspense>
  );
}
