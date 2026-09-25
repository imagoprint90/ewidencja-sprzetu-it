import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getAssignments,
  getCategories,
  getCurrentProfile,
  getEmployees,
  getEquipment,
  getEquipmentStatuses,
  getSoftwareLicenses,
  getSoftwareProducts,
} from "@/lib/supabase/queries";
import { daysUntil, formatDate } from "@/lib/format";
import { canViewTab } from "@/lib/access";
import { employeeFullName } from "@/lib/equipment-helpers";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getCurrentProfile(supabase, user.id) : null;
  const canSeeEquipment = profile ? canViewTab(profile.role, profile.visibleTabs, "sprzet") : false;
  const canSeeSoftware = profile ? canViewTab(profile.role, profile.visibleTabs, "oprogramowanie") : false;

  const [equipment, employees, assignments, categories, licenses, softwareProducts, statuses] = await Promise.all([
    getEquipment(supabase),
    getEmployees(supabase),
    getAssignments(supabase),
    getCategories(supabase),
    getSoftwareLicenses(supabase),
    getSoftwareProducts(supabase),
    getEquipmentStatuses(supabase),
  ]);

  const counts: Record<string, number> = {};
  for (const e of equipment) counts[e.status] = (counts[e.status] ?? 0) + 1;

  const expiringWarranties = equipment
    .filter((e) => {
      const d = daysUntil(e.warrantyEnd);
      return d !== null && d >= 0 && d <= 60;
    })
    .sort((a, b) => (daysUntil(a.warrantyEnd) ?? 0) - (daysUntil(b.warrantyEnd) ?? 0));

  const expiringLicenses = licenses
    .filter((l) => {
      const d = daysUntil(l.validUntil);
      return d !== null && d >= 0 && d <= 60;
    })
    .sort((a, b) => (daysUntil(a.validUntil) ?? 0) - (daysUntil(b.validUntil) ?? 0));

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

      {canSeeEquipment && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <StatCard label="Wszystkie urządzenia" value={equipment.length} href="/sprzet" />
          {statuses.map((s) => (
            <StatCard
              key={s.key}
              label={s.label}
              value={counts[s.key] ?? 0}
              href={`/sprzet?status=${encodeURIComponent(s.key)}`}
            />
          ))}        </div>
      )}

      {(canSeeEquipment || canSeeSoftware) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {canSeeEquipment && (
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
          )}

          {canSeeSoftware && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold">Wygasające licencje (60 dni)</h2>
              {expiringLicenses.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Brak licencji wygasających wkrótce.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {expiringLicenses.map((l) => (
                    <li key={l.id} className="flex items-center justify-between text-sm">
                      <Link href="/oprogramowanie" className="text-primary hover:underline">
                        {softwareProducts.find((p) => p.id === l.productId)?.name ?? "Nieznany produkt"}
                      </Link>
                      <span className="text-muted">{formatDate(l.validUntil)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {canSeeEquipment && (
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
                        <td className="py-2 pr-4">{emp ? employeeFullName(emp) : "—"}</td>
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
      )}

      {!canSeeEquipment && !canSeeSoftware && (
        <div className="rounded-xl border border-dashed border-border bg-surface p-5 text-sm text-muted">
          Twoje konto nie ma dostępu do żadnej zakładki z podsumowaniem. Skorzystaj z menu po
          lewej stronie.
        </div>
      )}
    </div>
  );
}
