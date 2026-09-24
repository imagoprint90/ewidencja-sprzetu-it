import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTabAccess } from "@/lib/supabase/require-tab";
import { getCategories, getEmployees } from "@/lib/supabase/queries";
import { NowySprzetForm } from "./NowySprzetForm";

export default async function NowySprzetPage() {
  await requireTabAccess("sprzet");
  const supabase = await createSupabaseServerClient();
  const [categories, employees] = await Promise.all([getCategories(supabase), getEmployees(supabase)]);

  return <NowySprzetForm categories={categories} employees={employees.filter((e) => e.isActive)} />;
}
