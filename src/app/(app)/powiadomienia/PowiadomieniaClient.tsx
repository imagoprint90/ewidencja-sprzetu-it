"use client";

import { Tabs } from "@/components/ui/Tabs";
import type { Assignment, Employee, Equipment, NotificationLogEntry, NotificationTemplate } from "@/lib/types";
import { SendTab } from "./SendTab";
import { TemplatesTab } from "./TemplatesTab";
import { HistoryTab } from "./HistoryTab";

export function PowiadomieniaClient({
  employees,
  assignments,
  equipment,
  templates,
  log,
}: {
  employees: Employee[];
  assignments: Assignment[];
  equipment: Equipment[];
  templates: NotificationTemplate[];
  log: NotificationLogEntry[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Powiadomienia</h1>
        <p className="text-sm text-muted">
          Ręczne wysyłanie maili do pracowników, na podstawie zapisanych szablonów albo
          treści napisanej od razu. Automatyczne powiadomienia (np. o kończącej się
          gwarancji) pojawią się tu w kolejnym etapie.
        </p>
      </div>

      <Tabs
        tabs={[
          {
            key: "wyslij",
            label: "Wyślij",
            content: (
              <SendTab employees={employees} assignments={assignments} equipment={equipment} templates={templates} />
            ),
          },
          {
            key: "szablony",
            label: "Szablony",
            content: <TemplatesTab templates={templates} />,
          },
          {
            key: "historia",
            label: "Historia",
            content: <HistoryTab log={log} />,
          },
        ]}
      />
    </div>
  );
}
