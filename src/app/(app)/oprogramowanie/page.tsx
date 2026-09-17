import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getEmployees,
  getEquipment,
  getLicenseAssignments,
  getSoftwareLicenses,
  getSoftwareProducts,
} from "@/lib/supabase/queries";
import { OprogramowanieClient } from "./OprogramowanieClient";

export default async function OprogramowaniePage() {
  const supabase = await createSupabaseServerClient();
  const [products, licenses, assignments, equipment, employees] = await Promise.all([
    getSoftwareProducts(supabase),
    getSoftwareLicenses(supabase),
    getLicenseAssignments(supabase),
    getEquipment(supabase),
    getEmployees(supabase),
  ]);

  return (
    <OprogramowanieClient
      products={products}
      licenses={licenses}
      assignments={assignments}
      equipment={equipment}
      employees={employees.filter((e) => e.isActive)}
    />
  );
}
