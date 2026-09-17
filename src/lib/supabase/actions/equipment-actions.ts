"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapEquipment } from "@/lib/supabase/mappers";
import type { Equipment, TechnicalCondition } from "@/lib/types";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface EquipmentInput {
  inventoryNumber: string;
  categoryId: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  warrantyEnd: string | null;
  technicalCondition: TechnicalCondition | null;
  purchasePrice: number | null;
  location: string;
  notes: string | null;
}

function toRow(input: EquipmentInput) {
  return {
    inventory_number: input.inventoryNumber.trim(),
    category_id: input.categoryId,
    name: input.name.trim(),
    manufacturer: input.manufacturer,
    model: input.model,
    serial_number: input.serialNumber,
    purchase_date: input.purchaseDate,
    warranty_end: input.warrantyEnd,
    technical_condition: input.technicalCondition,
    purchase_price: input.purchasePrice,
    location: input.location.trim(),
    notes: input.notes,
  };
}

export async function addEquipmentAction(
  input: EquipmentInput
): Promise<ActionResult<Equipment>> {
  if (!input.inventoryNumber.trim()) {
    return { ok: false, error: "Numer inwentarzowy jest wymagany." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("equipment")
    .insert({ ...toRow(input), status: "w_magazynie" })
    .select()
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { ok: false, error: "Ten numer inwentarzowy już istnieje w systemie." };
    }
    return { ok: false, error: "Nie udało się zapisać sprzętu. Spróbuj ponownie." };
  }

  revalidatePath("/sprzet");
  revalidatePath("/pulpit");
  return { ok: true, data: mapEquipment(data) };
}

export async function updateEquipmentAction(
  id: string,
  input: EquipmentInput
): Promise<ActionResult<undefined>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("equipment").update(toRow(input)).eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ten numer inwentarzowy już istnieje w systemie." };
    }
    return { ok: false, error: "Nie udało się zapisać zmian." };
  }

  revalidatePath("/sprzet");
  revalidatePath(`/sprzet/${id}`);
  revalidatePath("/pulpit");
  return { ok: true, data: undefined };
}

export async function addEquipmentLinkAction(
  equipmentId: string,
  linkedEquipmentId: string
): Promise<ActionResult<undefined>> {
  if (equipmentId === linkedEquipmentId) {
    return { ok: false, error: "Nie można powiązać sprzętu z samym sobą." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("equipment_links")
    .insert({ equipment_id: equipmentId, linked_equipment_id: linkedEquipmentId });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "To powiązanie już istnieje." };
    }
    return { ok: false, error: "Nie udało się dodać powiązania." };
  }

  revalidatePath(`/sprzet/${equipmentId}`);
  revalidatePath(`/sprzet/${linkedEquipmentId}`);
  return { ok: true, data: undefined };
}

export async function removeEquipmentLinkAction(
  linkId: string,
  equipmentId: string
): Promise<ActionResult<undefined>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("equipment_links").delete().eq("id", linkId);

  if (error) {
    return { ok: false, error: "Nie udało się usunąć powiązania." };
  }

  revalidatePath(`/sprzet/${equipmentId}`);
  return { ok: true, data: undefined };
}
