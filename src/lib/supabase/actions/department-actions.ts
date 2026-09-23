"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function addDepartmentAction(name: string): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Nazwa działu nie może być pusta." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("departments").insert({ name: trimmed });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Dział o tej nazwie już istnieje." };
    }
    return { ok: false, error: "Nie udało się dodać działu." };
  }

  revalidatePath("/lokalizacje");
  return { ok: true };
}

export async function renameDepartmentAction(id: string, name: string): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Nazwa działu nie może być pusta." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("departments").update({ name: trimmed }).eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Dział o tej nazwie już istnieje." };
    }
    return { ok: false, error: "Nie udało się zmienić nazwy działu." };
  }

  revalidatePath("/lokalizacje");
  revalidatePath("/pracownicy");
  return { ok: true };
}

export async function archiveDepartmentAction(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  const { count: employeeCount } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("department_id", id);

  if ((employeeCount ?? 0) > 0) {
    return {
      ok: false,
      error: "Nie można zarchiwizować działu — jest przypisany do pracowników. Zmień im dział przed archiwizacją.",
    };
  }

  const { error } = await supabase.from("departments").update({ is_archived: true }).eq("id", id);
  if (error) return { ok: false, error: "Nie udało się zarchiwizować działu." };

  revalidatePath("/lokalizacje");
  return { ok: true };
}

export async function unarchiveDepartmentAction(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("departments").update({ is_archived: false }).eq("id", id);
  if (error) return { ok: false, error: "Nie udało się przywrócić działu." };

  revalidatePath("/lokalizacje");
  return { ok: true };
}

export async function deleteDepartmentAction(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  const { count: employeeCount } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("department_id", id);

  if ((employeeCount ?? 0) > 0) {
    return {
      ok: false,
      error: "Nie można usunąć działu — jest przypisany do pracowników. Zmień im dział przed usunięciem.",
    };
  }

  const { error } = await supabase.from("departments").delete().eq("id", id);
  if (error) return { ok: false, error: "Nie udało się usunąć działu." };

  revalidatePath("/lokalizacje");
  return { ok: true };
}
