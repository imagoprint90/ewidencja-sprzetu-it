"use client";

import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useIsAdmin } from "@/lib/current-user-context";
import type { Assignment, Employee, Equipment } from "@/lib/types";

export function AssignmentsTab({
  equipment,
  assignments,
  employees,
}: {
  equipment: Equipment;
  assignments: Assignment[];
  employees: Employee[];
}) {
  const isAdmin = useIsAdmin();
  const history = assignments
    .filter((a) => a.equipmentId === equipment.id)
    .sort((a, b) => (a.assignedAt < b.assignedAt ? 1 : -1));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Pełna historia przydziałów tego sprzętu, łącznie z poprzednimi użytkownikami.
        </p>
        {isAdmin && (
          <Button size="sm" disabled title="Operacja „Przekaż sprzęt” zostanie uruchomiona w Etapie 3">
            Przekaż sprzęt
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface p-5 text-sm text-muted">
          Ten sprzęt nie był jeszcze nikomu przydzielony.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {history.map((a) => {
            const employee = employees.find((e) => e.id === a.employeeId);
            return (
              <li key={a.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{employee?.fullName ?? "Nieznany pracownik"}</span>
                  {a.returnedAt === null ? (
                    <Badge tone="success">Aktywny przydział</Badge>
                  ) : (
                    <Badge>Zakończony</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">
                  Przydzielono: {formatDate(a.assignedAt)} · Zwrócono:{" "}
                  {a.returnedAt ? formatDate(a.returnedAt) : "—"}
                </p>
                {a.notes && <p className="mt-2 text-sm">{a.notes}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
