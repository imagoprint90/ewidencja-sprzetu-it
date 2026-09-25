"use server";

import { headers } from "next/headers";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export type LoginEventType = "logowanie" | "blad_logowania" | "wylogowanie";

// Zapis do dziennika logowań. Wpisy "logowanie" i "wylogowanie" powstają tylko dla realnie
// zalogowanego konta (tożsamość bierzemy z sesji, nie z parametrów), więc nie da się ich
// sfałszować. Nieudane próby nie mają sesji — zapisujemy podany adres e-mail (przycięty).
// Błąd zapisu dziennika nigdy nie może zablokować logowania, więc nic nie rzucamy.
export async function logLoginEventAction(input: {
  event: LoginEventType;
  email?: string;
  reason?: string;
}): Promise<void> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const ip = (forwarded ? forwarded.split(",")[0].trim() : h.get("x-real-ip")) || null;
    const userAgent = h.get("user-agent")?.slice(0, 400) ?? null;
    const country = h.get("x-vercel-ip-country");
    const rawCity = h.get("x-vercel-ip-city");
    let city: string | null = null;
    if (rawCity) {
      try {
        city = decodeURIComponent(rawCity);
      } catch {
        city = rawCity;
      }
    }

    let userId: string | null = null;
    let email: string | null = null;
    let fullName: string | null = null;

    if (input.event === "blad_logowania") {
      email = input.email?.trim().toLowerCase().slice(0, 200) || null;
    } else {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;
      email = user.email ?? null;
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      fullName = profile?.full_name ?? null;
    }

    const service = createSupabaseServiceClient();
    await service.from("login_events").insert({
      event: input.event,
      user_id: userId,
      email,
      full_name: fullName,
      ip_address: ip,
      user_agent: userAgent,
      country,
      city,
      reason: input.reason?.slice(0, 200) ?? null,
    });
  } catch {
    // dziennik jest pomocniczy — ignorujemy błędy zapisu
  }
}
