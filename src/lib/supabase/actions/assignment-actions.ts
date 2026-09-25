"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TechnicalCondition } from "@/lib/types";

type ActionResult = { ok: true } | { ok: false; error: string };

export interface TransferEquipmentSetInput {
  equipmentIds: string[];
  newEmployeeId: string | null; // null = zwrot do magazynu
  transferDate: string;
  condition: TechnicalCondition;
  notes: string | null;
  // Przekazanie bez protokołu — nie zapisuje się w historii przydziałów.
  skipHistory?: boolean;
  // Lokalizacja sprzętu po przekazaniu (null = brak). undefined = dawne zachowanie bazy.
  locationId?: string | null;
}

export async function transferEquipmentSetAction(
  input: TransferEquipmentSetInput
): Promise<ActionResult> {
  if (input.equipmentIds.length === 0) {
    return { ok: false, error: "Nie wybrano żadnego sprzętu do przekazania." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("transfer_equipment_set", {
    p_equipment_ids: input.equipmentIds,
    p_new_employee_id: input.newEmployeeId,
    p_transfer_date: input.transferDate,
    p_condition: input.condition,
    p_notes: input.notes,
    // Parametr wysyłany tylko gdy potrzebny — zwykłe przekazania działają też przed migracją 0036.
    ...(input.skipHistory ? { p_skip_history: true } : {}),
    ...(input.locationId !== undefined
      ? { p_location_id: input.locationId, p_apply_location: true }
      : {}),
  });

  if (error) {
    if (error.message.includes("Data przekazania")) {
      return { ok: false, error: "Data przekazania nie może być wcześniejsza niż data przydzielenia." };
    }
    if (error.message.includes("Brak uprawnień")) {
      return { ok: false, error: "Nie masz uprawnień do wykonania tej operacji." };
    }
    if (error.code === "PGRST202" || error.message.includes("p_skip_history") || error.message.includes("p_apply_location")) {
      return {
        ok: false,
        error: "Baza nie ma jeszcze najnowszych migracji (0036 / 0043) — uruchom je w Supabase SQL Editor.",
      };
    }
    console.error("transfer_equipment_set", error);
    return { ok: false, error: `Nie udało się zapisać przekazania: ${error.message}` };
  }

  for (const id of input.equipmentIds) {
    revalidatePath(`/sprzet/${id}`);
  }
  revalidatePath("/sprzet");
  revalidatePath("/pulpit");
  revalidatePath("/pracownicy");
  return { ok: true };
}
