"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapEquipment } from "@/lib/supabase/mappers";
import type { Equipment, EquipmentStatus, TechnicalCondition } from "@/lib/types";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface EquipmentInput {
  // Puste przy dodawaniu — numer nadaje się automatycznie (domyślna wartość w bazie).
  // Podane przy edycji, gdy admin chce go ręcznie poprawić.
  inventoryNumber?: string;
  categoryId: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  warrantyEnd: string | null;
  technicalCondition: TechnicalCondition | null;
  purchasePrice: number | null;
  notes: string | null;
}

function toRow(input: EquipmentInput) {
  return {
    ...(input.inventoryNumber !== undefined
      ? { inventory_number: input.inventoryNumber.trim() }
      : {}),
    category_id: input.categoryId,
    name: input.name.trim(),
    manufacturer: input.manufacturer,
    model: input.model,
    serial_number: input.serialNumber,
    purchase_date: input.purchaseDate,
    warranty_end: input.warrantyEnd,
    technical_condition: input.technicalCondition,
    purchase_price: input.purchasePrice,
    notes: input.notes,
  };
}

export async function addEquipmentAction(
  input: EquipmentInput
): Promise<ActionResult<Equipment>> {
  const supabase = await createSupabaseServerClient();

  const { data: warehouse } = await supabase
    .from("locations")
    .select("id")
    .eq("is_warehouse", true)
    .single();

  if (!warehouse) {
    return { ok: false, error: "Nie znaleziono domyślnej lokalizacji magazynu." };
  }

  const { data, error } = await supabase
    .from("equipment")
    .insert({ ...toRow(input), status: "w_magazynie", location_id: warehouse.id })
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

export async function updateEquipmentStatusAction(
  id: string,
  status: EquipmentStatus
): Promise<ActionResult<undefined>> {
  const supabase = await createSupabaseServerClient();

  const { count: activeCount } = await supabase
    .from("assignments")
    .select("id", { count: "exact", head: true })
    .eq("equipment_id", id)
    .is("returned_at", null);

  const hasActiveAssignment = (activeCount ?? 0) > 0;

  if (status === "przydzielony" && !hasActiveAssignment) {
    return {
      ok: false,
      error: "Ten sprzęt nie ma aktywnego przydziału — użyj operacji „Przekaż sprzęt”, żeby go wydać.",
    };
  }
  if (status === "w_magazynie" && hasActiveAssignment) {
    return {
      ok: false,
      error: "Ten sprzęt ma aktywny przydział — użyj operacji „Przekaż sprzęt” (zwrot do magazynu).",
    };
  }

  const { error } = await supabase.from("equipment").update({ status }).eq("id", id);
  if (error) return { ok: false, error: "Nie udało się zmienić statusu." };

  revalidatePath("/sprzet");
  revalidatePath(`/sprzet/${id}`);
  revalidatePath("/pulpit");
  return { ok: true, data: undefined };
}

export async function deleteEquipmentAction(id: string): Promise<ActionResult<undefined>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("equipment").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error:
          "Nie można usunąć — ten sprzęt ma powiązane protokoły. Usuń najpierw te protokoły (zakładka Dokumenty na karcie sprzętu albo lista Protokoły), a potem spróbuj ponownie. Historia przydziałów sama w sobie nie blokuje usunięcia.",
      };
    }
    return { ok: false, error: "Nie udało się usunąć sprzętu." };
  }

  revalidatePath("/sprzet");
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
