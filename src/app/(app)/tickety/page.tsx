import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTabAccess } from "@/lib/supabase/require-tab";
import { getTicketAssignableUsers, getTicketCategories, getTickets } from "@/lib/supabase/queries";
import { TicketyClient } from "./TicketyClient";

export default async function TicketyPage() {
  await requireTabAccess("tickety");
  const supabase = await createSupabaseServerClient();
  const [tickets, categories, assignableUsers] = await Promise.all([
    getTickets(supabase),
    getTicketCategories(supabase),
    getTicketAssignableUsers(supabase),
  ]);

  return <TicketyClient tickets={tickets} categories={categories} assignableUsers={assignableUsers} />;
}
