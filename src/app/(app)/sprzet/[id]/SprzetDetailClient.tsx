"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { DetailsTab } from "@/components/equipment/tabs/DetailsTab";
import { AssignmentsTab } from "@/components/equipment/tabs/AssignmentsTab";
import { SoftwareTab } from "@/components/equipment/tabs/SoftwareTab";
import { LinkedEquipmentTab } from "@/components/equipment/tabs/LinkedEquipmentTab";
import { DocumentsTab } from "@/components/equipment/tabs/DocumentsTab";
import { HistoryTab } from "@/components/equipment/tabs/HistoryTab";
import { getCategoryName } from "@/lib/equipment-helpers";
import type { Assignment, Category, Employee, Equipment, EquipmentLink } from "@/lib/types";

export function SprzetDetailClient({
  item,
  allEquipment,
  categories,
  employees,
  assignments,
  equipmentLinks,
}: {
  item: Equipment;
  allEquipment: Equipment[];
  categories: Category[];
  employees: Employee[];
  assignments: Assignment[];
  equipmentLinks: EquipmentLink[];
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => router.back()}
        className="flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Wróć
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{item.name}</h1>
          <p className="text-sm text-muted">
            {item.inventoryNumber} · {getCategoryName(categories, item.categoryId)}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <Tabs
        tabs={[
          {
            key: "szczegoly",
            label: "Szczegóły",
            content: <DetailsTab equipment={item} categories={categories} />,
          },
          {
            key: "przydzialy",
            label: "Przydziały",
            content: <AssignmentsTab equipment={item} assignments={assignments} employees={employees} />,
          },
          { key: "oprogramowanie", label: "Oprogramowanie", content: <SoftwareTab /> },
          {
            key: "powiazany",
            label: "Powiązany sprzęt",
            content: (
              <LinkedEquipmentTab
                equipment={item}
                allEquipment={allEquipment}
                categories={categories}
                equipmentLinks={equipmentLinks}
              />
            ),
          },
          { key: "dokumenty", label: "Dokumenty", content: <DocumentsTab /> },
          { key: "historia", label: "Historia zmian", content: <HistoryTab equipment={item} /> },
        ]}
      />
    </div>
  );
}
