import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTabAccess } from "@/lib/supabase/require-tab";
import {
  getAssignments,
  getCategories,
  getDepartments,
  getEmployees,
  getEquipment,
  getLicenseAssignments,
  getLocations,
  getSoftwareLicenses,
  getSoftwareProducts,
} from "@/lib/supabase/queries";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { PracownikDetailClient } from "./PracownikDetailClient";

export default async function PracownikDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireTabAccess("pracownicy");
  const supabase = await createSupabaseServerClient();
  const [employees, equipment, categories, assignments, licenses, licenseAssignments, products, locations, departments] =
    await Promise.all([
      getEmployees(supabase),
      getEquipment(supabase),
      getCategories(supabase),
      getAssignments(supabase),
      getSoftwareLicenses(supabase),
      getLicenseAssignments(supabase),
      getSoftwareProducts(supabase),
      getLocations(supabase),
      getDepartments(supabase),
    ]);

  const employee = employees.find((e) => e.id === id);

  if (!employee) {
    return (
      <EmptyState
        title="Nie znaleziono pracownika"
        action={
          <Link href="/pracownicy">
            <Button variant="secondary">Wróć do listy pracowników</Button>
          </Link>
        }
      />
    );
  }

  const history = assignments
    .filter((a) => a.employeeId === id)
    .sort((a, b) => (a.assignedAt < b.assignedAt ? 1 : -1));

  const personalLicenses = licenseAssignments
    .filter((a) => a.employeeId === id)
    .map((a) => {
      const license = licenses.find((l) => l.id === a.licenseId);
      const product = license ? products.find((p) => p.id === license.productId) : undefined;
      return product ? { assignmentId: a.id, productName: product.name, validUntil: license?.validUntil ?? null } : null;
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  return (
    <PracownikDetailClient
      employee={employee}
      equipment={equipment}
      categories={categories}
      history={history}
      personalLicenses={personalLicenses}
      locations={locations}
      departments={departments}
    />
  );
}
