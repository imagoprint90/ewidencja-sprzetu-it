import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocations } from "@/lib/supabase/queries";
import { NowyPracownikForm } from "./NowyPracownikForm";

export default async function NowyPracownikPage() {
  const supabase = await createSupabaseServerClient();
  const locations = await getLocations(supabase);

  return <NowyPracownikForm locations={locations} />;
}
