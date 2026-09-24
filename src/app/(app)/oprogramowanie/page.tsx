import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTabAccess } from "@/lib/supabase/require-tab";
import {
  getEmployees,
  getEquipment,
  getLicenseAssignments,
  getLicenseHistory,
  getSoftwareLicenses,
  getSoftwareProducts,
} from "@/lib/supabase/queries";
import { OprogramowanieClient } from "./OprogramowanieClient";

export default async function OprogramowaniePage() {
  await requireTabAccess("oprogramowanie");
  const supabase = await createSupabaseServerClient();
  const [products, licenses, assignments, equipment, employees, history] = await Promise.all([
    getSoftwareProducts(supabase),
    getSoftwareLicenses(supabase),
    getLicenseAssignments(supabase),
    getEquipment(supabase),
    getEmployees(supabase),
    getLicenseHistory(supabase),
  ]);

  // Tylko identyfikatory licencji, które mają klucz (sam klucz pobierany jest na żądanie);
  // dla kont innych niż administrator RLS zwraca pustą listę.
  const { data: keyRows } = await supabase.from("license_keys").select("license_id");

  return (
    <OprogramowanieClient
      products={products}
      licenses={licenses}
      assignments={assignments}
      equipment={equipment}
      employees={employees.filter((e) => e.isActive)}
      history={history}
      keyLicenseIds={(keyRows ?? []).map((r) => r.license_id as string)}
    />
  );
}
