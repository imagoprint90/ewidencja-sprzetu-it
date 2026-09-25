"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestInfo, insertLoginEvent } from "@/lib/login-log";

// Zapis wylogowania do dziennika. Tożsamość bierzemy z sesji (nie z parametrów), więc nie da się
// jej sfałszować. Logowania i nieudane próby zapisuje signInAction (auth-actions.ts).
export async function logLogoutAction(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    await insertLoginEvent({
      event: "wylogowanie",
      userId: user.id,
      email: user.email ?? null,
      fullName: profile?.full_name ?? null,
      info: await getRequestInfo(),
    });
  } catch {
    // dziennik jest pomocniczy
  }
}