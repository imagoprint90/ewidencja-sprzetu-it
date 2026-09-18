import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTabAccess } from "@/lib/supabase/require-tab";
import { getCompanySettings } from "@/lib/supabase/queries";
import { UstawieniaClient } from "./UstawieniaClient";

export default async function UstawieniaPage() {
  await requireTabAccess("ustawienia");
  const supabase = await createSupabaseServerClient();
  const companySettings = await getCompanySettings(supabase);

  return <UstawieniaClient companySettings={companySettings} />;
}
