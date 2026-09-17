"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function addCategoryAction(name: string): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Nazwa kategorii nie może być pusta." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("categories").insert({ name: trimmed });

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

export async function archiveCategoryAction(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

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
      error:
        "Nie można zarchiwizować kategorii — jest przypisana do istniejącego sprzętu. Przypisz ten sprzęt do innej kategorii.",
    };
  }

  const { error } = await supabase
    .from("categories")
    .update({ is_archived: true })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Nie udało się zarchiwizować kategorii." };
  }

  revalidatePath("/kategorie");
  return { ok: true };
}
