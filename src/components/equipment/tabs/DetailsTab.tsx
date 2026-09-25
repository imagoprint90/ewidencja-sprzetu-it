"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Category, Equipment, Location } from "@/lib/types";
import { TECHNICAL_CONDITION_LABELS } from "@/lib/types";
import { EquipmentEditForm } from "@/components/equipment/EquipmentEditForm";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/format";
import { getLocationName } from "@/lib/equipment-helpers";
import { useCanEditEquipment, useCurrentUser } from "@/lib/current-user-context";
import { InvoiceAttachment } from "@/components/equipment/InvoiceAttachment";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

export function DetailsTab({
  equipment,
  categories,
  locations,
  startInEdit = false,
  hasActiveAssignment = false,
}: {
  equipment: Equipment;
  categories: Category[];
  locations: Location[];
  startInEdit?: boolean;
  hasActiveAssignment?: boolean;
}) {
  const router = useRouter();
  const canEdit = useCanEditEquipment();
  const { role, visibleCategories } = useCurrentUser();
  const editableCategories =
    role === "edycja_podglad" ? categories.filter((c) => (visibleCategories ?? []).includes(c.id)) : categories;
  const [editing, setEditing] = useState(startInEdit && canEdit);

  if (!editing) {
    const category = categories.find((c) => c.id === equipment.categoryId);
    return (
      <div className="flex flex-col gap-4">
        {canEdit && (
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              Edytuj dane
            </Button>
          </div>
        )}
        <div className="rounded-xl border border-border bg-surface p-5">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailRow label="Numer inwentarzowy" value={equipment.inventoryNumber} />
            <DetailRow label="Kategoria" value={category?.name ?? "—"} />
            <DetailRow label="Nazwa sprzętu" value={equipment.name} />
            <DetailRow label="Producent" value={equipment.manufacturer ?? "—"} />
            <DetailRow label="Model" value={equipment.model ?? "—"} />
            <DetailRow label="Numer seryjny" value={equipment.serialNumber ?? "—"} />
            <DetailRow label="Domena" value={equipment.inDomain ? "TAK" : "NIE"} />
            <DetailRow label="Data zakupu" value={formatDate(equipment.purchaseDate)} />
            <DetailRow label="Koniec gwarancji" value={formatDate(equipment.warrantyEnd)} />
            <DetailRow
              label="Stan techniczny"
              value={
                equipment.technicalCondition
                  ? TECHNICAL_CONDITION_LABELS[equipment.technicalCondition]
                  : "—"
              }
            />
            <DetailRow label="Cena zakupu" value={formatCurrency(equipment.purchasePrice)} />
            <DetailRow
              label="Faktura zakupu"
              value={
                <InvoiceAttachment
                  equipmentId={equipment.id}
                  path={equipment.purchaseInvoicePath}
                  canEdit={canEdit}
                  bare
                />
              }
            />
            <DetailRow label="Lokalizacja" value={getLocationName(locations, equipment.locationId)} />
            <DetailRow label="Uwagi" value={equipment.notes ?? "—"} />
          </dl>
        </div>
      </div>
    );
  }

  return (
    <EquipmentEditForm
      equipment={equipment}
      categories={editableCategories}
      locations={locations}
      hasActiveAssignment={hasActiveAssignment}
      onCancel={() => setEditing(false)}
      onSaved={() => {
        setEditing(false);
        router.refresh();
      }}
    />
  );
}