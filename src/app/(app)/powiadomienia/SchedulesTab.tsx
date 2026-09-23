"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField, FormSection, inputClass } from "@/components/ui/Form";
import { EmployeeMultiSelect } from "@/components/notifications/EmployeeMultiSelect";
import { employeeFullName } from "@/lib/equipment-helpers";
import { formatDate } from "@/lib/format";
import { DAY_OF_WEEK_LABELS, type Employee, type NotificationSchedule, type NotificationTemplate } from "@/lib/types";
import {
  createScheduleAction,
  deleteScheduleAction,
  setScheduleActiveAction,
  updateScheduleAction,
  type ScheduleInput,
} from "@/lib/supabase/actions/notification-actions";

const DAYS = [1, 2, 3, 4, 5, 6, 7];
const EMPTY_FORM: ScheduleInput = {
  name: "",
  templateId: "",
  employeeIds: [],
  sendTime: "09:00",
  daysOfWeek: [1, 2, 3, 4, 5],
  isActive: true,
};

function ScheduleForm({
  initial,
  employees,
  templates,
  onCancel,
  onSubmit,
}: {
  initial: ScheduleInput;
  employees: Employee[];
  templates: NotificationTemplate[];
  onCancel: () => void;
  onSubmit: (input: ScheduleInput) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeEmployees = employees.filter((e) => e.isActive);

  function toggleDay(day: number) {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day) ? f.daysOfWeek.filter((d) => d !== day) : [...f.daysOfWeek, day].sort(),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.templateId) {
      setError("Nazwa i szablon są wymagane.");
      return;
    }
    if (form.employeeIds.length === 0) {
      setError("Wybierz co najmniej jednego pracownika.");
      return;
    }
    if (form.daysOfWeek.length === 0) {
      setError("Wybierz co najmniej jeden dzień tygodnia.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await onSubmit(form);
      if (!result.ok) {
        setError(result.error ?? "Nie udało się zapisać harmonogramu.");
        return;
      }
      router.refresh();
      onCancel();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <FormSection title="Harmonogram automatycznej wysyłki">
        <FormField label="Nazwa harmonogramu" htmlFor="scheduleName" required full>
          <input
            id="scheduleName"
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </FormField>
        <FormField label="Szablon" htmlFor="scheduleTemplate" required>
          <select
            id="scheduleTemplate"
            className={inputClass}
            value={form.templateId}
            onChange={(e) => setForm((f) => ({ ...f, templateId: e.target.value }))}
          >
            <option value="">Wybierz szablon…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Godzina wysyłki" htmlFor="scheduleTime" required>
          <input
            id="scheduleTime"
            type="time"
            className={inputClass}
            value={form.sendTime}
            onChange={(e) => setForm((f) => ({ ...f, sendTime: e.target.value }))}
          />
        </FormField>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium">
            Dni tygodnia <span className="text-danger">*</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  form.daysOfWeek.includes(day)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground/70 hover:bg-black/5"
                }`}
              >
                {DAY_OF_WEEK_LABELS[day]}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium">
            Pracownicy <span className="text-danger">*</span>
          </p>
          <EmployeeMultiSelect
            employees={activeEmployees}
            selectedIds={form.employeeIds}
            onChange={(ids) => setForm((f) => ({ ...f, employeeIds: ids }))}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-border text-primary"
            />
            Aktywny
          </label>
        </div>
      </FormSection>

      <p className="text-xs text-muted">
        Uwaga: na obecnym planie Vercel system sprawdza harmonogramy tylko raz dziennie (ok.
        7-8 rano), więc wiadomość na pewno pójdzie w wybrany dzień, ale wybrana tu godzina nie
        jest jeszcze respektowana co do minuty — to ustawienie zacznie działać precyzyjnie po
        przejściu na wyższy plan Vercel.
      </p>

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Anuluj
        </Button>
        <Button type="submit" disabled={isPending}>
          Zapisz harmonogram
        </Button>
      </div>
    </form>
  );
}

export function SchedulesTab({
  schedules,
  employees,
  templates,
}: {
  schedules: NotificationSchedule[];
  employees: Employee[];
  templates: NotificationTemplate[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotificationSchedule | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    startTransition(async () => {
      const result = await deleteScheduleAction(id);
      setDeleteTarget(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  function handleToggleActive(schedule: NotificationSchedule) {
    startTransition(async () => {
      const result = await setScheduleActiveAction(schedule.id, !schedule.isActive);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (templates.length === 0) {
    return (
      <EmptyState
        title="Najpierw dodaj szablon"
        description="Harmonogram wysyła zapisany szablon, więc zanim go utworzysz, dodaj przynajmniej jeden w zakładce „Szablony”."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={16} />
            Nowy harmonogram
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {creating && (
        <ScheduleForm
          initial={EMPTY_FORM}
          employees={employees}
          templates={templates}
          onCancel={() => setCreating(false)}
          onSubmit={createScheduleAction}
        />
      )}

      {schedules.length === 0 && !creating ? (
        <EmptyState
          title="Brak harmonogramów"
          description="Dodaj pierwszy harmonogram, żeby wysyłać wybrany szablon automatycznie o stałej porze."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {schedules.map((s) =>
            editingId === s.id ? (
              <li key={s.id}>
                <ScheduleForm
                  initial={{
                    name: s.name,
                    templateId: s.templateId,
                    employeeIds: s.employeeIds,
                    sendTime: s.sendTime,
                    daysOfWeek: s.daysOfWeek,
                    isActive: s.isActive,
                  }}
                  employees={employees}
                  templates={templates}
                  onCancel={() => setEditingId(null)}
                  onSubmit={(input) => updateScheduleAction(s.id, input)}
                />
              </li>
            ) : (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{s.name}</p>
                    <Badge tone={s.isActive ? "success" : "default"}>{s.isActive ? "Aktywny" : "Wyłączony"}</Badge>
                  </div>
                  <p className="text-xs text-muted">
                    {templates.find((t) => t.id === s.templateId)?.name ?? "usunięty szablon"} ·{" "}
                    {s.daysOfWeek.map((d) => DAY_OF_WEEK_LABELS[d]).join(", ")} · godz. {s.sendTime} ·{" "}
                    {s.employeeIds.length}{" "}
                    {s.employeeIds.length === 1 ? "pracownik" : "pracowników"}
                    {s.lastSentDate && ` · ostatnio wysłano ${formatDate(s.lastSentDate)}`}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Odbiorcy: {s.employeeIds.map((id) => employeeFullName(employees.find((e) => e.id === id) ?? { firstName: "?", lastName: null })).join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" disabled={isPending} onClick={() => handleToggleActive(s)}>
                    {s.isActive ? "Wyłącz" : "Włącz"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditingId(s.id)}>
                    Edytuj
                  </Button>
                  <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setDeleteTarget(s)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </li>
            )
          )}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Usunąć ten harmonogram?"
        description="Historia już wysłanych powiadomień zostanie zachowana — ta operacja usuwa tylko sam harmonogram."
        confirmLabel="Usuń"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
