"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function addLocationAction(name: string): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Nazwa lokalizacji nie może być pusta." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("locations").insert({ name: trimmed });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Lokalizacja o tej nazwie już istnieje." };
    }
    return { ok: false, error: "Nie udało się dodać lokalizacji." };
  }

  revalidatePath("/lokalizacje");
  return { ok: true };
}

export async function renameLocationAction(id: string, name: string): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Nazwa lokalizacji nie może być pusta." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("locations").update({ name: trimmed }).eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Lokalizacja o tej nazwie już istnieje." };
    }
    return { ok: false, error: "Nie udało się zmienić nazwy lokalizacji." };
  }

  revalidatePath("/lokalizacje");
  revalidatePath("/sprzet");
  revalidatePath("/pracownicy");
  return { ok: true };
}

export async function archiveLocationAction(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  const { data: location } = await supabase
    .from("locations")
    .select("is_warehouse")
    .eq("id", id)
    .single();

  if (location?.is_warehouse) {
    return { ok: false, error: "Nie można zarchiwizować domyślnej lokalizacji magazynu." };
  }

  const [{ count: employeeCount }, { count: equipmentCount }] = await Promise.all([
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("location_id", id),
    supabase.from("equipment").select("id", { count: "exact", head: true }).eq("location_id", id),
  ]);

  if ((employeeCount ?? 0) > 0 || (equipmentCount ?? 0) > 0) {
    return {
      ok: false,
      error:
        "Nie można zarchiwizować lokalizacji — jest przypisana do pracowników lub sprzętu. Zmień im lokalizację przed archiwizacją.",
    };
  }

  const { error } = await supabase.from("locations").update({ is_archived: true }).eq("id", id);
  if (error) return { ok: false, error: "Nie udało się zarchiwizować lokalizacji." };

  revalidatePath("/lokalizacje");
  return { ok: true };
}
