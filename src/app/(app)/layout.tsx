import { redirect } from "next/navigation";
import { DemoStoreProvider } from "@/lib/store";
import { AppShell } from "@/components/layout/AppShell";
import { ConfigMissing } from "@/components/ui/ConfigMissing";
import { isSupabaseConfigured } from "@/lib/supabase/config";
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

  return (
    <DemoStoreProvider>
      <AppShell userEmail={user.email ?? ""}>{children}</AppShell>
    </DemoStoreProvider>
  );
}
