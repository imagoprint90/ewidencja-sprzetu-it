import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminPage } from "@/lib/supabase/require-tab";
import { getCategories, getTicketCategories } from "@/lib/supabase/queries";
import { NowyUzytkownikForm } from "./NowyUzytkownikForm";

export default async function NowyUzytkownikPage() {
  await requireAdminPage();
  const supabase = await createSupabaseServerClient();
  const [categories, ticketCategories] = await Promise.all([
    getCategories(supabase),
    getTicketCategories(supabase),
  ]);
  return <NowyUzytkownikForm categories={categories} ticketCategories={ticketCategories} />;
}
