"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormField, FormSection, inputClass } from "@/components/ui/Form";
import { formatDate } from "@/lib/format";
import { getCategoryName, getLocationName } from "@/lib/equipment-helpers";
import { useIsAdmin } from "@/lib/current-user-context";
import { employeeFormSchema, type EmployeeFormValues } from "@/lib/schemas";
import type { Assignment, Category, Employee, Equipment, Location } from "@/lib/types";
import { setEmployeeActiveAction, updateEmployeeAction } from "@/lib/supabase/actions/employee-actions";

interface PersonalLicense {
  assignmentId: string;
  productName: string;
  validUntil: string | null;
}

export function PracownikDetailClient({
  employee,
  equipment,
  categories,
  history,
  personalLicenses,
  locations,
}: {
  employee: Employee;
  equipment: Equipment[];
  categories: Category[];
  history: Assignment[];
  personalLicenses: PersonalLicense[];
  locations: Location[];
}) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const active = history.filter((a) => a.returnedAt === null);
  const past = history.filter((a) => a.returnedAt !== null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      fullName: employee.fullName,
      email: employee.email ?? "",
      department: employee.department,
      locationId: employee.locationId,
    },
  });

  function toggleActive() {
    startTransition(async () => {
      await setEmployeeActiveAction(employee.id, !employee.isActive);
      setConfirmOpen(false);
      router.refresh();
    });
  }

  async function onSubmitEdit(values: EmployeeFormValues) {
    setEditError(null);
    const result = await updateEmployeeAction(employee.id, {
      fullName: values.fullName,
      email: values.email || null,
      department: values.department,
      locationId: values.locationId,
    });
    if (!result.ok) {
      setEditError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
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

      {editing ? (
        <form onSubmit={handleSubmit(onSubmitEdit)} className="flex flex-col gap-4">
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
            <FormField label="Lokalizacja" htmlFor="locationId" required error={errors.locationId?.message} full>
              <select id="locationId" className={inputClass} {...register("locationId")}>
                {locations
                  .filter((l) => !l.isArchived || l.id === employee.locationId)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </select>
            </FormField>
          </FormSection>
          {editError && (
            <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
              {editError}
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
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{employee.fullName}</h1>
            <p className="text-sm text-muted">
              {employee.department} · {getLocationName(locations, employee.locationId)}
              {employee.email && ` · ${employee.email}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={employee.isActive ? "success" : "default"}>
              {employee.isActive ? "Aktywny" : "Nieaktywny"}
            </Badge>
            {isAdmin && (
              <>
                <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil size={14} />
                  Edytuj dane
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setConfirmOpen(true)}>
                  {employee.isActive ? "Dezaktywuj" : "Aktywuj"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Aktualnie przydzielony sprzęt</h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted">Brak przydzielonego sprzętu.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map((a) => {
              const eq = equipment.find((e) => e.id === a.equipmentId);
              if (!eq) return null;
              return (
                <li key={a.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <Link href={`/sprzet/${eq.id}`} className="font-medium text-primary hover:underline">
                      {eq.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {getCategoryName(categories, eq.categoryId)} · {eq.inventoryNumber} · od{" "}
                      {formatDate(a.assignedAt)}
                    </p>
                  </div>
                  <StatusBadge status={eq.status} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Historia zwrotów</h2>
        {past.length === 0 ? (
          <p className="text-sm text-muted">Brak zakończonych przydziałów.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {past.map((a) => {
              const eq = equipment.find((e) => e.id === a.equipmentId);
              return (
                <li key={a.id} className="rounded-lg border border-border p-3 text-sm">
                  <Link href={`/sprzet/${a.equipmentId}`} className="font-medium text-primary hover:underline">
                    {eq?.name ?? "Sprzęt usunięty"}
                  </Link>
                  <p className="text-xs text-muted">
                    {formatDate(a.assignedAt)} – {formatDate(a.returnedAt)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Licencje osobiste</h2>
        {personalLicenses.length === 0 ? (
          <p className="text-sm text-muted">Brak licencji przypisanych osobiście do tego pracownika.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {personalLicenses.map((l) => (
              <li key={l.assignmentId} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <span>{l.productName}</span>
                <span className="text-xs text-muted">
                  ważna do {l.validUntil ? formatDate(l.validUntil) : "bezterminowo"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted">
          Licencje osobiste nie są automatycznie przenoszone przy zmianie przydziału sprzętu —
          zarządzaj nimi w module{" "}
          <Link href="/oprogramowanie" className="text-primary hover:underline">
            Oprogramowanie
          </Link>
          .
        </p>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title={employee.isActive ? "Dezaktywować pracownika?" : "Aktywować pracownika?"}
        description={
          employee.isActive
            ? "Nieaktywny pracownik pozostaje widoczny w historii przydziałów, ale nie będzie proponowany przy nowych przekazaniach sprzętu."
            : "Pracownik ponownie będzie dostępny przy przydzielaniu sprzętu."
        }
        confirmLabel={employee.isActive ? "Dezaktywuj" : "Aktywuj"}
        danger={employee.isActive}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={toggleActive}
      />
      {isPending && <p className="text-sm text-muted">Zapisywanie…</p>}
    </div>
  );
}
