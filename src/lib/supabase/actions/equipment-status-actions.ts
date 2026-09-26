"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

const HEX = /^#[0-9a-fA-F]{6}$/;
const MIGRATION_HINT = " (czy uruchomiono migrację 0039?)";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Brak zalogowanego użytkownika." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "administrator") {
    return { ok: false as const, error: "Tylko administrator może zarządzać statusami." };
  }
  return { ok: true as const, supabase };
}

function revalidate() {
  revalidatePath("/sprzet");
  revalidatePath("/statusy-sprzetu");
  revalidatePath("/pulpit");
}

function validLabel(label: string): string | { error: string } {
  const name = label.trim();
  if (!name) return { error: "Nazwa statusu nie może być pusta." };
  if (name.length > 40) return { error: "Nazwa statusu jest zbyt długa (maks. 40 znaków)." };
  return name;
}

export async function addEquipmentStatusAction(
  label: string,
  textColor: string,
  backgroundColor: string | null
): Promise<ActionResult> {
  const name = validLabel(label);
  if (typeof name !== "string") return { ok: false, error: name.error };
  if (!HEX.test(textColor) || (backgroundColor !== null && !HEX.test(backgroundColor))) {
    return { ok: false, error: "Nieprawidłowy kolor." };
  }

  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const { supabase } = auth;

  const { data: last } = await supabase
    .from("equipment_statuses")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("equipment_statuses").insert({
    key: `s_${crypto.randomUUID().slice(0, 8)}`,
    label: name,
    text_color: textColor,
    background_color: backgroundColor,
    is_system: false,
    sort_order: (last?.sort_order ?? 0) + 1,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Status o tej nazwie już istnieje." };
    return { ok: false, error: `Nie udało się dodać statusu.${MIGRATION_HINT}` };
  }
  revalidate();
  return { ok: true };
}

export async function updateEquipmentStatusDefAction(
  key: string,
  patch: {
    label?: string;
    textColor?: string;
    backgroundColor?: string | null;
    textColorDark?: string | null;
    backgroundColorDark?: string | null;
  }
): Promise<ActionResult> {
  const row: Record<string, unknown> = {};
  if (patch.label !== undefined) {
    const name = validLabel(patch.label);
    if (typeof name !== "string") return { ok: false, error: name.error };
    row.label = name;
  }
  if (patch.textColor !== undefined) {
    if (!HEX.test(patch.textColor)) return { ok: false, error: "Nieprawidłowy kolor." };
    row.text_color = patch.textColor;
  }
  if (patch.backgroundColor !== undefined) {
    if (patch.backgroundColor !== null && !HEX.test(patch.backgroundColor)) {
      return { ok: false, error: "Nieprawidłowy kolor." };
    }
    row.background_color = patch.backgroundColor;
  }
  for (const [key, column] of [
    ["textColorDark", "text_color_dark"],
    ["backgroundColorDark", "background_color_dark"],
  ] as const) {
    const value = patch[key];
    if (value === undefined) continue;
    if (value !== null && !HEX.test(value)) return { ok: false, error: "Nieprawidłowy kolor." };
    row[column] = value;
  }
  if (Object.keys(row).length === 0) return { ok: true };

  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const { error } = await auth.supabase.from("equipment_statuses").update(row).eq("key", key);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Status o tej nazwie już istnieje." };
    return { ok: false, error: `Nie udało się zapisać zmian.${MIGRATION_HINT}` };
  }
  revalidate();
  return { ok: true };
}

export async function deleteEquipmentStatusAction(key: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const { supabase } = auth;

  const { data: status } = await supabase
    .from("equipment_statuses")
    .select("is_system")
    .eq("key", key)
    .maybeSingle();
  if (!status) return { ok: false, error: "Nie znaleziono statusu." };
  if (status.is_system) {
    return { ok: false, error: "Statusów systemowych nie można usunąć — mają znaczenie w logice aplikacji." };
  }

  const { count } = await supabase
    .from("equipment")
    .select("id", { count: "exact", head: true })
    .eq("status", key);
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `Nie można usunąć — status jest ustawiony u ${count} pozycji sprzętu. Zmień im najpierw status.`,
    };
  }

  const { error } = await supabase.from("equipment_statuses").delete().eq("key", key);
  if (error) {
    if (error.code === "23503") return { ok: false, error: "Status jest używany przez sprzęt — nie można go usunąć." };
    return { ok: false, error: "Nie udało się usunąć statusu." };
  }
  revalidate();
  return { ok: true };
}
