import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTabAccess } from "@/lib/supabase/require-tab";
import { getEmployees, getEquipment, getLocations } from "@/lib/supabase/queries";
import { LokalizacjeClient } from "./LokalizacjeClient";

export default async function LokalizacjePage() {
  await requireTabAccess("lokalizacje");
  const supabase = await createSupabaseServerClient();
  const [locations, employees, equipment] = await Promise.all([
    getLocations(supabase),
    getEmployees(supabase),
    getEquipment(supabase),
  ]);

  const employeeNames: Record<string, string[]> = {};
  const equipmentNames: Record<string, string[]> = {};
  for (const l of locations) {
    employeeNames[l.id] = employees.filter((e) => e.locationId === l.id).map((e) => e.fullName);
    equipmentNames[l.id] = equipment.filter((e) => e.locationId === l.id).map((e) => e.name);
  }

  return (
    <LokalizacjeClient
      locations={locations}
      employeeNames={employeeNames}
      equipmentNames={equipmentNames}
    />
  );
}
