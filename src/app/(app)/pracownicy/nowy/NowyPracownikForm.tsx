"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeFormSchema, type EmployeeFormValues } from "@/lib/schemas";
import { FormField, FormSection, inputClass } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import type { Location } from "@/lib/types";
import { addEmployeeAction } from "@/lib/supabase/actions/employee-actions";

export function NowyPracownikForm({ locations }: { locations: Location[] }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
  });

  async function onSubmit(values: EmployeeFormValues) {
    setSubmitError(null);
    const result = await addEmployeeAction({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email || null,
      phone: values.phone || null,
      department: values.department || null,
      locationId: values.locationId || null,
    });
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    router.push(`/pracownicy/${result.data.id}`);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Dodaj pracownika</h1>
        <p className="text-sm text-muted">
          Pracownik nie musi mieć konta umożliwiającego logowanie do aplikacji.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormSection title="Dane pracownika">
          <FormField label="Imię" htmlFor="firstName" required error={errors.firstName?.message}>
            <input id="firstName" className={inputClass} {...register("firstName")} />
          </FormField>
          <FormField label="Nazwisko" htmlFor="lastName" required error={errors.lastName?.message}>
            <input id="lastName" className={inputClass} {...register("lastName")} />
          </FormField>
          <FormField label="Adres e-mail" htmlFor="email" error={errors.email?.message}>
            <input id="email" type="email" className={inputClass} {...register("email")} />
          </FormField>
          <FormField label="Telefon" htmlFor="phone" error={errors.phone?.message}>
            <input id="phone" type="tel" className={inputClass} {...register("phone")} />
          </FormField>
          <FormField label="Dział" htmlFor="department" error={errors.department?.message}>
            <input id="department" className={inputClass} {...register("department")} />
          </FormField>
          <FormField label="Lokalizacja" htmlFor="locationId" error={errors.locationId?.message} full>
            <select id="locationId" className={inputClass} {...register("locationId")}>
              <option value="">Brak lokalizacji</option>
              {locations
                .filter((l) => !l.isArchived)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </select>
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
            Zapisz pracownika
          </Button>
        </div>
      </form>
    </div>
  );
}
