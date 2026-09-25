import { Suspense } from "react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTabAccess } from "@/lib/supabase/require-tab";
import {
  getAssignments,
  getCategories,
  getDepartments,
  getEmployees,
  getEquipment,
  getEquipmentLinks,
  getInstalledSoftware,
  getLicenseAssignments,
  getLocations,
  getSoftwareLicenses,
  getSoftwareProducts,
} from "@/lib/supabase/queries";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { PrzekazForm } from "./PrzekazForm";

export default async function PrzekazSprzetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireTabAccess("sprzet");
  const supabase = await createSupabaseServerClient();
  const [
    equipment,
    categories,
    employees,
    departments,
    assignments,
    equipmentLinks,
    installedSoftware,
    products,
    licenses,
    licenseAssignments,
    locations,
  ] = await Promise.all([
    getEquipment(supabase),
    getCategories(supabase),
    getEmployees(supabase),
    getDepartments(supabase),
    getAssignments(supabase),
    getEquipmentLinks(supabase),
    getInstalledSoftware(supabase),
    getSoftwareProducts(supabase),
    getSoftwareLicenses(supabase),
    getLicenseAssignments(supabase),
    getLocations(supabase),
  ]);

  const item = equipment.find((e) => e.id === id);

  if (!item) {
    return (
      <EmptyState
        title="Nie znaleziono sprzętu"
        action={
          <Link href="/sprzet">
            <Button variant="secondary">Wróć do listy sprzętu</Button>
          </Link>
        }
      />
    );
  }

  return (
    <Suspense>
      <PrzekazForm
        item={item}
        allEquipment={equipment}
        categories={categories}
        employees={employees}
        departments={departments}
        assignments={assignments}
        equipmentLinks={equipmentLinks}
        installedSoftware={installedSoftware}
        products={products}
        licenses={licenses}
        licenseAssignments={licenseAssignments}
        locations={locations}
      />
    </Suspense>
  );
}
