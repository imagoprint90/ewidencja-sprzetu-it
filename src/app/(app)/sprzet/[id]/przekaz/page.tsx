import { Suspense } from "react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTabAccess } from "@/lib/supabase/require-tab";
import {
  getAssignments,
  getCategories,
  getEmployees,
  getEquipment,
  getEquipmentLinks,
  getInstalledSoftware,
  getLicenseAssignments,
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
    assignments,
    equipmentLinks,
    installedSoftware,
    products,
    licenses,
    licenseAssignments,
  ] = await Promise.all([
    getEquipment(supabase),
    getCategories(supabase),
    getEmployees(supabase),
    getAssignments(supabase),
    getEquipmentLinks(supabase),
    getInstalledSoftware(supabase),
    getSoftwareProducts(supabase),
    getSoftwareLicenses(supabase),
    getLicenseAssignments(supabase),
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
        assignments={assignments}
        equipmentLinks={equipmentLinks}
        installedSoftware={installedSoftware}
        products={products}
        licenses={licenses}
        licenseAssignments={licenseAssignments}
      />
    </Suspense>
  );
}
