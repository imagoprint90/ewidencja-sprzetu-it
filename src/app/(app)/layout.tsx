import { redirect } from "next/navigation";

// Wszystkie strony w tej grupie zależą od sesji zalogowanego użytkownika i danych
// pobieranych na żądanie — nie mogą być statycznie generowane podczas builda.
export const dynamic = "force-dynamic";
import { AppShell } from "@/components/layout/AppShell";
import { Footer } from "@/components/layout/Footer";
import { ConfigMissing } from "@/components/ui/ConfigMissing";
import { CurrentUserProvider } from "@/lib/current-user-context";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return <ConfigMissing />;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/logowanie");
  }

  const profile = await getCurrentProfile(supabase, user.id);

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="max-w-md rounded-xl border border-warning/30 bg-warning/10 p-6 text-center">
            <h1 className="text-base font-semibold">Konto bez uprawnień</h1>
            <p className="mt-2 text-sm text-foreground/80">
              Twoje konto ({user.email}) zostało utworzone w Supabase Auth, ale nie ma
              jeszcze przypisanej roli w systemie. Poproś administratora o dodanie wiersza w
              tabeli <code className="rounded bg-black/10 px-1">profiles</code> (patrz
              README.md, sekcja „Zakładanie kont użytkowników”).
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <CurrentUserProvider
      value={{
        id: user.id,
        email: user.email ?? "",
        fullName: profile.fullName,
        role: profile.role,
        visibleTabs: profile.visibleTabs,
        visibleCategories: profile.visibleCategories,
        canEditEquipment: profile.canEditEquipment,
        canTransferEquipment: profile.canTransferEquipment,
      }}
    >
      <AppShell userEmail={user.email ?? ""}>{children}</AppShell>
    </CurrentUserProvider>
  );
}
