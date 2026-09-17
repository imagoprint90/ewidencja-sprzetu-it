import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getAssignments,
  getCategories,
  getEmployees,
  getEquipment,
  getEquipmentLinks,
} from "@/lib/supabase/queries";
import { SprzetClient } from "./SprzetClient";

export default async function SprzetPage() {
  const supabase = await createSupabaseServerClient();
  const [equipment, categories, employees, assignments, equipmentLinks] = await Promise.all([
    getEquipment(supabase),
    getCategories(supabase),
    getEmployees(supabase),
    getAssignments(supabase),
    getEquipmentLinks(supabase),
  ]);

  return (
    <SprzetClient
      equipment={equipment}
      categories={categories}
      employees={employees}
      assignments={assignments}
      equipmentLinks={equipmentLinks}
    />
  );
}
