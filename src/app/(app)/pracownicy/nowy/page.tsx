import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTabAccess } from "@/lib/supabase/require-tab";
import { getDepartments, getLocations } from "@/lib/supabase/queries";
import { NowyPracownikForm } from "./NowyPracownikForm";

export default async function NowyPracownikPage() {
  await requireTabAccess("pracownicy");
  const supabase = await createSupabaseServerClient();
  const [locations, departments] = await Promise.all([getLocations(supabase), getDepartments(supabase)]);

  return <NowyPracownikForm locations={locations} departments={departments} />;
}
