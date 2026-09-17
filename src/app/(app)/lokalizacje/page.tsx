import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmployees, getEquipment, getLocations } from "@/lib/supabase/queries";
import { LokalizacjeClient } from "./LokalizacjeClient";

export default async function LokalizacjePage() {
  const supabase = await createSupabaseServerClient();
  const [locations, employees, equipment] = await Promise.all([
    getLocations(supabase),
    getEmployees(supabase),
    getEquipment(supabase),
  ]);

  const employeeCounts: Record<string, number> = {};
  const equipmentCounts: Record<string, number> = {};
  for (const l of locations) {
    employeeCounts[l.id] = employees.filter((e) => e.locationId === l.id).length;
    equipmentCounts[l.id] = equipment.filter((e) => e.locationId === l.id).length;
  }

  return (
    <LokalizacjeClient
      locations={locations}
      employeeCounts={employeeCounts}
      equipmentCounts={equipmentCounts}
    />
  );
}
