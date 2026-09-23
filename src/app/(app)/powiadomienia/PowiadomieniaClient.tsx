"use client";

import { Tabs } from "@/components/ui/Tabs";
import type {
  Assignment,
  Department,
  Employee,
  Equipment,
  NotificationLogEntry,
  NotificationSchedule,
  NotificationTemplate,
} from "@/lib/types";
import { SendTab } from "./SendTab";
import { TemplatesTab } from "./TemplatesTab";
import { SchedulesTab } from "./SchedulesTab";
import { HistoryTab } from "./HistoryTab";

export function PowiadomieniaClient({
  employees,
  departments,
  assignments,
  equipment,
  templates,
  schedules,
  log,
}: {
  employees: Employee[];
  departments: Department[];
  assignments: Assignment[];
  equipment: Equipment[];
  templates: NotificationTemplate[];
  schedules: NotificationSchedule[];
  log: NotificationLogEntry[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Powiadomienia</h1>
        <p className="text-sm text-muted">
          Ręczne i automatyczne wysyłanie maili do pracowników, na podstawie zapisanych
          szablonów albo treści napisanej od razu.
        </p>
      </div>

      <Tabs
        tabs={[
          {
            key: "wyslij",
            label: "Wyślij",
            content: (
              <SendTab
                employees={employees}
                departments={departments}
                assignments={assignments}
                equipment={equipment}
                templates={templates}
              />
            ),
          },
          {
            key: "harmonogramy",
            label: "Automatyczne",
            content: (
              <SchedulesTab schedules={schedules} employees={employees} departments={departments} templates={templates} />
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
