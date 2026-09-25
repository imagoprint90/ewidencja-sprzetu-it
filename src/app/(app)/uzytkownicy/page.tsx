import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAdminPage } from "@/lib/supabase/require-tab";
import { getCategories, getProfiles } from "@/lib/supabase/queries";
import { UzytkownicyClient } from "./UzytkownicyClient";

// Konta aktualnie zablokowane (po 5 nieudanych logowaniach) — id konta -> koniec blokady.
async function getLockedUntil(): Promise<Record<string, string>> {
  try {
    const service = createSupabaseServiceClient();
    const { data } = await service.auth.admin.listUsers({ perPage: 1000 });
    const now = Date.now();
    const result: Record<string, string> = {};
    for (const u of data?.users ?? []) {
      if (u.banned_until && new Date(u.banned_until).getTime() > now) result[u.id] = u.banned_until;
    }
    return result;
  } catch {
    return {};
  }
}

export default async function UzytkownicyPage() {
  await requireAdminPage();
  const supabase = await createSupabaseServerClient();
  const [profiles, categories, lockedUntil] = await Promise.all([
    getProfiles(supabase),
    getCategories(supabase),
    getLockedUntil(),
  ]);

  return <UzytkownicyClient profiles={profiles} categories={categories} lockedUntil={lockedUntil} />;
}