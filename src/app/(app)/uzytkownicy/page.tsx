import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminPage } from "@/lib/supabase/require-tab";
import { getProfiles } from "@/lib/supabase/queries";
import { UzytkownicyClient } from "./UzytkownicyClient";

export default async function UzytkownicyPage() {
  await requireAdminPage();
  const supabase = await createSupabaseServerClient();
  const profiles = await getProfiles(supabase);

  return <UzytkownicyClient profiles={profiles} />;
}
