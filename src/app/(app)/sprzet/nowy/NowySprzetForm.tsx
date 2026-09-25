"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { equipmentAddFormSchema, type EquipmentAddFormValues } from "@/lib/schemas";
import { FormField, FormSection, inputClass } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useIsAdmin, useCanTransferEquipment } from "@/lib/current-user-context";
import { employeeFullName } from "@/lib/equipment-helpers";
import { transferEquipmentSetAction } from "@/lib/supabase/actions/assignment-actions";
import { TECHNICAL_CONDITION_LABELS, type Category, type Employee, type Location } from "@/lib/types";
import { addEquipmentAction, uploadEquipmentInvoiceAction } from "@/lib/supabase/actions/equipment-actions";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(((reader.result as string) ?? "").split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function NowySprzetForm({
  categories,
  employees,
  locations,
}: {
  categories: Category[];
  employees: Employee[];
  locations: Location[];
}) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const canTransfer = useCanTransferEquipment();
  const canAssign = isAdmin || canTransfer;
  const [employeeId, setEmployeeId] = useState("");
  const [locationId, setLocationId] = useState(locations.find((l) => l.isWarehouse)?.id ?? locations[0]?.id ?? "");
  // Lokalizacja przydzielonego pracownika ma pierwszeństwo przed ręcznie wybraną (tak samo
  // działa późniejsze przekazanie sprzętu) — a gdy pracownik nie ma lokalizacji, zostaje wybrana.
  const employeeLocation = canAssign && employeeId
    ? locations.find((l) => l.id === employees.find((e) => e.id === employeeId)?.locationId)
    : undefined;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EquipmentAddFormValues>({
    resolver: zodResolver(equipmentAddFormSchema),
    defaultValues: { categoryId: categories.find((c) => !c.isArchived)?.id ?? "", inDomain: "nie" },
  });

  async function onSubmit(values: EquipmentAddFormValues) {
    setSubmitError(null);
    if (invoiceFile && !invoiceFile.name.toLowerCase().endsWith(".pdf")) {
      setSubmitError("Faktura musi być plikiem PDF.");
      return;
    }
    if (canAssign && employeeId && !values.technicalCondition) {
      setSubmitError("Przy przydzielaniu pracownika wybierz stan techniczny sprzętu.");
      return;
    }
    const result = await addEquipmentAction({
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
      notes: values.notes || null,
    }, employeeLocation ? employeeLocation.id : locationId || null);
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    if (invoiceFile) {
      const upload = await uploadEquipmentInvoiceAction(
        result.data.id,
        await readFileAsBase64(invoiceFile),
        invoiceFile.name
      );
      if (!upload.ok) {
        // Sprzęt już istnieje — nie ponawiamy zapisu (byłby duplikat), tylko kierujemy na kartę,
        // gdzie fakturę można dodać ponownie.
        window.alert(`Sprzęt dodano, ale nie udało się wgrać faktury: ${upload.error} Dodasz ją na karcie sprzętu.`);
      }
    }
    if (canAssign && employeeId && values.technicalCondition) {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const assign = await transferEquipmentSetAction({
        equipmentIds: [result.data.id],
        newEmployeeId: employeeId,
        transferDate: today,
        condition: values.technicalCondition,
        notes: null,
        skipHistory: true,
      });
      if (!assign.ok) {
        window.alert(`Sprzęt dodano, ale nie udało się go przydzielić: ${assign.error} Przydzielisz go na karcie sprzętu.`);
      }
    }
    router.push("/sprzet");
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Dodaj sprzęt</h1>
        <p className="text-sm text-muted">
          Numer inwentarzowy nadaje się automatycznie (można go później poprawić na karcie
          sprzętu). Nowy sprzęt trafia domyślnie do statusu „W magazynie” — chyba że od razu
          wskażesz pracownika w sekcji „Przydział”. Późniejsze przekazania (z protokołem)
          wykonasz na karcie sprzętu.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormSection title="Podstawowe informacje">
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
          <FormField label="Faktura zakupu (PDF)" htmlFor="invoiceFile" full>
            <input
              id="invoiceFile"
              type="file"
              accept="application/pdf"
              className={inputClass}
              onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
            />
          </FormField>
        </FormSection>

        {canAssign && (
          <FormSection
            title="Przydział (opcjonalnie)"
            description="Sprzęt zostanie od razu przydzielony wybranemu pracownikowi (dzisiejszą datą), bez generowania protokołu. Wymaga wybrania stanu technicznego poniżej. Zostaw puste, aby sprzęt trafił do magazynu."
          >
            <FormField label="Przydziel pracownikowi" htmlFor="assignEmployee" full>
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    id="assignEmployee"
                    options={employees.map((e) => ({ value: e.id, label: employeeFullName(e) }))}
                    value={employeeId}
                    onChange={setEmployeeId}
                    placeholder="Nie przydzielaj (magazyn)"
                    searchPlaceholder="Szukaj pracownika…"
                  />
                </div>
                {employeeId && (
                  <Button type="button" variant="secondary" onClick={() => setEmployeeId("")}>
                    Wyczyść
                  </Button>
                )}
              </div>
            </FormField>
          </FormSection>
        )}

        <FormSection
          title="Stan i lokalizacja"
          description="Domyślnie sprzęt trafia do lokalizacji „Magazyn”. Po przydzieleniu pracownikowi lokalizacja jest brana z tego pracownika (ma pierwszeństwo przed wybraną tutaj)."
        >
          <FormField label="Lokalizacja" htmlFor="locationId">
            <select
              id="locationId"
              className={inputClass}
              value={employeeLocation ? employeeLocation.id : locationId}
              disabled={Boolean(employeeLocation)}
              onChange={(e) => setLocationId(e.target.value)}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            {employeeLocation && (
              <p className="mt-1 text-xs text-muted">Lokalizacja pobrana od przydzielonego pracownika.</p>
            )}
          </FormField>
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
