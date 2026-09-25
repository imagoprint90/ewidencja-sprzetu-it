"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function addCategoryAction(name: string): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Nazwa kategorii nie może być pusta." };

  const supabase = await createSupabaseServerClient();
  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  let { error } = await supabase
    .from("categories")
    .insert({ name: trimmed, sort_order: (last?.sort_order ?? 0) + 1 });
  if (error?.code === "42703" || error?.code === "PGRST204") {
    // Brak kolumny sort_order (migracja 0035 jeszcze nie uruchomiona) — dodaj bez kolejności.
    ({ error } = await supabase.from("categories").insert({ name: trimmed }));
  }

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Kategoria o tej nazwie już istnieje." };
    }
    return { ok: false, error: "Nie udało się dodać kategorii. Spróbuj ponownie." };
  }

  revalidatePath("/kategorie");
  revalidatePath("/sprzet");
  return { ok: true };
}

export async function renameCategoryAction(id: string, name: string): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Nazwa kategorii nie może być pusta." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("categories").update({ name: trimmed }).eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Kategoria o tej nazwie już istnieje." };
    }
    return { ok: false, error: "Nie udało się zmienić nazwy kategorii." };
  }

  revalidatePath("/kategorie");
  revalidatePath("/sprzet");
  return { ok: true };
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Brak zalogowanego użytkownika." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "administrator") {
    return { ok: false, error: "Tylko administrator może usuwać kategorie." };
  }

  const { count, error: countError } = await supabase
    .from("equipment")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (countError) {
    return { ok: false, error: "Nie udało się sprawdzić powiązanego sprzętu." };
  }
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `Nie można usunąć kategorii — jest przypisana do ${count} pozycji sprzętu. Zmień najpierw kategorię tego sprzętu.`,
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return { ok: false, error: "Nie można usunąć kategorii — jest przypisana do sprzętu." };
    }
    return { ok: false, error: "Nie udało się usunąć kategorii." };
  }

  // Sprzątanie: usunięta kategoria znika też z uprawnień kont (visible_categories).
  const { data: affected } = await supabase
    .from("profiles")
    .select("id, visible_categories")
    .contains("visible_categories", [id]);
  for (const p of affected ?? []) {
    await supabase
      .from("profiles")
      .update({ visible_categories: (p.visible_categories as string[]).filter((c) => c !== id) })
      .eq("id", p.id);
  }

  revalidatePath("/kategorie");
  revalidatePath("/sprzet");
  revalidatePath("/uzytkownicy");
  return { ok: true };
}
export async function reorderCategoriesAction(ids: string[]): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const results = await Promise.all(
    ids.map((id, i) => supabase.from("categories").update({ sort_order: i + 1 }).eq("id", id)),
  );
  if (results.some((r) => r.error)) {
    return { ok: false, error: "Nie udało się zapisać kolejności kategorii." };
  }
  revalidatePath("/kategorie");
  revalidatePath("/sprzet");
  return { ok: true };
}

export async function setCategoryWindowsAction(id: string, supportsWindows: boolean): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Brak zalogowanego użytkownika." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "administrator") return { ok: false, error: "Tylko administrator może zmieniać to ustawienie." };

  const { error } = await supabase.from("categories").update({ supports_windows: supportsWindows }).eq("id", id);
  if (error) return { ok: false, error: "Nie udało się zapisać (czy uruchomiono migrację 0040?)." };

  revalidatePath("/kategorie");
  revalidatePath("/sprzet");
  return { ok: true };
}