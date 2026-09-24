"use client";

import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";
import type { LicenseHistoryEntry } from "@/lib/types";

// Historia jednej licencji — przeniesienie na inny komputer widać jako "Usunięto" z
// poprzedniego i "Przypisano" do nowego.
export function LicenseHistory({ entries }: { entries: LicenseHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted">
        Brak historii tej licencji. Wpisy pojawią się po przypisaniu lub usunięciu przypisania.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-3 py-2 font-medium">Data</th>
            <th className="px-3 py-2 font-medium">Zdarzenie</th>
            <th className="px-3 py-2 font-medium">Komputer / pracownik</th>
            <th className="px-3 py-2 font-medium">Kto</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((h) => (
            <tr key={h.id} className="border-b border-border last:border-0">
              <td className="whitespace-nowrap px-3 py-2">{formatDateTime(h.happenedAt)}</td>
              <td className="px-3 py-2">
                <Badge tone={h.action === "przypisano" ? "success" : "warning"}>
                  {h.action === "przypisano" ? "Przypisano" : "Usunięto"}
                </Badge>
              </td>
              <td className="px-3 py-2">{h.equipmentName ?? h.employeeName ?? "—"}</td>
              <td className="px-3 py-2">{h.actorName ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
