"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/lib/format";
import { getCategoryName } from "@/lib/equipment-helpers";
import { useIsAdmin } from "@/lib/current-user-context";
import type { Assignment, Category, Employee, Equipment } from "@/lib/types";
import { setEmployeeActiveAction } from "@/lib/supabase/actions/employee-actions";

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
}: {
  employee: Employee;
  equipment: Equipment[];
  categories: Category[];
  history: Assignment[];
  personalLicenses: PersonalLicense[];
}) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const active = history.filter((a) => a.returnedAt === null);
  const past = history.filter((a) => a.returnedAt !== null);

  function toggleActive() {
    startTransition(async () => {
      await setEmployeeActiveAction(employee.id, !employee.isActive);
      setConfirmOpen(false);
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
          <h1 className="text-xl font-semibold">{employee.fullName}</h1>
          <p className="text-sm text-muted">
            {employee.department} · {employee.location}
            {employee.email && ` · ${employee.email}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={employee.isActive ? "success" : "default"}>
            {employee.isActive ? "Aktywny" : "Nieaktywny"}
          </Badge>
          {isAdmin && (
            <Button size="sm" variant="secondary" onClick={() => setConfirmOpen(true)}>
              {employee.isActive ? "Dezaktywuj" : "Aktywuj"}
            </Button>
          )}
        </div>
      </div>

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
