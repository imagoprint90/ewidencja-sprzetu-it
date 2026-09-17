"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useIsAdmin } from "@/lib/current-user-context";
import { getLocationName } from "@/lib/equipment-helpers";
import type { Employee, Location } from "@/lib/types";

export function PracownicyClient({
  employees,
  assignedCounts,
  locations,
}: {
  employees: Employee[];
  assignedCounts: Record<string, number>;
  locations: Location[];
}) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      if (!showInactive && !e.isActive) return false;
      if (!q) return true;
      return [e.fullName, e.email ?? "", e.department, getLocationName(locations, e.locationId)]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [employees, query, showInactive, locations]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Pracownicy</h1>
          <p className="text-sm text-muted">
            {filtered.length} z {employees.length} pozycji
          </p>
        </div>
        {isAdmin && (
          <Link href="/pracownicy/nowy">
            <Button>
              <Plus size={16} />
              Dodaj pracownika
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj pracownika…"
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary"
          />
          Pokaż nieaktywnych
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Brak pracowników spełniających kryteria"
          action={
            isAdmin ? (
              <Link href="/pracownicy/nowy">
                <Button variant="secondary">Dodaj pierwszego pracownika</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Imię i nazwisko</th>
                <th className="px-4 py-3 font-medium">Dział</th>
                <th className="px-4 py-3 font-medium">Lokalizacja</th>
                <th className="px-4 py-3 font-medium">Przydzielony sprzęt</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-black/[0.02]"
                  onClick={() => router.push(`/pracownicy/${e.id}`)}
                >
                  <td className="px-4 py-3">
                    <Link href={`/pracownicy/${e.id}`} className="font-medium text-primary hover:underline">
                      {e.fullName}
                    </Link>
                    {e.email && <p className="text-xs text-muted">{e.email}</p>}
                  </td>
                  <td className="px-4 py-3">{e.department}</td>
                  <td className="px-4 py-3">{getLocationName(locations, e.locationId)}</td>
                  <td className="px-4 py-3">{assignedCounts[e.id] ?? 0} szt.</td>
                  <td className="px-4 py-3">
                    <Badge tone={e.isActive ? "success" : "default"}>
                      {e.isActive ? "Aktywny" : "Nieaktywny"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
