import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/supabase/queries";
import { NowySprzetForm } from "./NowySprzetForm";

export default async function NowySprzetPage() {
  const supabase = await createSupabaseServerClient();
  const categories = await getCategories(supabase);

  return <NowySprzetForm categories={categories} />;
}
