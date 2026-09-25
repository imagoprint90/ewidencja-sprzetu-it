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
  getProtocolItemLinks,
  getProtocols,
  getSoftwareLicenses,
  getSoftwareProducts,
  getStatusColors,
} from "@/lib/supabase/queries";
import { buildLastProtocols } from "@/lib/equipment-helpers";
import { SprzetClient } from "./SprzetClient";

export default async function SprzetPage() {
  await requireTabAccess("sprzet");
  const supabase = await createSupabaseServerClient();
  const [
    equipment,
    categories,
    employees,
    assignments,
    equipmentLinks,
    installedSoftware,
    softwareProducts,
    licenses,
    licenseAssignments,
    locations,
    protocols,
    protocolItemLinks,
    statusColors,
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
    getLocations(supabase),
    getProtocols(supabase),
    getProtocolItemLinks(supabase),
    getStatusColors(supabase),
  ]);

  return (
    <SprzetClient
      equipment={equipment}
      categories={categories}
      employees={employees}
      assignments={assignments}
      equipmentLinks={equipmentLinks}
      installedSoftware={installedSoftware}
      softwareProducts={softwareProducts}
      licenses={licenses}
      licenseAssignments={licenseAssignments}
      locations={locations}
      statusColors={statusColors}
      lastProtocols={buildLastProtocols(equipment, protocols, protocolItemLinks)}
    />
  );
}
