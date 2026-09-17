"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { equipmentFormSchema, type EquipmentFormValues } from "@/lib/schemas";
import { FormField, FormSection, inputClass } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { TECHNICAL_CONDITION_LABELS, type Category } from "@/lib/types";
import { addEquipmentAction } from "@/lib/supabase/actions/equipment-actions";

export function NowySprzetForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: { categoryId: categories[0]?.id ?? "" },
  });

  async function onSubmit(values: EquipmentFormValues) {
    setSubmitError(null);
    const result = await addEquipmentAction({
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
      setSubmitError(result.error);
      return;
    }
    router.push(`/sprzet/${result.data.id}`);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Dodaj sprzęt</h1>
        <p className="text-sm text-muted">
          Nowy sprzęt trafia domyślnie do statusu „W magazynie”. Przydzielenie do pracownika
          wykonasz operacją „Przekaż sprzęt” na karcie sprzętu, w zakładce „Przydziały”.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormSection title="Podstawowe informacje">
          <FormField label="Numer inwentarzowy" htmlFor="inventoryNumber" required error={errors.inventoryNumber?.message}>
            <input id="inventoryNumber" className={inputClass} {...register("inventoryNumber")} />
          </FormField>
          <FormField label="Kategoria" htmlFor="categoryId" required error={errors.categoryId?.message}>
            <select id="categoryId" className={inputClass} {...register("categoryId")}>
              {categories
                .filter((c) => !c.isArchived)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </FormField>
          <FormField label="Nazwa sprzętu" htmlFor="name" required error={errors.name?.message} full>
            <input id="name" className={inputClass} placeholder="np. Laptop Dell Latitude 5440" {...register("name")} />
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

        <FormSection title="Zakup i gwarancja" description="Pola opcjonalne.">
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
          description="Nowy sprzęt trafia automatycznie do lokalizacji „Magazyn” — lokalizacja zmieni się sama po przydzieleniu pracownikowi."
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

        {submitError && (
          <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
            {submitError}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Anuluj
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            Zapisz sprzęt
          </Button>
        </div>
      </form>
    </div>
  );
}
