"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, FormSection, inputClass } from "@/components/ui/Form";
import { EmployeeMultiSelect } from "@/components/notifications/EmployeeMultiSelect";
import { employeeFullName, getAssignedEquipmentNames, getDepartmentName } from "@/lib/equipment-helpers";
import { renderNotificationText } from "@/lib/notification-helpers";
import { NOTIFICATION_PLACEHOLDERS } from "@/lib/types";
import type { Assignment, Department, Employee, Equipment, NotificationTemplate } from "@/lib/types";
import { sendNotificationAction } from "@/lib/supabase/actions/notification-actions";

export function SendTab({
  employees,
  departments,
  assignments,
  equipment,
  templates,
}: {
  employees: Employee[];
  departments: Department[];
  assignments: Assignment[];
  equipment: Equipment[];
  templates: NotificationTemplate[];
}) {
  const router = useRouter();
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ sent: number; failed: { name: string; error: string }[] } | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeEmployees = employees.filter((e) => e.isActive);
  const selectedEmployees = activeEmployees.filter((e) => employeeIds.includes(e.id));
  const template = templates.find((t) => t.id === templateId);
  const previewEmployee = selectedEmployees[0];

  const previewAssignedEquipmentNames = useMemo(
    () => (previewEmployee ? getAssignedEquipmentNames(assignments, equipment, previewEmployee.id) : []),
    [assignments, equipment, previewEmployee]
  );

  const previewDepartmentName = previewEmployee?.departmentId
    ? getDepartmentName(departments, previewEmployee.departmentId)
    : null;
  const previewSubject = previewEmployee
    ? renderNotificationText(subject, previewEmployee, previewDepartmentName, previewAssignedEquipmentNames)
    : subject;
  const previewBody = previewEmployee
    ? renderNotificationText(body, previewEmployee, previewDepartmentName, previewAssignedEquipmentNames)
    : body;

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
    setResult(null);
    if (selectedEmployees.length === 0) {
      setError("Wybierz co najmniej jednego pracownika.");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setError("Podaj temat i treść wiadomości.");
      return;
    }

    startTransition(async () => {
      let sent = 0;
      const failed: { name: string; error: string }[] = [];

      for (const employee of selectedEmployees) {
        const name = employeeFullName(employee);
        if (!employee.email) {
          failed.push({ name, error: "brak adresu e-mail" });
          continue;
        }
        const assignedEquipmentNames = getAssignedEquipmentNames(assignments, equipment, employee.id);
        const departmentName = employee.departmentId ? getDepartmentName(departments, employee.departmentId) : null;
        const renderedSubject = renderNotificationText(subject, employee, departmentName, assignedEquipmentNames);
        const renderedBody = renderNotificationText(body, employee, departmentName, assignedEquipmentNames);

        const res = await sendNotificationAction({
          employeeId: employee.id,
          employeeName: name,
          employeeEmail: employee.email,
          templateId: template?.id ?? null,
          templateName: template?.name ?? null,
          subject: renderedSubject,
          body: renderedBody,
        });

        if (res.ok) sent += 1;
        else failed.push({ name, error: res.error });
      }

      setResult({ sent, failed });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <FormSection title="Odbiorcy i szablon">
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium">
            Pracownicy <span className="text-danger">*</span>
          </p>
          <EmployeeMultiSelect
            employees={activeEmployees}
            departments={departments}
            selectedIds={employeeIds}
            onChange={setEmployeeIds}
          />
        </div>
        <FormField label="Szablon (opcjonalnie)" htmlFor="templateId" full>
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
        Placeholdery w treści (każdy pracownik dostaje wiadomość z podstawionymi własnymi
        danymi):{" "}
        {NOTIFICATION_PLACEHOLDERS.map((p) => (
          <code key={p.token} className="mx-0.5 rounded bg-black/5 px-1" title={p.description}>
            {p.token}
          </code>
        ))}
      </p>

      {previewEmployee && (subject || body) && (
        <div className="rounded-xl border border-dashed border-border bg-surface p-4 text-sm">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Podgląd dla {employeeFullName(previewEmployee)}
            {selectedEmployees.length > 1 && ` (+ ${selectedEmployees.length - 1} kolejnych, każdy dostanie własną wersję)`}
          </p>
          <p className="font-medium">{previewSubject}</p>
          <p className="mt-1 whitespace-pre-wrap text-foreground/80">{previewBody}</p>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}
      {result && (
        <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
          <p className={result.failed.length === 0 ? "text-success" : "text-foreground"}>
            Wysłano do {result.sent} z {result.sent + result.failed.length} pracowników.
          </p>
          {result.failed.length > 0 && (
            <ul className="mt-1.5 list-inside list-disc text-danger">
              {result.failed.map((f, i) => (
                <li key={i}>
                  {f.name}: {f.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSend} disabled={isPending}>
          <Send size={16} />
          {isPending ? "Wysyłanie…" : "Wyślij"}
        </Button>
      </div>
    </div>
  );
}
