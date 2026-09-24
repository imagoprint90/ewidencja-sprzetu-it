"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputClass } from "@/components/ui/Form";
import { formatDateTime } from "@/lib/format";
import type { LicenseHistoryEntry } from "@/lib/types";

export function LicenseHistory({ history }: { history: LicenseHistoryEntry[] }) {
  const [product, setProduct] = useState("");
  const [query, setQuery] = useState("");

  const products = useMemo(
    () => Array.from(new Set(history.map((h) => h.productName))).sort((a, b) => a.localeCompare(b)),
    [history]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return history.filter((h) => {
      if (product && h.productName !== product) return false;
      if (!q) return true;
      return [h.equipmentName ?? "", h.employeeName ?? "", h.actorName ?? ""].join(" ").toLowerCase().includes(q);
    });
  }, [history, product, query]);

  if (history.length === 0) {
    return (
      <EmptyState
        title="Brak historii licencji"
        description="Wpisy pojawią się po pierwszym przypisaniu lub usunięciu przypisania licencji."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Historia przypisań licencji do komputerów i pracowników. Przeniesienie licencji na inny
        komputer widać jako „Usunięto” z poprzedniego i „Przypisano” do nowego.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select className={inputClass + " sm:max-w-xs"} value={product} onChange={(e) => setProduct(e.target.value)}>
          <option value="">Wszystkie produkty</option>
          {products.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          className={inputClass + " sm:max-w-xs"}
          placeholder="Szukaj: komputer, pracownik, kto zmienił…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2.5 font-medium">Data</th>
              <th className="px-3 py-2.5 font-medium">Produkt</th>
              <th className="px-3 py-2.5 font-medium">Zdarzenie</th>
              <th className="px-3 py-2.5 font-medium">Komputer / pracownik</th>
              <th className="px-3 py-2.5 font-medium">Kto</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h) => (
              <tr key={h.id} className="border-b border-border last:border-0">
                <td className="whitespace-nowrap px-3 py-2">{formatDateTime(h.happenedAt)}</td>
                <td className="px-3 py-2">{h.productName}</td>
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
    </div>
  );
}
