"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Category, Equipment, Location } from "@/lib/types";
import { TECHNICAL_CONDITION_LABELS, WINDOWS_EDITION_LABELS } from "@/lib/types";
import { equipmentFormSchema, type EquipmentFormValues } from "@/lib/schemas";
import { FormField, FormSection, inputClass } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { useCanEditEquipment } from "@/lib/current-user-context";
import { updateEquipmentAction } from "@/lib/supabase/actions/equipment-actions";
import { InvoiceAttachment } from "@/components/equipment/InvoiceAttachment";

// Formularz edycji sprzętu — używany zarówno w oknie edycji na liście Sprzęt, jak i na karcie
// sprzętu (zakładka Szczegóły).
export function EquipmentEditForm({
  equipment,
  categories,
  locations,
  onCancel,
  onSaved,
}: {
  equipment: Equipment;
  categories: Category[];
  locations: Location[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const canEdit = useCanEditEquipment();
  const [error, setError] = useState<string | null>(null);
  const [locationId, setLocationId] = useState(equipment.locationId ?? "");

  const {
    register,
    handleSubmit,
    control,
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
      inDomain: equipment.inDomain ? "tak" : "nie",
      windowsEdition: equipment.windowsEdition ?? "",
      notes: equipment.notes ?? "",
    },
  });

  const selectedCategoryId = useWatch({ control, name: "categoryId" });
  const supportsWindows = Boolean(categories.find((c) => c.id === selectedCategoryId)?.supportsWindows);

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
      inDomain: values.inDomain === "tak",
      windowsEdition: supportsWindows ? values.windowsEdition || null : undefined,
      notes: values.notes || null,
      locationId: locationId || null,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved();
  }

  const selectableLocations = locations.filter((l) => !l.isArchived || l.id === equipment.locationId);

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
          {supportsWindows && (
            <FormField label="Windows" htmlFor="windowsEdition" error={errors.windowsEdition?.message}>
              <select id="windowsEdition" className={inputClass} {...register("windowsEdition")}>
                <option value="">Nie określono</option>
                {Object.entries(WINDOWS_EDITION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
          )}
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
        <FormField label="Domena" htmlFor="inDomain" error={errors.inDomain?.message}>
          <select id="inDomain" className={inputClass} {...register("inDomain")}>
            <option value="nie">NIE</option>
            <option value="tak">TAK</option>
          </select>
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
        <div className="sm:col-span-2">
          <p className="mb-1.5 block text-sm font-medium">Faktura zakupu (PDF)</p>
          <InvoiceAttachment
            equipmentId={equipment.id}
            path={equipment.purchaseInvoicePath}
            canEdit={canEdit}
            bare
          />
        </div>
      </FormSection>

      <FormSection
        title="Stan i lokalizacja"
        description="Lokalizacja sprzętu jest niezależna od lokalizacji pracownika i można ją ustawić dowolnie."
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
        <FormField label="Lokalizacja" htmlFor="locationId">
          <select
            id="locationId"
            className={inputClass}
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            <option value="">— brak lokalizacji</option>
            {selectableLocations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Uwagi" htmlFor="notes" error={errors.notes?.message} full>
          <textarea id="notes" rows={3} className={inputClass} {...register("notes")} />
        </FormField>
      </FormSection>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Anuluj
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          Zapisz zmiany
        </Button>
      </div>
    </form>
  );
}
