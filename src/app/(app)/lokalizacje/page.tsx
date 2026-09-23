import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTabAccess } from "@/lib/supabase/require-tab";
import { getDepartments, getEmployees, getEquipment, getLocations } from "@/lib/supabase/queries";
import { employeeFullName } from "@/lib/equipment-helpers";
import { LokalizacjeClient } from "./LokalizacjeClient";

export default async function LokalizacjePage() {
  await requireTabAccess("lokalizacje");
  const supabase = await createSupabaseServerClient();
  const [locations, departments, employees, equipment] = await Promise.all([
    getLocations(supabase),
    getDepartments(supabase),
    getEmployees(supabase),
    getEquipment(supabase),
  ]);

  const employeeNamesByLocation: Record<string, string[]> = {};
  const equipmentNames: Record<string, string[]> = {};
  for (const l of locations) {
    employeeNamesByLocation[l.id] = employees.filter((e) => e.locationId === l.id).map(employeeFullName);
    equipmentNames[l.id] = equipment.filter((e) => e.locationId === l.id).map((e) => e.name);
  }

  const employeeNamesByDepartment: Record<string, string[]> = {};
  for (const d of departments) {
    employeeNamesByDepartment[d.id] = employees.filter((e) => e.departmentId === d.id).map(employeeFullName);
  }

  return (
    <LokalizacjeClient
      locations={locations}
      departments={departments}
      employeeNamesByLocation={employeeNamesByLocation}
      equipmentNames={equipmentNames}
      employeeNamesByDepartment={employeeNamesByDepartment}
    />
  );
}
