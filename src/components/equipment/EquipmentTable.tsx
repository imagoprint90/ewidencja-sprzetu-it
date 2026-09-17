"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  Assignment,
  Category,
  Employee,
  Equipment,
  EquipmentColumnKey,
  EquipmentLink,
  InstalledSoftware,
  SoftwareProduct,
} from "@/lib/types";
import { EQUIPMENT_COLUMN_LABELS } from "@/lib/types";
import { StatusBadge } from "@/components/ui/Badge";
import { ExpandableList } from "@/components/ui/ExpandableList";
import { formatDate } from "@/lib/format";
import { getActiveAssignment, getCategoryName, getLinkedEquipment } from "@/lib/equipment-helpers";

export function EquipmentTable({
  equipment,
  categories,
  employees,
  assignments,
  links,
  installedSoftware,
  softwareProducts,
  visibleColumns,
}: {
  equipment: Equipment[];
  categories: Category[];
  employees: Employee[];
  assignments: Assignment[];
  links: EquipmentLink[];
  installedSoftware: InstalledSoftware[];
  softwareProducts: SoftwareProduct[];
  visibleColumns: EquipmentColumnKey[];
}) {
  const router = useRouter();
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
            {visibleColumns.map((col) => (
              <th key={col} className="whitespace-nowrap px-4 py-3 font-medium">
                {EQUIPMENT_COLUMN_LABELS[col]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {equipment.map((item) => {
            const activeAssignment = getActiveAssignment(assignments, item.id);
            const employee = activeAssignment
              ? employees.find((e) => e.id === activeAssignment.employeeId)
              : undefined;
            const linked = getLinkedEquipment(links, equipment, item.id);
            const software = installedSoftware
              .filter((s) => s.equipmentId === item.id)
              .map((s) => softwareProducts.find((p) => p.id === s.softwareProductId)?.name)
              .filter((name): name is string => Boolean(name));

            return (
              <tr
                key={item.id}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-black/[0.02]"
                onClick={() => router.push(`/sprzet/${item.id}`)}
              >
                {visibleColumns.map((col) => (
                  <td key={col} className="px-4 py-3 align-top">
                    {renderCell(col, item, {
                      categoryName: getCategoryName(categories, item.categoryId),
                      employeeName: employee?.fullName,
                      activeAssignment,
                      linked,
                      software,
                    })}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function renderCell(
  col: EquipmentColumnKey,
  item: Equipment,
  extra: {
    categoryName: string;
    employeeName?: string;
    activeAssignment?: Assignment;
    linked: Equipment[];
    software: string[];
  }
) {
  switch (col) {
    case "inventoryNumber":
      return (
        <Link href={`/sprzet/${item.id}`} className="font-medium text-primary hover:underline">
          {item.inventoryNumber}
        </Link>
      );
    case "category":
      return extra.categoryName;
    case "employee":
      return extra.employeeName ? (
        extra.employeeName
      ) : (
        <span className="text-muted">Nieprzydzielony</span>
      );
    case "assignmentDates":
      return extra.activeAssignment ? (
        <span className="whitespace-nowrap">
          {formatDate(extra.activeAssignment.assignedAt)} –{" "}
          {extra.activeAssignment.returnedAt ? formatDate(extra.activeAssignment.returnedAt) : "obecnie"}
        </span>
      ) : (
        <span className="text-muted">—</span>
      );
    case "name":
      return item.name;
    case "serialNumber":
      return item.serialNumber ?? <span className="text-muted">—</span>;
    case "software":
      return <ExpandableList items={extra.software} />;
    case "linkedEquipment":
      return <ExpandableList items={extra.linked.map((l) => l.name)} />;
    case "status":
      return <StatusBadge status={item.status} />;
    case "location":
      return item.location;
    case "notes":
      return item.notes ? (
        <span className="line-clamp-2 max-w-[220px] text-foreground/80">{item.notes}</span>
      ) : (
        <span className="text-muted">—</span>
      );
    default:
      return null;
  }
}
