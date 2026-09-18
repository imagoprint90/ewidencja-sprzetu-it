import { redirect } from "next/navigation";
import { canViewTab, type TabKey } from "@/lib/access";
import { createSupabaseServerClient } from "./server";
import { getCurrentProfile } from "./queries";

// Wywoływane na początku każdej chronionej strony spoza Pulpitu — blokuje bezpośredni dostęp
// przez URL do zakładki, której administrator nie udostępnił temu kontu (samo ukrycie linku
// w bocznym menu by to nie zablokowało). Układ (app)/layout.tsx już wcześniej sprawdza, czy
// użytkownik jest zalogowany i ma profil — tu tylko dokładamy sprawdzenie konkretnej zakładki.
export async function requireTabAccess(tab: TabKey): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/logowanie");

  const profile = await getCurrentProfile(supabase, user.id);
  if (!profile) return; // layout.tsx pokaże ekran "Konto bez uprawnień"

  if (!canViewTab(profile.role, profile.visibleTabs, tab)) {
    redirect("/brak-dostepu");
  }
}

export async function requireAdminPage(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/logowanie");

  const profile = await getCurrentProfile(supabase, user.id);
  if (!profile) return;

  if (profile.role !== "administrator") {
    redirect("/brak-dostepu");
  }
}
