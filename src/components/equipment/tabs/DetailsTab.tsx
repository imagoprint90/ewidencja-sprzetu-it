"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Category, Equipment, Location } from "@/lib/types";
import { TECHNICAL_CONDITION_LABELS } from "@/lib/types";
import { equipmentFormSchema, type EquipmentFormValues } from "@/lib/schemas";
import { FormField, FormSection, inputClass } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/format";
import { getLocationName } from "@/lib/equipment-helpers";
import { useIsAdmin } from "@/lib/current-user-context";
import { updateEquipmentAction } from "@/lib/supabase/actions/equipment-actions";

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
}: {
  equipment: Equipment;
  categories: Category[];
  locations: Location[];
  startInEdit?: boolean;
}) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [editing, setEditing] = useState(startInEdit && isAdmin);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      inventoryNumber: equipment.inventoryNumber,
      categoryId: equipment.categoryId,
      name: equipment.name,
      manufacturer: equipment.manufacturer ?? "",
      model: equipment.model ?? "",
      serialNumber: equipment.serialNumber ?? "",
      purchaseDate: equipment.purchaseDate ?? "",
      warrantyEnd: equipment.warrantyEnd ?? "",
      technicalCondition: equipment.technicalCondition ?? undefined,
      purchasePrice: equipment.purchasePrice?.toString() ?? "",
      notes: equipment.notes ?? "",
    },
  });

  async function onSubmit(values: EquipmentFormValues) {
    setError(null);
    const result = await updateEquipmentAction(equipment.id, {
      inventoryNumber: values.inventoryNumber,
      categoryId: values.categoryId,
      name: values.name,
      manufacturer: values.manufacturer || null,
      model: values.model || null,
      serialNumber: values.serialNumber || null,
      purchaseDate: values.purchaseDate || null,
      warrantyEnd: values.warrantyEnd || null,
      technicalCondition: values.technicalCondition || null,
      purchasePrice: values.purchasePrice ? Number(values.purchasePrice) : null,
      notes: values.notes || null,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    const category = categories.find((c) => c.id === equipment.categoryId);
    return (
      <div className="flex flex-col gap-4">
        {isAdmin && (
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
            <DetailRow label="Lokalizacja" value={getLocationName(locations, equipment.locationId)} />
            <DetailRow label="Uwagi" value={equipment.notes ?? "—"} />
          </dl>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-surface p-5 text-sm text-muted">
          Załączniki do karty sprzętu (np. faktura zakupu) będą dostępne po podłączeniu
          prywatnego przechowywania plików w Supabase Storage — patrz zakładka „Dokumenty”.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormSection title="Podstawowe informacje">
        <FormField label="Numer inwentarzowy" htmlFor="inventoryNumber" required error={errors.inventoryNumber?.message}>
          <input id="inventoryNumber" className={inputClass} {...register("inventoryNumber")} />
        </FormField>
        <FormField label="Kategoria" htmlFor="categoryId" required error={errors.categoryId?.message}>
          <select id="categoryId" className={inputClass} {...register("categoryId")}>
            {categories
              .filter((c) => !c.isArchived || c.id === equipment.categoryId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </FormField>
        <FormField label="Nazwa sprzętu" htmlFor="name" required error={errors.name?.message} full>
          <input id="name" className={inputClass} {...register("name")} />
        </FormField>
        <FormField label="Producent" htmlFor="manufacturer" error={errors.manufacturer?.message}>
          <input id="manufacturer" className={inputClass} {...register("manufacturer")} />
        </FormField>
        <FormField label="Model" htmlFor="model" error={errors.model?.message}>
          <input id="model" className={inputClass} {...register("model")} />
        </FormField>
        <FormField label="Numer seryjny" htmlFor="serialNumber" error={errors.serialNumber?.message}>
          <input id="serialNumber" className={inputClass} {...register("serialNumber")} />
        </FormField>
      </FormSection>

      <FormSection title="Zakup i gwarancja">
        <FormField label="Data zakupu" htmlFor="purchaseDate" error={errors.purchaseDate?.message}>
          <input id="purchaseDate" type="date" className={inputClass} {...register("purchaseDate")} />
        </FormField>
        <FormField label="Koniec gwarancji" htmlFor="warrantyEnd" error={errors.warrantyEnd?.message}>
          <input id="warrantyEnd" type="date" className={inputClass} {...register("warrantyEnd")} />
        </FormField>
        <FormField label="Cena zakupu (PLN)" htmlFor="purchasePrice" error={errors.purchasePrice?.message}>
          <input id="purchasePrice" type="number" step="0.01" className={inputClass} {...register("purchasePrice")} />
        </FormField>
      </FormSection>

      <FormSection
        title="Stan"
        description={`Lokalizacja (obecnie: ${getLocationName(locations, equipment.locationId)}) zmienia się automatycznie przy przekazaniu lub zwrocie sprzętu.`}
      >
        <FormField label="Stan techniczny" htmlFor="technicalCondition" error={errors.technicalCondition?.message}>
          <select id="technicalCondition" className={inputClass} {...register("technicalCondition")}>
            <option value="">Nie określono</option>
            {Object.entries(TECHNICAL_CONDITION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Uwagi" htmlFor="notes" error={errors.notes?.message} full>
          <textarea id="notes" rows={3} className={inputClass} {...register("notes")} />
        </FormField>
      </FormSection>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
          Anuluj
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          Zapisz zmiany
        </Button>
      </div>
    </form>
  );
}
