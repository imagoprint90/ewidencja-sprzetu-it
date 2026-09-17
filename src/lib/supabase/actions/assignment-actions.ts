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
  });

  if (error) {
    if (error.message.includes("Data przekazania")) {
      return { ok: false, error: "Data przekazania nie może być wcześniejsza niż data przydzielenia." };
    }
    if (error.message.includes("Brak uprawnień")) {
      return { ok: false, error: "Nie masz uprawnień do wykonania tej operacji." };
    }
    return { ok: false, error: "Nie udało się zapisać przekazania. Spróbuj ponownie." };
  }

  for (const id of input.equipmentIds) {
    revalidatePath(`/sprzet/${id}`);
  }
  revalidatePath("/sprzet");
  revalidatePath("/pulpit");
  revalidatePath("/pracownicy");
  return { ok: true };
}
