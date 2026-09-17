import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getAssignments,
  getCategories,
  getEmployees,
  getEquipment,
  getEquipmentLinks,
  getInstalledSoftware,
  getSoftwareProducts,
} from "@/lib/supabase/queries";
import { SprzetClient } from "./SprzetClient";

export default async function SprzetPage() {
  const supabase = await createSupabaseServerClient();
  const [equipment, categories, employees, assignments, equipmentLinks, installedSoftware, softwareProducts] =
    await Promise.all([
      getEquipment(supabase),
      getCategories(supabase),
      getEmployees(supabase),
      getAssignments(supabase),
      getEquipmentLinks(supabase),
      getInstalledSoftware(supabase),
      getSoftwareProducts(supabase),
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
    />
  );
}
