import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAssignments, getCategories, getEmployees, getEquipment } from "@/lib/supabase/queries";
import { daysUntil, formatDate } from "@/lib/format";
import { EQUIPMENT_STATUS_LABELS } from "@/lib/types";
import type { ReactNode } from "react";

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const content = (
    <div className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary/40">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default async function PulpitPage(): Promise<ReactNode> {
  const supabase = await createSupabaseServerClient();
  const [equipment, employees, assignments, categories] = await Promise.all([
    getEquipment(supabase),
    getEmployees(supabase),
    getAssignments(supabase),
    getCategories(supabase),
  ]);

  const counts = {
    w_magazynie: 0,
    przydzielony: 0,
    w_serwisie: 0,
    wycofany: 0,
  };
  for (const e of equipment) counts[e.status]++;

  const expiringWarranties = equipment
    .filter((e) => {
      const d = daysUntil(e.warrantyEnd);
      return d !== null && d >= 0 && d <= 60;
    })
    .sort((a, b) => (daysUntil(a.warrantyEnd) ?? 0) - (daysUntil(b.warrantyEnd) ?? 0));

  const recentAssignments = [...assignments]
    .sort((a, b) => (a.assignedAt < b.assignedAt ? 1 : a.assignedAt > b.assignedAt ? -1 : (a.id < b.id ? 1 : -1)))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Pulpit</h1>
        <p className="text-sm text-muted">
          Skrócony przegląd stanu sprzętu IT ({categories.filter((c) => !c.isArchived).length}{" "}
          aktywnych kategorii, {employees.filter((e) => e.isActive).length} aktywnych
          pracowników).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Wszystkie urządzenia" value={equipment.length} href="/sprzet" />
        <StatCard
          label={EQUIPMENT_STATUS_LABELS.w_magazynie}
          value={counts.w_magazynie}
          href="/sprzet?status=w_magazynie"
        />
        <StatCard
          label={EQUIPMENT_STATUS_LABELS.przydzielony}
          value={counts.przydzielony}
          href="/sprzet?status=przydzielony"
        />
        <StatCard
          label={EQUIPMENT_STATUS_LABELS.w_serwisie}
          value={counts.w_serwisie}
          href="/sprzet?status=w_serwisie"
        />
        <StatCard
          label={EQUIPMENT_STATUS_LABELS.wycofany}
          value={counts.wycofany}
          href="/sprzet?status=wycofany"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold">Kończące się gwarancje (60 dni)</h2>
          {expiringWarranties.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Brak urządzeń z gwarancją kończącą się wkrótce.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {expiringWarranties.map((e) => (
                <li key={e.id} className="flex items-center justify-between text-sm">
                  <Link href={`/sprzet/${e.id}`} className="text-primary hover:underline">
                    {e.name} ({e.inventoryNumber})
                  </Link>
                  <span className="text-muted">{formatDate(e.warrantyEnd)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold">Wygasające licencje</h2>
          <p className="mt-3 text-sm text-muted">
            Moduł licencji zostanie uruchomiony w Etapie 5. Na razie brak danych do wyświetlenia.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold">Ostatnie przekazania</h2>
        {recentAssignments.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Brak zarejestrowanych przekazań.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="pb-2 pr-4 font-medium">Sprzęt</th>
                  <th className="pb-2 pr-4 font-medium">Pracownik</th>
                  <th className="pb-2 pr-4 font-medium">Data przydzielenia</th>
                  <th className="pb-2 font-medium">Data zwrotu</th>
                </tr>
              </thead>
              <tbody>
                {recentAssignments.map((a) => {
                  const eq = equipment.find((e) => e.id === a.equipmentId);
                  const emp = employees.find((e) => e.id === a.employeeId);
                  return (
                    <tr key={a.id} className="border-t border-border">
                      <td className="py-2 pr-4">
                        <Link href={`/sprzet/${a.equipmentId}`} className="text-primary hover:underline">
                          {eq?.name ?? "—"}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">{emp?.fullName ?? "—"}</td>
                      <td className="py-2 pr-4">{formatDate(a.assignedAt)}</td>
                      <td className="py-2">{a.returnedAt ? formatDate(a.returnedAt) : "aktywny"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
