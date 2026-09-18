import { requireAdminPage } from "@/lib/supabase/require-tab";
import { NowyUzytkownikForm } from "./NowyUzytkownikForm";

export default async function NowyUzytkownikPage() {
  await requireAdminPage();
  return <NowyUzytkownikForm />;
}
