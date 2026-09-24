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

export interface SoftwareCsvRow {
  name: string;
  version: string;
  notes: string;
}

export async function importSoftwareProductsAction(
  rows: SoftwareCsvRow[]
): Promise<ActionResult<{ imported: number; skipped: { row: number; reason: string }[] }>> {
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase.from("software_products").select("name, version");

  const key = (name: string, version: string) => `${name.trim().toLowerCase()}|${version.trim().toLowerCase()}`;
  const seen = new Set((existing ?? []).map((p) => key(p.name, p.version ?? "")));

  const skipped: { row: number; reason: string }[] = [];
  const toInsert: { name: string; version: string | null; notes: string | null }[] = [];

  rows.forEach((r, i) => {
    const rowNumber = i + 2;
    const name = r.name.trim();
    const version = r.version.trim();
    if (!name) {
      skipped.push({ row: rowNumber, reason: "brak nazwy" });
      return;
    }
    const k = key(name, version);
    if (seen.has(k)) {
      skipped.push({ row: rowNumber, reason: "produkt już istnieje" });
      return;
    }
    seen.add(k);
    toInsert.push({ name, version: version || null, notes: r.notes.trim() || null });
  });

  if (toInsert.length > 0) {
    const { error } = await supabase.from("software_products").insert(toInsert);
    if (error) return { ok: false, error: "Nie udało się zapisać produktów w bazie." };
  }

  revalidatePath("/oprogramowanie");
  return { ok: true, data: { imported: toInsert.length, skipped } };
}

export async function addSoftwareLicenseAction(input: {
  productId: string;
  licenseType: LicenseType;
  seatsTotal: number;
  validUntil: string | null;
  purchaseDate: string | null;
  notes: string | null;
}): Promise<ActionResult<{ id: string }>> {
  if (!input.productId) return { ok: false, error: "Wybierz produkt." };
  if (input.seatsTotal < 1) return { ok: false, error: "Liczba stanowisk musi być większa od zera." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("software_licenses")
    .insert({
      product_id: input.productId,
      license_type: input.licenseType,
      seats_total: input.seatsTotal,
      valid_until: input.validUntil,
      purchase_date: input.purchaseDate,
      notes: input.notes,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: "Nie udało się dodać licencji." };
  revalidatePath("/oprogramowanie");
  return { ok: true, data: { id: data.id } };
}

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return profile?.role === "administrator" ? supabase : null;
}

// Klucz licencji: tabela license_keys jest dostępna wyłącznie dla administratora (RLS), a
// klucz pobieramy dopiero na żądanie — nie jest częścią listy licencji.
export async function getLicenseKeyAction(licenseId: string): Promise<ActionResult<{ key: string | null }>> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Ta operacja wymaga uprawnień administratora." };
  const { data } = await supabase.from("license_keys").select("license_key").eq("license_id", licenseId).maybeSingle();
  return { ok: true, data: { key: data?.license_key ?? null } };
}

export async function setLicenseKeyAction(licenseId: string, key: string): Promise<ActionResult<undefined>> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Ta operacja wymaga uprawnień administratora." };
  const trimmed = key.trim();
  if (!trimmed) {
    await supabase.from("license_keys").delete().eq("license_id", licenseId);
  } else {
    const { error } = await supabase
      .from("license_keys")
      .upsert({ license_id: licenseId, license_key: trimmed, updated_at: new Date().toISOString() });
    if (error) return { ok: false, error: "Nie udało się zapisać klucza." };
  }
  revalidatePath("/oprogramowanie");
  return { ok: true, data: undefined };
}

export async function uploadLicenseInvoiceAction(
  licenseId: string,
  fileBase64: string,
  fileName: string
): Promise<ActionResult<undefined>> {
  if (!fileName.toLowerCase().endsWith(".pdf")) return { ok: false, error: "Faktura musi być plikiem PDF." };
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Ta operacja wymaga uprawnień administratora." };

  const path = `licencje/${licenseId}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("faktury")
    .upload(path, Buffer.from(fileBase64, "base64"), { contentType: "application/pdf", upsert: true });
  if (uploadError) return { ok: false, error: "Nie udało się wgrać faktury." };

  const { error } = await supabase.from("software_licenses").update({ invoice_path: path }).eq("id", licenseId);
  if (error) {
    await supabase.storage.from("faktury").remove([path]);
    return { ok: false, error: "Nie udało się zapisać faktury przy licencji." };
  }
  revalidatePath("/oprogramowanie");
  return { ok: true, data: undefined };
}

export async function deleteLicenseInvoiceAction(licenseId: string): Promise<ActionResult<undefined>> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Ta operacja wymaga uprawnień administratora." };
  const { data } = await supabase.from("software_licenses").select("invoice_path").eq("id", licenseId).single();
  const { error } = await supabase.from("software_licenses").update({ invoice_path: null }).eq("id", licenseId);
  if (error) return { ok: false, error: "Nie udało się usunąć faktury." };
  if (data?.invoice_path) await supabase.storage.from("faktury").remove([data.invoice_path]);
  revalidatePath("/oprogramowanie");
  return { ok: true, data: undefined };
}

export async function getLicenseInvoiceUrlAction(path: string): Promise<ActionResult<{ url: string }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from("faktury").createSignedUrl(path, 60);
  if (error || !data) return { ok: false, error: "Nie udało się przygotować linku do pobrania." };
  return { ok: true, data: { url: data.signedUrl } };
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
  input: { seatsTotal: number; validUntil: string | null; purchaseDate: string | null; notes: string | null }
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
    .update({
      seats_total: input.seatsTotal,
      valid_until: input.validUntil,
      purchase_date: input.purchaseDate,
      notes: input.notes,
    })
    .eq("id", id);

  if (error) return { ok: false, error: "Nie udało się zapisać zmian licencji." };
  revalidatePath("/oprogramowanie");
  revalidatePath("/pulpit");
  return { ok: true, data: undefined };
}

export async function deleteSoftwareProductAction(id: string): Promise<ActionResult<undefined>> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Ta operacja wymaga uprawnień administratora." };

  const { count } = await supabase
    .from("software_licenses")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);
  if ((count ?? 0) > 0) {
    return { ok: false, error: "Nie można usunąć produktu, który ma licencje — usuń najpierw jego licencje." };
  }

  const { error } = await supabase.from("software_products").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error: "Nie można usunąć produktu — jest zarejestrowany jako zainstalowany na sprzęcie. Usuń go najpierw z kart sprzętu.",
      };
    }
    return { ok: false, error: "Nie udało się usunąć produktu." };
  }

  revalidatePath("/oprogramowanie");
  return { ok: true, data: undefined };
}

export async function deleteSoftwareLicenseAction(id: string): Promise<ActionResult<undefined>> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Ta operacja wymaga uprawnień administratora." };

  const { count } = await supabase
    .from("software_license_assignments")
    .select("id", { count: "exact", head: true })
    .eq("license_id", id);
  if ((count ?? 0) > 0) {
    return { ok: false, error: "Nie można usunąć licencji, która jest przydzielona — usuń najpierw przypisania." };
  }

  const { data: license } = await supabase.from("software_licenses").select("invoice_path").eq("id", id).single();
  const { error } = await supabase.from("software_licenses").delete().eq("id", id);
  if (error) return { ok: false, error: "Nie udało się usunąć licencji." };
  if (license?.invoice_path) await supabase.storage.from("faktury").remove([license.invoice_path]);

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
