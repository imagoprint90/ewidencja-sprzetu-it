import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ConfigMissing } from "@/components/ui/ConfigMissing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./SetPasswordForm";

export default async function UstawHasloPage() {
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

  return <SetPasswordForm />;
}
