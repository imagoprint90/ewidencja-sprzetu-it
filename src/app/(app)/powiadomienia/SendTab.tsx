"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, FormSection, inputClass } from "@/components/ui/Form";
import { employeeFullName, getAssignedEquipmentNames } from "@/lib/equipment-helpers";
import { employeeDisplayLabel, renderNotificationText } from "@/lib/notification-helpers";
import { NOTIFICATION_PLACEHOLDERS } from "@/lib/types";
import type { Assignment, Employee, Equipment, NotificationTemplate } from "@/lib/types";
import { sendNotificationAction } from "@/lib/supabase/actions/notification-actions";

export function SendTab({
  employees,
  assignments,
  equipment,
  templates,
}: {
  employees: Employee[];
  assignments: Assignment[];
  equipment: Equipment[];
  templates: NotificationTemplate[];
}) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeEmployees = employees.filter((e) => e.isActive);
  const employee = employees.find((e) => e.id === employeeId);
  const template = templates.find((t) => t.id === templateId);

  const assignedEquipmentNames = useMemo(
    () => (employeeId ? getAssignedEquipmentNames(assignments, equipment, employeeId) : []),
    [assignments, equipment, employeeId]
  );

  const previewSubject = employee ? renderNotificationText(subject, employee, assignedEquipmentNames) : subject;
  const previewBody = employee ? renderNotificationText(body, employee, assignedEquipmentNames) : body;

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const t = templates.find((tpl) => tpl.id === id);
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
    }
  }

  function handleSend() {
    setError(null);
    setSuccess(null);
    if (!employee) {
      setError("Wybierz pracownika.");
      return;
    }
    if (!employee.email) {
      setError("Ten pracownik nie ma zapisanego adresu e-mail — uzupełnij go w zakładce Pracownicy.");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setError("Podaj temat i treść wiadomości.");
      return;
    }
    startTransition(async () => {
      const result = await sendNotificationAction({
        employeeId: employee.id,
        employeeName: employeeFullName(employee),
        employeeEmail: employee.email!,
        templateId: template?.id ?? null,
        templateName: template?.name ?? null,
        subject: previewSubject,
        body: previewBody,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(`Wysłano do ${employeeFullName(employee)}.`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <FormSection title="Odbiorca i szablon">
        <FormField label="Pracownik" htmlFor="employeeId" required>
          <select
            id="employeeId"
            className={inputClass}
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="">Wybierz pracownika…</option>
            {activeEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {employeeDisplayLabel(e)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Szablon (opcjonalnie)" htmlFor="templateId">
          <select
            id="templateId"
            className={inputClass}
            value={templateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
          >
            <option value="">Własna treść</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Temat" htmlFor="subject" required full>
          <input id="subject" className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </FormField>
        <FormField label="Treść" htmlFor="body" required full>
          <textarea id="body" rows={7} className={inputClass} value={body} onChange={(e) => setBody(e.target.value)} />
        </FormField>
      </FormSection>

      <p className="text-xs text-muted">
        Placeholdery w treści:{" "}
        {NOTIFICATION_PLACEHOLDERS.map((p) => (
          <code key={p.token} className="mx-0.5 rounded bg-black/5 px-1" title={p.description}>
            {p.token}
          </code>
        ))}
      </p>

      {employee && (subject || body) && (
        <div className="rounded-xl border border-dashed border-border bg-surface p-4 text-sm">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Podgląd dla {employeeFullName(employee)}
          </p>
          <p className="font-medium">{previewSubject}</p>
          <p className="mt-1 whitespace-pre-wrap text-foreground/80">{previewBody}</p>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}
      {success && (
        <p className="rounded-lg border border-success/30 bg-green-50 px-4 py-3 text-sm text-success">{success}</p>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSend} disabled={isPending}>
          <Send size={16} />
          Wyślij
        </Button>
      </div>
    </div>
  );
}
