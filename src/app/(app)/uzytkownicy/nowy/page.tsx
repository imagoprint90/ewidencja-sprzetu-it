import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminPage } from "@/lib/supabase/require-tab";
import { getCategories } from "@/lib/supabase/queries";
import { NowyUzytkownikForm } from "./NowyUzytkownikForm";

export default async function NowyUzytkownikPage() {
  await requireAdminPage();
  const supabase = await createSupabaseServerClient();
  const categories = await getCategories(supabase);
  return <NowyUzytkownikForm categories={categories} />;
}
