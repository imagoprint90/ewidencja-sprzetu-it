import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTabAccess } from "@/lib/supabase/require-tab";
import { getCategories, getEmployees, getLocations } from "@/lib/supabase/queries";
import { NowySprzetForm } from "./NowySprzetForm";

export default async function NowySprzetPage() {
  await requireTabAccess("sprzet");
  const supabase = await createSupabaseServerClient();
  const [categories, employees, locations] = await Promise.all([
    getCategories(supabase),
    getEmployees(supabase),
    getLocations(supabase),
  ]);

  return <NowySprzetForm
      categories={categories}
      employees={employees.filter((e) => e.isActive)}
      locations={locations.filter((l) => !l.isArchived)}
    />;
}
