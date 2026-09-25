"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Tabs } from "@/components/ui/Tabs";
import { useIsAdmin, useCanEditEquipment } from "@/lib/current-user-context";
import { deleteEquipmentAction } from "@/lib/supabase/actions/equipment-actions";
import { DetailsTab } from "@/components/equipment/tabs/DetailsTab";
import { AssignmentsTab } from "@/components/equipment/tabs/AssignmentsTab";
import { SoftwareTab } from "@/components/equipment/tabs/SoftwareTab";
import { LinkedEquipmentTab } from "@/components/equipment/tabs/LinkedEquipmentTab";
import { DocumentsTab } from "@/components/equipment/tabs/DocumentsTab";
import { HistoryTab } from "@/components/equipment/tabs/HistoryTab";
import { getCategoryName } from "@/lib/equipment-helpers";
import type {
  Assignment,
  Category,
  Employee,
  Equipment,
  EquipmentLink,
  InstalledSoftware,
  Location,
  Protocol,
  SoftwareLicense,
  SoftwareLicenseAssignment,
  SoftwareProduct,
} from "@/lib/types";

function SprzetDetailClientInner({
  item,
  allEquipment,
  categories,
  employees,
  assignments,
  equipmentLinks,
  protocols,
  products,
  installedSoftware,
  licenses,
  licenseAssignments,
  locations,
}: {
  item: Equipment;
  allEquipment: Equipment[];
  categories: Category[];
  employees: Employee[];
  assignments: Assignment[];
  equipmentLinks: EquipmentLink[];
  protocols: Protocol[];
  products: SoftwareProduct[];
  installedSoftware: InstalledSoftware[];
  licenses: SoftwareLicense[];
  licenseAssignments: SoftwareLicenseAssignment[];
  locations: Location[];
}) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const canEditEquipment = useCanEditEquipment();
  const searchParams = useSearchParams();
  const startInEdit = searchParams.get("edit") === "1";
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteEquipmentAction(item.id);
      if (!result.ok) {
        setConfirmDeleteOpen(false);
        setDeleteError(result.error);
        return;
      }
      router.push("/sprzet");
      router.refresh();
    });
  }

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
        <div className="flex items-center gap-2">
          <StatusBadge status={item.status} />
          {(isAdmin || canEditEquipment) && (
            <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteOpen(true)}>
              <Trash2 size={14} />
              Usuń sprzęt
            </Button>
          )}
        </div>
      </div>

      {deleteError && (
        <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
          {deleteError}
        </p>
      )}

      <Tabs
        tabs={[
          {
            key: "szczegoly",
            label: "Szczegóły",
            content: (
              <DetailsTab
                equipment={item}
                categories={categories}
                locations={locations}
                startInEdit={startInEdit}
                hasActiveAssignment={assignments.some((a) => a.equipmentId === item.id && a.returnedAt === null)}
              />
            ),
          },
          {
            key: "przydzialy",
            label: "Przydziały",
            content: <AssignmentsTab equipment={item} assignments={assignments} employees={employees} />,
          },
          {
            key: "oprogramowanie",
            label: "Oprogramowanie",
            content: (
              <SoftwareTab
                equipment={item}
                products={products}
                installedSoftware={installedSoftware}
                licenses={licenses}
                licenseAssignments={licenseAssignments}
              />
            ),
          },
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
          { key: "dokumenty", label: "Dokumenty", content: <DocumentsTab protocols={protocols} /> },
          { key: "historia", label: "Historia zmian", content: <HistoryTab equipment={item} /> },
        ]}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Usunąć ten sprzęt?"
        description="Tej operacji nie można cofnąć. Jeśli sprzęt ma powiązane protokoły, usunięcie zostanie zablokowane — usuń je najpierw w zakładce Dokumenty."
        confirmLabel="Usuń"
        danger
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
      />
      {isPending && <p className="text-sm text-muted">Usuwanie…</p>}
    </div>
  );
}

export function SprzetDetailClient(props: {
  item: Equipment;
  allEquipment: Equipment[];
  categories: Category[];
  employees: Employee[];
  assignments: Assignment[];
  equipmentLinks: EquipmentLink[];
  protocols: Protocol[];
  products: SoftwareProduct[];
  installedSoftware: InstalledSoftware[];
  licenses: SoftwareLicense[];
  licenseAssignments: SoftwareLicenseAssignment[];
  locations: Location[];
}) {
  return (
    <Suspense>
      <SprzetDetailClientInner {...props} />
    </Suspense>
  );
}
