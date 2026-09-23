import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTabAccess } from "@/lib/supabase/require-tab";
import { getAssignments, getDepartments, getEmployees, getEquipment, getLocations } from "@/lib/supabase/queries";
import { PracownicyClient } from "./PracownicyClient";

export default async function PracownicyPage() {
  await requireTabAccess("pracownicy");
  const supabase = await createSupabaseServerClient();
  const [employees, assignments, equipment, locations, departments] = await Promise.all([
    getEmployees(supabase),
    getAssignments(supabase),
    getEquipment(supabase),
    getLocations(supabase),
    getDepartments(supabase),
  ]);

  const assignedEquipmentNames: Record<string, string[]> = {};
  for (const a of assignments) {
    if (a.returnedAt === null) {
      const eq = equipment.find((e) => e.id === a.equipmentId);
      if (eq) {
        (assignedEquipmentNames[a.employeeId] ??= []).push(eq.name);
      }
    }
  }

  return (
    <PracownicyClient
      employees={employees}
      assignedEquipmentNames={assignedEquipmentNames}
      locations={locations}
      departments={departments}
    />
  );
}
