import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTabAccess } from "@/lib/supabase/require-tab";
import { getCategories, getEquipment } from "@/lib/supabase/queries";
import { KategorieClient } from "./KategorieClient";

export default async function KategoriePage() {
  await requireTabAccess("kategorie");
  const supabase = await createSupabaseServerClient();
  const [categories, equipment] = await Promise.all([
    getCategories(supabase),
    getEquipment(supabase),
  ]);

  const equipmentCounts = Object.fromEntries(
    categories.map((c) => [c.id, equipment.filter((e) => e.categoryId === c.id).length])
  );

  return <KategorieClient categories={categories} equipmentCounts={equipmentCounts} />;
}
