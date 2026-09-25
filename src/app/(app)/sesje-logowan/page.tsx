import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminPage } from "@/lib/supabase/require-tab";
import { SesjeLogowanClient, type LoginEventRow } from "./SesjeLogowanClient";

// Ile ostatnich zdarzeń ładujemy do widoku (starsze zostają w bazie).
const MAX_EVENTS = 1000;

export default async function SesjeLogowanPage() {
  await requireAdminPage();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("login_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAX_EVENTS);

  const events: LoginEventRow[] = (data ?? []).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    event: row.event,
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    ip: row.ip_address,
    userAgent: row.user_agent,
    country: row.country,
    city: row.city,
    reason: row.reason,
  }));

  return <SesjeLogowanClient events={events} loadError={Boolean(error)} limit={MAX_EVENTS} />;
}
