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
  getLocations,
  getProtocolsForEquipment,
  getSoftwareLicenses,
  getSoftwareProducts,
} from "@/lib/supabase/queries";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { SprzetDetailClient } from "./SprzetDetailClient";

export default async function SprzetDetailPage({
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
    protocols,
    products,
    installedSoftware,
    licenses,
    licenseAssignments,
    locations,
  ] = await Promise.all([
    getEquipment(supabase),
    getCategories(supabase),
    getEmployees(supabase),
    getAssignments(supabase),
    getEquipmentLinks(supabase),
    getProtocolsForEquipment(supabase, id),
    getSoftwareProducts(supabase),
    getInstalledSoftware(supabase),
    getSoftwareLicenses(supabase),
    getLicenseAssignments(supabase),
    getLocations(supabase),
  ]);

  const item = equipment.find((e) => e.id === id);

  if (!item) {
    return (
      <EmptyState
        title="Nie znaleziono sprzętu"
        description="Sprzęt o podanym identyfikatorze nie istnieje lub został usunięty."
        action={
          <Link href="/sprzet">
            <Button variant="secondary">Wróć do listy sprzętu</Button>
          </Link>
        }
      />
    );
  }

  return (
    <SprzetDetailClient
      item={item}
      allEquipment={equipment}
      categories={categories}
      employees={employees}
      assignments={assignments}
      equipmentLinks={equipmentLinks}
      protocols={protocols}
      products={products}
      installedSoftware={installedSoftware}
      licenses={licenses}
      licenseAssignments={licenseAssignments}
      locations={locations}
    />
  );
}
