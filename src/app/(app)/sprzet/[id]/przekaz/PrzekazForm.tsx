"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormField, FormSection, inputClass } from "@/components/ui/Form";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate, todayIsoDate } from "@/lib/format";
import { getActiveAssignment, getCategoryName, getLinkedEquipment } from "@/lib/equipment-helpers";
import { TECHNICAL_CONDITION_LABELS, type Assignment, type Category, type Employee, type Equipment, type EquipmentLink, type TechnicalCondition } from "@/lib/types";
import { transferEquipmentSetAction } from "@/lib/supabase/actions/assignment-actions";

type Mode = "przekaz" | "zwrot";

export function PrzekazForm({
  item,
  allEquipment,
  categories,
  employees,
  assignments,
  equipmentLinks,
}: {
  item: Equipment;
  allEquipment: Equipment[];
  categories: Category[];
  employees: Employee[];
  assignments: Assignment[];
  equipmentLinks: EquipmentLink[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const activeAssignment = getActiveAssignment(assignments, item.id);
  const currentEmployee = activeAssignment
    ? employees.find((e) => e.id === activeAssignment.employeeId)
    : undefined;
  const activeEmployees = employees.filter((e) => e.isActive);
  const linked = getLinkedEquipment(equipmentLinks, allEquipment, item.id);

  const [mode, setMode] = useState<Mode>(activeAssignment ? "przekaz" : "przekaz");
  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [transferDate, setTransferDate] = useState(todayIsoDate());
  const [condition, setCondition] = useState<TechnicalCondition | "">("");
  const [notes, setNotes] = useState("");
  const [selectedLinked, setSelectedLinked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function toggleLinked(id: string) {
    setSelectedLinked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedLinkedItems = linked.filter((l) => selectedLinked.has(l.id));
  const equipmentIds = [item.id, ...selectedLinkedItems.map((e) => e.id)];

  const newEmployee = activeEmployees.find((e) => e.id === newEmployeeId);

  function validate(): string | null {
    if (mode === "przekaz" && !newEmployeeId) {
      return "Wybierz pracownika, któremu przekazujesz sprzęt.";
    }
    if (!transferDate) return "Podaj datę przekazania.";
    if (!condition) return "Wybierz stan techniczny sprzętu.";
    return null;
  }

  function handleOpenConfirm() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setConfirmOpen(true);
  }

  function handleConfirm() {
    setConfirmOpen(false);
    startTransition(async () => {
      const result = await transferEquipmentSetAction({
        equipmentIds,
        newEmployeeId: mode === "przekaz" ? newEmployeeId : null,
        transferDate,
        condition: condition as TechnicalCondition,
        notes: notes.trim() || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/sprzet/${item.id}`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <button
        onClick={() => router.back()}
        className="flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Wróć
      </button>

      <div>
        <h1 className="text-xl font-semibold">Przekaż sprzęt</h1>
        <p className="text-sm text-muted">
          {item.name} · {item.inventoryNumber} · {getCategoryName(categories, item.categoryId)}
        </p>
      </div>

      <FormSection title="Obecny stan">
        <div className="sm:col-span-2">
          {activeAssignment ? (
            <p className="text-sm">
              Aktualnie przydzielony: <strong>{currentEmployee?.fullName ?? "nieznany pracownik"}</strong>{" "}
              (od {formatDate(activeAssignment.assignedAt)})
            </p>
          ) : (
            <p className="text-sm text-muted">Sprzęt nie ma aktualnie aktywnego przydziału (nieprzydzielony).</p>
          )}
        </div>
      </FormSection>

      {linked.length > 0 && (
        <FormSection
          title="Zestaw do przekazania"
          description="Zaznacz dodatkowe urządzenia, które faktycznie przekazujesz razem z tym sprzętem. Samo powiązanie nie zmienia ich przydziału — decydujesz o tym tutaj."
        >
          <div className="sm:col-span-2 flex flex-col gap-2">
            {linked.map((l) => {
              const lActive = getActiveAssignment(assignments, l.id);
              const lEmployee = lActive ? employees.find((e) => e.id === lActive.employeeId) : undefined;
              const unavailable = l.status === "wycofany";
              return (
                <label
                  key={l.id}
                  className={`flex items-start gap-3 rounded-lg border border-border p-3 text-sm ${
                    unavailable ? "opacity-50" : "cursor-pointer hover:bg-black/[0.02]"
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={unavailable}
                    checked={selectedLinked.has(l.id)}
                    onChange={() => toggleLinked(l.id)}
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{l.name}</span>
                      <StatusBadge status={l.status} />
                    </div>
                    <p className="text-xs text-muted">
                      {l.inventoryNumber} ·{" "}
                      {lEmployee ? `obecnie: ${lEmployee.fullName}` : "nieprzydzielony"}
                    </p>
                    {unavailable && (
                      <p className="text-xs text-danger">Sprzęt wycofany — nie można przekazać.</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </FormSection>
      )}

      <FormSection title="Rodzaj operacji">
        <div className="sm:col-span-2 flex gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={mode === "przekaz"}
              onChange={() => setMode("przekaz")}
              className="h-4 w-4 text-primary"
            />
            Przekaż innemu pracownikowi
          </label>
          {activeAssignment && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={mode === "zwrot"}
                onChange={() => setMode("zwrot")}
                className="h-4 w-4 text-primary"
              />
              Zwróć do magazynu
            </label>
          )}
        </div>

        {mode === "przekaz" && (
          <FormField label="Nowy użytkownik" htmlFor="newEmployeeId" required full>
            <select
              id="newEmployeeId"
              className={inputClass}
              value={newEmployeeId}
              onChange={(e) => setNewEmployeeId(e.target.value)}
            >
              <option value="">Wybierz pracownika…</option>
              {activeEmployees
                .filter((e) => e.id !== activeAssignment?.employeeId)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} ({e.department})
                  </option>
                ))}
            </select>
          </FormField>
        )}
      </FormSection>

      <FormSection title="Szczegóły przekazania">
        <FormField label="Data przekazania" htmlFor="transferDate" required>
          <input
            id="transferDate"
            type="date"
            className={inputClass}
            value={transferDate}
            onChange={(e) => setTransferDate(e.target.value)}
          />
        </FormField>
        <FormField label="Stan techniczny" htmlFor="condition" required>
          <select
            id="condition"
            className={inputClass}
            value={condition}
            onChange={(e) => setCondition(e.target.value as TechnicalCondition)}
          >
            <option value="">Wybierz…</option>
            {Object.entries(TECHNICAL_CONDITION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Uwagi" htmlFor="notes" full>
          <textarea
            id="notes"
            rows={3}
            className={inputClass}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </FormField>
      </FormSection>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Anuluj
        </Button>
        <Button type="button" disabled={isPending} onClick={handleOpenConfirm}>
          {mode === "przekaz" ? "Przekaż sprzęt" : "Zwróć do magazynu"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Potwierdź przekazanie"
        description={
          `Sprzęt: ${[item, ...selectedLinkedItems].map((e) => e.name).join(", ")}. ` +
          (mode === "przekaz"
            ? `Od: ${currentEmployee?.fullName ?? "nieprzydzielony"} → Do: ${newEmployee?.fullName ?? "—"}. `
            : `Zwrot do magazynu od: ${currentEmployee?.fullName ?? "—"}. `) +
          `Data: ${formatDate(transferDate)}. Stan: ${
            condition ? TECHNICAL_CONDITION_LABELS[condition as TechnicalCondition] : "—"
          }.`
        }
        confirmLabel="Zatwierdź"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
