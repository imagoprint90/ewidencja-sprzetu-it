"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/lib/format";
import { getCategoryName } from "@/lib/equipment-helpers";

export default function PracownikDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { employees, equipment, categories, employeeAssignments, setEmployeeActive } = useStore();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const employee = employees.find((e) => e.id === params.id);

  if (!employee) {
    return (
      <EmptyState
        title="Nie znaleziono pracownika"
        action={
          <Link href="/pracownicy">
            <Button variant="secondary">Wróć do listy pracowników</Button>
          </Link>
        }
      />
    );
  }

  const history = employeeAssignments(employee.id);
  const active = history.filter((a) => a.returnedAt === null);
  const past = history.filter((a) => a.returnedAt !== null);

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
          <Button size="sm" variant="secondary" onClick={() => setConfirmOpen(true)}>
            {employee.isActive ? "Dezaktywuj" : "Aktywuj"}
          </Button>
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
                    {eq?.name ?? "Sprzęt usunięty z widoku demo"}
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
        onConfirm={() => {
          setEmployeeActive(employee.id, !employee.isActive);
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}
