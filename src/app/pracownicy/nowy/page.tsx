"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useStore } from "@/lib/store";
import { employeeFormSchema, type EmployeeFormValues } from "@/lib/schemas";
import { FormField, FormSection, inputClass } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";

export default function NowyPracownikPage() {
  const router = useRouter();
  const { addEmployee } = useStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({ resolver: zodResolver(employeeFormSchema) });

  function onSubmit(values: EmployeeFormValues) {
    const employee = addEmployee({
      fullName: values.fullName,
      email: values.email || null,
      department: values.department,
      location: values.location,
      isActive: true,
    });
    router.push(`/pracownicy/${employee.id}`);
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
          <FormField label="Imię i nazwisko" htmlFor="fullName" required error={errors.fullName?.message} full>
            <input id="fullName" className={inputClass} {...register("fullName")} />
          </FormField>
          <FormField label="Adres e-mail" htmlFor="email" error={errors.email?.message}>
            <input id="email" type="email" className={inputClass} {...register("email")} />
          </FormField>
          <FormField label="Dział" htmlFor="department" required error={errors.department?.message}>
            <input id="department" className={inputClass} {...register("department")} />
          </FormField>
          <FormField label="Lokalizacja" htmlFor="location" required error={errors.location?.message} full>
            <input id="location" className={inputClass} {...register("location")} />
          </FormField>
        </FormSection>

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
