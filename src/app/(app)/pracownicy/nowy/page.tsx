import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTabAccess } from "@/lib/supabase/require-tab";
import { getLocations } from "@/lib/supabase/queries";
import { NowyPracownikForm } from "./NowyPracownikForm";

export default async function NowyPracownikPage() {
  await requireTabAccess("pracownicy");
  const supabase = await createSupabaseServerClient();
  const locations = await getLocations(supabase);

  return <NowyPracownikForm locations={locations} />;
}
