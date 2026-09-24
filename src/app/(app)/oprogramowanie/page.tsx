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
import { Tabs } from "@/components/ui/Tabs";
import { OprogramowanieClient } from "./OprogramowanieClient";
import { LicenseHistory } from "./LicenseHistory";

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

  return (
    <Tabs
      tabs={[
        {
          key: "licencje",
          label: "Produkty i licencje",
          content: (
            <OprogramowanieClient
              products={products}
              licenses={licenses}
              assignments={assignments}
              equipment={equipment}
              employees={employees.filter((e) => e.isActive)}
            />
          ),
        },
        { key: "historia", label: "Historia licencji", content: <LicenseHistory history={history} /> },
      ]}
    />
  );
}
