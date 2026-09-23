"use client";

import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/format";
import { NOTIFICATION_STATUS_LABELS, type NotificationLogEntry } from "@/lib/types";

export function HistoryTab({ log }: { log: NotificationLogEntry[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (log.length === 0) {
    return (
      <EmptyState
        title="Brak wysłanych powiadomień"
        description="Historia pojawi się tutaj po pierwszej wysyłce z zakładki „Wyślij”."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[880px] text-sm">
        <thead>
          <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-3 py-2.5 font-medium">Data</th>
            <th className="px-3 py-2.5 font-medium">Pracownik</th>
            <th className="px-3 py-2.5 font-medium">Temat</th>
            <th className="px-3 py-2.5 font-medium">Szablon</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Wysłał</th>
          </tr>
        </thead>
        <tbody>
          {log.map((entry) => {
            const expanded = expandedId === entry.id;
            return (
              <Fragment key={entry.id}>
                <tr
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-primary/5"
                  onClick={() => setExpandedId(expanded ? null : entry.id)}
                >
                  <td className="whitespace-nowrap px-3 py-2 align-middle">{formatDateTime(entry.createdAt)}</td>
                  <td className="px-3 py-2 align-middle">
                    {entry.employeeName}
                    <span className="block text-xs text-muted">{entry.employeeEmail}</span>
                  </td>
                  <td className="px-3 py-2 align-middle">{entry.subject}</td>
                  <td className="px-3 py-2 align-middle">{entry.templateName ?? "—"}</td>
                  <td className="px-3 py-2 align-middle">
                    <Badge tone={entry.status === "wyslano" ? "success" : "danger"}>
                      {NOTIFICATION_STATUS_LABELS[entry.status]}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 align-middle">{entry.sentByName}</td>
                </tr>
                {expanded && (
                  <tr className="border-b border-border last:border-0 bg-black/[0.015]">
                    <td colSpan={6} className="px-3 py-3">
                      <p className="whitespace-pre-wrap text-sm">{entry.body}</p>
                      {entry.errorMessage && (
                        <p className="mt-2 text-sm text-danger">Błąd: {entry.errorMessage}</p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
