import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminPage } from "@/lib/supabase/require-tab";
import { getEquipment, getEquipmentStatuses } from "@/lib/supabase/queries";
import { StatusySprzetuClient } from "./StatusySprzetuClient";

export default async function StatusySprzetuPage() {
  await requireAdminPage();
  const supabase = await createSupabaseServerClient();
  const [statuses, equipment] = await Promise.all([getEquipmentStatuses(supabase), getEquipment(supabase)]);

  const counts: Record<string, number> = {};
  for (const e of equipment) counts[e.status] = (counts[e.status] ?? 0) + 1;

  return <StatusySprzetuClient statuses={statuses} counts={counts} />;
}
