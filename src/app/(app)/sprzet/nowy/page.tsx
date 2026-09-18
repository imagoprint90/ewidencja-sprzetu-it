import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTabAccess } from "@/lib/supabase/require-tab";
import { getCategories } from "@/lib/supabase/queries";
import { NowySprzetForm } from "./NowySprzetForm";

export default async function NowySprzetPage() {
  await requireTabAccess("sprzet");
  const supabase = await createSupabaseServerClient();
  const categories = await getCategories(supabase);

  return <NowySprzetForm categories={categories} />;
}
