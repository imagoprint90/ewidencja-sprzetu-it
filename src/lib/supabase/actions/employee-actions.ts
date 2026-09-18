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
  phone: string | null;
  department: string | null;
  locationId: string | null;
}): Promise<ActionResult<Employee>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .insert({
      full_name: input.fullName.trim(),
      email: input.email,
      phone: input.phone,
      department: input.department,
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
  input: {
    fullName: string;
    email: string | null;
    phone: string | null;
    department: string | null;
    locationId: string | null;
  }
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
      phone: input.phone,
      department: input.department,
      location_id: input.locationId,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Nie udało się zapisać zmian." };
  }

  // Lokalizacja sprzętu podąża za lokalizacją pracownika — jeśli lokalizacja się zmieniła na
  // inną konkretną lokalizację, aktualizujemy też sprzęt aktualnie mu przydzielony. Gdy nową
  // wartością jest "brak lokalizacji", celowo nie ruszamy lokalizacji sprzętu (nie ma na co
  // ją zmienić — sprzęt zawsze musi mieć jakąś lokalizację).
  if (input.locationId && before && before.location_id !== input.locationId) {
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

export async function deleteEmployeeAction(id: string): Promise<ActionResult<undefined>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("employees").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error:
          "Nie można usunąć — ten pracownik ma historię przydziałów sprzętu. Jeśli chcesz tylko ukryć go z list wyboru, użyj dezaktywacji zamiast usuwania — historia zostanie zachowana.",
      };
    }
    return { ok: false, error: "Nie udało się usunąć pracownika." };
  }

  revalidatePath("/pracownicy");
  return { ok: true, data: undefined };
}

export interface EmployeeCsvRow {
  fullName: string;
  email: string;
  phone: string;
  department: string;
  locationName: string;
}

export interface EmployeeImportError {
  row: number;
  reason: string;
}

export async function importEmployeesAction(
  rows: EmployeeCsvRow[]
): Promise<ActionResult<{ imported: number; errors: EmployeeImportError[] }>> {
  const supabase = await createSupabaseServerClient();

  const { data: locations } = await supabase.from("locations").select("id, name, is_archived");
  const normalize = (s: string) => s.trim().toLowerCase();
  const locationByName = new Map(
    (locations ?? []).filter((l) => !l.is_archived).map((l) => [normalize(l.name), l.id])
  );

  const errors: EmployeeImportError[] = [];
  let imported = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // +1 za nagłówek, +1 bo liczymy od 1
    const fullName = rows[i].fullName.trim();
    const department = rows[i].department.trim();
    const locationName = rows[i].locationName.trim();
    const email = rows[i].email.trim();
    const phone = rows[i].phone.trim();

    if (!fullName) {
      errors.push({ row: rowNumber, reason: "brak imienia i nazwiska" });
      continue;
    }

    // Dział i lokalizacja są opcjonalne — puste pole po prostu zostaje bez wartości.
    // Podaną, ale nierozpoznaną lokalizację traktujemy jako błąd (żeby literówka w nazwie
    // nie zniknęła bez śladu), a nie jako "brak lokalizacji".
    let locationId: string | null = null;
    if (locationName) {
      const found = locationByName.get(normalize(locationName));
      if (!found) {
        errors.push({ row: rowNumber, reason: `nieznana lokalizacja „${locationName}”` });
        continue;
      }
      locationId = found;
    }

    const { error } = await supabase.from("employees").insert({
      full_name: fullName,
      email: email || null,
      phone: phone || null,
      department: department || null,
      location_id: locationId,
    });

    if (error) {
      errors.push({ row: rowNumber, reason: "błąd zapisu w bazie" });
      continue;
    }
    imported += 1;
  }

  revalidatePath("/pracownicy");
  return { ok: true, data: { imported, errors } };
}
