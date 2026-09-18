import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCompanySettings } from "@/lib/supabase/queries";
import { UstawieniaClient } from "./UstawieniaClient";

export default async function UstawieniaPage() {
  const supabase = await createSupabaseServerClient();
  const companySettings = await getCompanySettings(supabase);

  return <UstawieniaClient companySettings={companySettings} />;
}
