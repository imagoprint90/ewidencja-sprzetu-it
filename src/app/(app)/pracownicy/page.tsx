import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAssignments, getEmployees } from "@/lib/supabase/queries";
import { PracownicyClient } from "./PracownicyClient";

export default async function PracownicyPage() {
  const supabase = await createSupabaseServerClient();
  const [employees, assignments] = await Promise.all([
    getEmployees(supabase),
    getAssignments(supabase),
  ]);

  const assignedCounts: Record<string, number> = {};
  for (const a of assignments) {
    if (a.returnedAt === null) {
      assignedCounts[a.employeeId] = (assignedCounts[a.employeeId] ?? 0) + 1;
    }
  }

  return <PracownicyClient employees={employees} assignedCounts={assignedCounts} />;
}
