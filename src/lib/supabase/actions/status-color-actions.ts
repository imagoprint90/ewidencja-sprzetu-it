"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EQUIPMENT_STATUS_LABELS } from "@/lib/types";

type ActionResult = { ok: true } | { ok: false; error: string };

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function saveStatusColorAction(
  status: string,
  textColor: string,
  backgroundColor: string | null
): Promise<ActionResult> {
  if (!(status in EQUIPMENT_STATUS_LABELS)) return { ok: false, error: "Nieznany status." };
  if (!HEX.test(textColor) || (backgroundColor !== null && !HEX.test(backgroundColor))) {
    return { ok: false, error: "Nieprawidłowy kolor." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("status_colors")
    .upsert({ status, text_color: textColor, background_color: backgroundColor });
  if (error) {
    return { ok: false, error: "Nie udało się zapisać koloru (czy uruchomiono migrację 0038?)." };
  }

  revalidatePath("/sprzet");
  revalidatePath("/statusy-sprzetu");
  return { ok: true };
}