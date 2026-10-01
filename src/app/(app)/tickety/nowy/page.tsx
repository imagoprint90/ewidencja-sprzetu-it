import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTabAccess } from "@/lib/supabase/require-tab";
import { getTicketAssignableUsers, getTicketCategories } from "@/lib/supabase/queries";
import { NowyTicketForm } from "./NowyTicketForm";

export default async function NowyTicketPage() {
  await requireTabAccess("tickety");
  const supabase = await createSupabaseServerClient();
  const [categories, assignableUsers] = await Promise.all([
    getTicketCategories(supabase),
    getTicketAssignableUsers(supabase),
  ]);

  return <NowyTicketForm categories={categories} assignableUsers={assignableUsers} />;
}
