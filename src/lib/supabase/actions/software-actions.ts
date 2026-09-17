"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LicenseType } from "@/lib/types";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function addSoftwareProductAction(input: {
  name: string;
  version: string | null;
  notes: string | null;
}): Promise<ActionResult<undefined>> {
  if (!input.name.trim()) return { ok: false, error: "Nazwa produktu jest wymagana." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("software_products").insert({
    name: input.name.trim(),
    version: input.version,
    notes: input.notes,
  });

  if (error) return { ok: false, error: "Nie udało się dodać produktu." };
  revalidatePath("/oprogramowanie");
  return { ok: true, data: undefined };
}

export async function addSoftwareLicenseAction(input: {
  productId: string;
  licenseType: LicenseType;
  seatsTotal: number;
  validUntil: string | null;
  notes: string | null;
}): Promise<ActionResult<undefined>> {
  if (!input.productId) return { ok: false, error: "Wybierz produkt." };
  if (input.seatsTotal < 1) return { ok: false, error: "Liczba stanowisk musi być większa od zera." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("software_licenses").insert({
    product_id: input.productId,
    license_type: input.licenseType,
    seats_total: input.seatsTotal,
    valid_until: input.validUntil,
    notes: input.notes,
  });

  if (error) return { ok: false, error: "Nie udało się dodać licencji." };
  revalidatePath("/oprogramowanie");
  return { ok: true, data: undefined };
}

export async function updateSoftwareProductAction(
  id: string,
  input: { name: string; version: string | null; notes: string | null }
): Promise<ActionResult<undefined>> {
  if (!input.name.trim()) return { ok: false, error: "Nazwa produktu jest wymagana." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("software_products")
    .update({ name: input.name.trim(), version: input.version, notes: input.notes })
    .eq("id", id);

  if (error) return { ok: false, error: "Nie udało się zapisać zmian produktu." };
  revalidatePath("/oprogramowanie");
  return { ok: true, data: undefined };
}

export async function updateSoftwareLicenseAction(
  id: string,
  input: { seatsTotal: number; validUntil: string | null; notes: string | null }
): Promise<ActionResult<undefined>> {
  if (input.seatsTotal < 1) return { ok: false, error: "Liczba stanowisk musi być większa od zera." };

  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from("software_license_assignments")
    .select("id", { count: "exact", head: true })
    .eq("license_id", id);

  if ((count ?? 0) > input.seatsTotal) {
    return {
      ok: false,
      error: `Nie można zmniejszyć liczby stanowisk poniżej liczby aktualnych przypisań (${count}). Usuń najpierw część przypisań.`,
    };
  }

  const { error } = await supabase
    .from("software_licenses")
    .update({ seats_total: input.seatsTotal, valid_until: input.validUntil, notes: input.notes })
    .eq("id", id);

  if (error) return { ok: false, error: "Nie udało się zapisać zmian licencji." };
  revalidatePath("/oprogramowanie");
  revalidatePath("/pulpit");
  return { ok: true, data: undefined };
}

export async function assignLicenseAction(input: {
  licenseId: string;
  equipmentId: string | null;
  employeeId: string | null;
}): Promise<ActionResult<undefined>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("software_license_assignments").insert({
    license_id: input.licenseId,
    equipment_id: input.equipmentId,
    employee_id: input.employeeId,
  });

  if (error) {
    // Wyzwalacz bazy danych zwraca już czytelny polski komunikat (limit stanowisk,
    // niezgodność typu licencji z celem przypisania) — pokazujemy go wprost.
    return { ok: false, error: error.message.replace(/^.*?: /, "") };
  }

  revalidatePath("/oprogramowanie");
  revalidatePath("/sprzet");
  revalidatePath("/pracownicy");
  return { ok: true, data: undefined };
}

export async function removeLicenseAssignmentAction(id: string): Promise<ActionResult<undefined>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("software_license_assignments").delete().eq("id", id);
  if (error) return { ok: false, error: "Nie udało się usunąć przypisania." };
  revalidatePath("/oprogramowanie");
  revalidatePath("/sprzet");
  revalidatePath("/pracownicy");
  return { ok: true, data: undefined };
}

export async function addInstalledSoftwareAction(input: {
  equipmentId: string;
  softwareProductId: string;
  notes: string | null;
}): Promise<ActionResult<undefined>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("equipment_installed_software").insert({
    equipment_id: input.equipmentId,
    software_product_id: input.softwareProductId,
    notes: input.notes,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "To oprogramowanie jest już oznaczone jako zainstalowane na tym sprzęcie." };
    }
    return { ok: false, error: "Nie udało się dodać oprogramowania." };
  }

  revalidatePath(`/sprzet/${input.equipmentId}`);
  return { ok: true, data: undefined };
}

export async function removeInstalledSoftwareAction(
  id: string,
  equipmentId: string
): Promise<ActionResult<undefined>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("equipment_installed_software").delete().eq("id", id);
  if (error) return { ok: false, error: "Nie udało się usunąć oprogramowania." };
  revalidatePath(`/sprzet/${equipmentId}`);
  return { ok: true, data: undefined };
}
