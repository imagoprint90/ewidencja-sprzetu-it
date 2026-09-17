"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapEmployee } from "@/lib/supabase/mappers";
import type { Employee } from "@/lib/types";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function addEmployeeAction(input: {
  fullName: string;
  email: string | null;
  department: string;
  locationId: string;
}): Promise<ActionResult<Employee>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .insert({
      full_name: input.fullName.trim(),
      email: input.email,
      department: input.department.trim(),
      location_id: input.locationId,
    })
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: "Nie udało się dodać pracownika. Spróbuj ponownie." };
  }

  revalidatePath("/pracownicy");
  return { ok: true, data: mapEmployee(data) };
}

export async function updateEmployeeAction(
  id: string,
  input: { fullName: string; email: string | null; department: string; locationId: string }
): Promise<ActionResult<undefined>> {
  const supabase = await createSupabaseServerClient();

  const { data: before } = await supabase
    .from("employees")
    .select("location_id")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("employees")
    .update({
      full_name: input.fullName.trim(),
      email: input.email,
      department: input.department.trim(),
      location_id: input.locationId,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Nie udało się zapisać zmian." };
  }

  // Lokalizacja sprzętu podąża za lokalizacją pracownika — jeśli lokalizacja się zmieniła,
  // aktualizujemy też sprzęt aktualnie mu przydzielony, żeby dane pozostały spójne.
  if (before && before.location_id !== input.locationId) {
    const { data: activeAssignments } = await supabase
      .from("assignments")
      .select("equipment_id")
      .eq("employee_id", id)
      .is("returned_at", null);

    const equipmentIds = (activeAssignments ?? []).map((a) => a.equipment_id);
    if (equipmentIds.length > 0) {
      await supabase.from("equipment").update({ location_id: input.locationId }).in("id", equipmentIds);
      for (const eqId of equipmentIds) revalidatePath(`/sprzet/${eqId}`);
    }
  }

  revalidatePath("/pracownicy");
  revalidatePath(`/pracownicy/${id}`);
  revalidatePath("/sprzet");
  return { ok: true, data: undefined };
}

export async function setEmployeeActiveAction(
  id: string,
  isActive: boolean
): Promise<ActionResult<undefined>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("employees")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Nie udało się zmienić statusu pracownika." };
  }

  revalidatePath("/pracownicy");
  revalidatePath(`/pracownicy/${id}`);
  return { ok: true, data: undefined };
}
