"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { translateAuthError } from "@/lib/supabase/auth-errors";
import {
  BLOCKED_ATTEMPT_REASON,
  LOCK_HOURS,
  MAX_FAILED_ATTEMPTS,
  countConsecutiveFailures,
  getRequestInfo,
  insertLoginEvent,
  sendLockoutAlert,
} from "@/lib/login-log";

type Result = { ok: true } | { ok: false; error: string };

const LOCKED_MESSAGE = `Konto zostało czasowo zablokowane (zbyt wiele nieudanych prób logowania). Spróbuj ponownie za ${LOCK_HOURS} godz. albo poproś administratora o odblokowanie.`;

// Logowanie po stronie serwera: to serwer widzi wszystkie próby (także nieudane), zlicza je
// i blokuje konto — przeglądarka nie ma nic do powiedzenia w tej sprawie.
export async function signInAction(emailInput: string, password: string): Promise<Result> {
  const email = emailInput.trim().toLowerCase();
  if (!email || !password) return { ok: false, error: "Podaj adres e-mail i hasło." };

  const info = await getRequestInfo();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (!error && data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", data.user.id)
      .maybeSingle();
    await insertLoginEvent({
      event: "logowanie",
      userId: data.user.id,
      email: data.user.email ?? email,
      fullName: profile?.full_name ?? null,
      info,
    });
    return { ok: true };
  }

  const message = error?.message ?? "";
  const banned = error?.code === "user_banned" || message.toLowerCase().includes("banned");

  if (banned) {
    await insertLoginEvent({ event: "blad_logowania", email, reason: BLOCKED_ATTEMPT_REASON, info });
    return { ok: false, error: LOCKED_MESSAGE };
  }

  const translated = translateAuthError(message);
  await insertLoginEvent({ event: "blad_logowania", email, reason: translated, info });

  try {
    const failures = await countConsecutiveFailures(email);
    if (failures >= MAX_FAILED_ATTEMPTS) {
      const service = createSupabaseServiceClient();
      const { data: profile } = await service
        .from("profiles")
        .select("id, full_name, email")
        .ilike("email", email)
        .maybeSingle();

      // Blokujemy tylko istniejące konta (dla nieznanego adresu nie ma czego blokować).
      if (profile) {
        const { error: banError } = await service.auth.admin.updateUserById(profile.id, {
          ban_duration: `${LOCK_HOURS}h`,
        });
        if (!banError) {
          const until = new Date(Date.now() + LOCK_HOURS * 60 * 60 * 1000);
          await insertLoginEvent({
            event: "konto_zablokowane",
            userId: profile.id,
            email,
            fullName: profile.full_name,
            reason: `${MAX_FAILED_ATTEMPTS} nieudanych prób pod rząd — blokada na ${LOCK_HOURS} godz.`,
            info,
          });
          await sendLockoutAlert({ email, fullName: profile.full_name, info, until });
          return { ok: false, error: LOCKED_MESSAGE };
        }
      }
    }
  } catch {
    // Błąd w mechanizmie blokady nie może zmienić wyniku logowania.
  }

  return { ok: false, error: translated };
}

// Ręczne odblokowanie konta przez administratora (przed upływem godziny blokady).
export async function unlockUserAction(userId: string): Promise<Result> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Brak zalogowanego użytkownika." };

  const { data: me } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();
  if (me?.role !== "administrator") return { ok: false, error: "Tylko administrator może odblokować konto." };

  const service = createSupabaseServiceClient();
  const { error } = await service.auth.admin.updateUserById(userId, { ban_duration: "none" });
  if (error) return { ok: false, error: "Nie udało się odblokować konta." };

  const { data: target } = await service.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
  await insertLoginEvent({
    event: "konto_odblokowane",
    userId,
    email: target?.email ?? null,
    fullName: target?.full_name ?? null,
    reason: `Odblokował: ${me?.full_name ?? user.email ?? "administrator"}`,
    info: await getRequestInfo(),
  });

  revalidatePath("/uzytkownicy");
  revalidatePath("/sesje-logowan");
  return { ok: true };
}
