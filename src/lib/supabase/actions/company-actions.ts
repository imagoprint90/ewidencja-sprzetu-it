"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateCompanySettingsAction(input: {
  name: string;
  address: string;
  nip: string | null;
  representativeName: string;
}): Promise<ActionResult> {
  if (!input.name.trim()) return { ok: false, error: "Nazwa firmy jest wymagana." };
  if (!input.address.trim()) return { ok: false, error: "Adres firmy jest wymagany." };
  if (!input.representativeName.trim()) {
    return { ok: false, error: "Podaj imię i nazwisko osoby reprezentującej firmę." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("company_settings")
    .update({
      name: input.name.trim(),
      address: input.address.trim(),
      nip: input.nip?.trim() || null,
      representative_name: input.representativeName.trim(),
    })
    .eq("id", true);

  if (error) return { ok: false, error: "Nie udało się zapisać danych firmy." };

  revalidatePath("/ustawienia");
  return { ok: true };
}
