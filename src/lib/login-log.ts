import { headers } from "next/headers";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendSmtpEmail } from "@/lib/email";

// Funkcje pomocnicze dziennika logowań i blokady konta — wyłącznie po stronie serwera.

export type LoginEventType =
  | "logowanie"
  | "blad_logowania"
  | "wylogowanie"
  | "konto_zablokowane"
  | "konto_odblokowane";

// Po tylu nieudanych logowaniach pod rząd konto jest blokowane na LOCK_HOURS godzin.
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_HOURS = 1;

// Powód zapisywany przy próbie logowania na zablokowane konto — takie próby nie liczą się
// do kolejnej serii nieudanych logowań.
export const BLOCKED_ATTEMPT_REASON = "Konto zablokowane";

// Adres, na który idzie powiadomienie o zablokowaniu konta (można nadpisać zmienną
// środowiskową SECURITY_ALERT_EMAIL).
const ALERT_EMAIL = process.env.SECURITY_ALERT_EMAIL || "biuro@imagoprint.pl";

export interface RequestInfo {
  ip: string | null;
  userAgent: string | null;
  country: string | null;
  city: string | null;
}

export async function getRequestInfo(): Promise<RequestInfo> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const rawCity = h.get("x-vercel-ip-city");
  let city: string | null = null;
  if (rawCity) {
    try {
      city = decodeURIComponent(rawCity);
    } catch {
      city = rawCity;
    }
  }
  return {
    ip: (forwarded ? forwarded.split(",")[0].trim() : h.get("x-real-ip")) || null,
    userAgent: h.get("user-agent")?.slice(0, 400) ?? null,
    country: h.get("x-vercel-ip-country"),
    city,
  };
}

export async function insertLoginEvent(input: {
  event: LoginEventType;
  userId?: string | null;
  email?: string | null;
  fullName?: string | null;
  reason?: string | null;
  info: RequestInfo;
}): Promise<void> {
  try {
    const service = createSupabaseServiceClient();
    await service.from("login_events").insert({
      event: input.event,
      user_id: input.userId ?? null,
      email: input.email ?? null,
      full_name: input.fullName ?? null,
      ip_address: input.info.ip,
      user_agent: input.info.userAgent,
      country: input.info.country,
      city: input.info.city,
      reason: input.reason?.slice(0, 200) ?? null,
    });
  } catch {
    // dziennik jest pomocniczy — nie blokuje logowania
  }
}

// Ile nieudanych logowań pod rząd ma dany adres e-mail: liczymy od najnowszych zdarzeń wstecz
// aż do udanego logowania, blokady lub odblokowania konta. Próby na już zablokowane konto
// pomijamy (nie wydłużają serii).
export async function countConsecutiveFailures(email: string): Promise<number> {
  const service = createSupabaseServiceClient();
  const { data } = await service
    .from("login_events")
    .select("event, reason")
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(50);

  let count = 0;
  for (const row of data ?? []) {
    if (row.event !== "blad_logowania") break;
    if (row.reason === BLOCKED_ATTEMPT_REASON) continue;
    count += 1;
  }
  return count;
}

export async function sendLockoutAlert(input: {
  email: string;
  fullName: string | null;
  info: RequestInfo;
  until: Date;
}): Promise<void> {
  const when = new Date().toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });
  const until = input.until.toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });
  const place = [input.info.city, input.info.country].filter(Boolean).join(", ") || "brak danych";
  await sendSmtpEmail({
    to: ALERT_EMAIL,
    subject: `Zablokowano konto w systemie ewidencji: ${input.email}`,
    text: [
      `Konto zostało automatycznie zablokowane po ${MAX_FAILED_ATTEMPTS} nieudanych próbach logowania pod rząd.`,
      "",
      `Użytkownik: ${input.fullName ? `${input.fullName} (${input.email})` : input.email}`,
      `Czas zdarzenia: ${when}`,
      `Blokada do: ${until} (${LOCK_HOURS} godz.)`,
      `Adres IP ostatniej próby: ${input.info.ip ?? "brak danych"}`,
      `Przybliżona lokalizacja: ${place}`,
      `Przeglądarka: ${input.info.userAgent ?? "brak danych"}`,
      "",
      "Jeśli to nie był użytkownik, sprawdź zakładkę Ustawienia → Sesje logowań.",
      "Administrator może odblokować konto wcześniej w zakładce Użytkownicy.",
    ].join("\n"),
  });
}
