import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTabAccess } from "@/lib/supabase/require-tab";
import { getAssignments, getEmployees, getLocations } from "@/lib/supabase/queries";
import { PracownicyClient } from "./PracownicyClient";

export default async function PracownicyPage() {
  await requireTabAccess("pracownicy");
  const supabase = await createSupabaseServerClient();
  const [employees, assignments, locations] = await Promise.all([
    getEmployees(supabase),
    getAssignments(supabase),
    getLocations(supabase),
  ]);

  const assignedCounts: Record<string, number> = {};
  for (const a of assignments) {
    if (a.returnedAt === null) {
      assignedCounts[a.employeeId] = (assignedCounts[a.employeeId] ?? 0) + 1;
    }
  }

  return <PracownicyClient employees={employees} assignedCounts={assignedCounts} locations={locations} />;
}
