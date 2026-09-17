"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { renderProtocolPdf, protocolPdfStoragePath } from "@/lib/pdf/render-protocol";
import { TECHNICAL_CONDITION_LABELS, type ProtocolSnapshot, type ProtocolType, type TechnicalCondition } from "@/lib/types";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export interface CreateProtocolInput {
  type: ProtocolType;
  equipmentIds: string[];
  previousEmployeeId: string | null;
  newEmployeeId: string | null;
  transferDate: string;
  city: string;
  condition: TechnicalCondition;
  notes: string | null;
}

async function generateAndStorePdf(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  protocolId: string,
  protocolNumber: string,
  snapshot: ProtocolSnapshot
): Promise<{ ok: boolean; error?: string }> {
  try {
    const buffer = await renderProtocolPdf(snapshot);
    const path = protocolPdfStoragePath(protocolNumber);
    const { error: uploadError } = await supabase.storage
      .from("protokoly")
      .upload(path, buffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      await supabase
        .from("protocols")
        .update({ pdf_status: "blad", pdf_error: uploadError.message })
        .eq("id", protocolId);
      return { ok: false, error: uploadError.message };
    }

    await supabase
      .from("protocols")
      .update({ pdf_status: "wygenerowany", pdf_path: path, pdf_error: null })
      .eq("id", protocolId);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nieznany błąd generowania PDF.";
    await supabase
      .from("protocols")
      .update({ pdf_status: "blad", pdf_error: message })
      .eq("id", protocolId);
    return { ok: false, error: message };
  }
}

export async function createProtocolAction(
  input: CreateProtocolInput
): Promise<ActionResult<{ protocolId: string; pdfGenerated: boolean }>> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Brak zalogowanego użytkownika." };

  const [{ data: profile }, { data: company }, { data: equipmentRows }, { data: employeeRows }] =
    await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      supabase.from("company_settings").select("*").eq("id", true).single(),
      supabase
        .from("equipment")
        .select("id, name, manufacturer, model, inventory_number, serial_number, category_id, categories(name)")
        .in("id", input.equipmentIds),
      supabase
        .from("employees")
        .select("id, full_name")
        .in(
          "id",
          [input.previousEmployeeId, input.newEmployeeId].filter((v): v is string => Boolean(v))
        ),
    ]);

  if (!company) return { ok: false, error: "Nie znaleziono danych firmy." };
  if (!equipmentRows || equipmentRows.length === 0) {
    return { ok: false, error: "Nie znaleziono sprzętu do protokołu." };
  }

  const employeeName = (id: string | null) =>
    id ? employeeRows?.find((e) => e.id === id)?.full_name ?? null : null;

  // Na protokole identyfikujemy sprzęt przez producenta i model (nie wewnętrzną nazwę
  // ewidencyjną) — numer seryjny jest już osobną kolumną w dokumencie.
  const equipmentDisplayName = (e: { name: string; manufacturer: string | null; model: string | null }) =>
    [e.manufacturer, e.model].filter(Boolean).join(" ") || e.name;

  const snapshot: ProtocolSnapshot = {
    protocolNumber: "", // uzupełnione po insercie (numer generowany przez bazę)
    type: input.type,
    companyName: company.name,
    companyAddress: company.address,
    companyNip: company.nip,
    city: input.city,
    issuedAt: input.transferDate,
    issuedByName: profile?.full_name ?? user.email ?? "Administrator",
    previousEmployeeName: employeeName(input.previousEmployeeId),
    newEmployeeName: employeeName(input.newEmployeeId),
    technicalConditionLabel: TECHNICAL_CONDITION_LABELS[input.condition],
    notes: input.notes,
    items: equipmentRows.map((e) => ({
      name: equipmentDisplayName(e),
      category: (e.categories as unknown as { name: string } | null)?.name ?? "—",
      inventoryNumber: e.inventory_number,
      serialNumber: e.serial_number,
    })),
  };

  const { data: protocolRow, error: insertError } = await supabase
    .from("protocols")
    .insert({
      type: input.type,
      issued_by: user.id,
      issued_by_name: snapshot.issuedByName,
      issued_at: input.transferDate,
      city: input.city,
      snapshot,
    })
    .select()
    .single();

  if (insertError || !protocolRow) {
    return { ok: false, error: "Nie udało się utworzyć protokołu." };
  }

  const finalSnapshot: ProtocolSnapshot = { ...snapshot, protocolNumber: protocolRow.protocol_number };
  await supabase.from("protocols").update({ snapshot: finalSnapshot }).eq("id", protocolRow.id);

  const { error: itemsError } = await supabase.from("protocol_items").insert(
    equipmentRows.map((e) => ({
      protocol_id: protocolRow.id,
      equipment_id: e.id,
      name_snapshot: equipmentDisplayName(e),
      category_snapshot: (e.categories as unknown as { name: string } | null)?.name ?? "—",
      inventory_number_snapshot: e.inventory_number,
      serial_number_snapshot: e.serial_number,
    }))
  );
  if (itemsError) {
    return { ok: false, error: "Nie udało się zapisać pozycji protokołu." };
  }

  const pdfResult = await generateAndStorePdf(supabase, protocolRow.id, protocolRow.protocol_number, finalSnapshot);

  revalidatePath("/protokoly");
  for (const id of input.equipmentIds) revalidatePath(`/sprzet/${id}`);

  return { ok: true, data: { protocolId: protocolRow.id, pdfGenerated: pdfResult.ok } };
}

export async function retryProtocolPdfAction(protocolId: string): Promise<ActionResult<{ pdfGenerated: boolean }>> {
  const supabase = await createSupabaseServerClient();

  const { data: row, error } = await supabase
    .from("protocols")
    .select("*")
    .eq("id", protocolId)
    .single();

  if (error || !row) {
    return { ok: false, error: "Nie znaleziono protokołu." };
  }

  // Ponowna próba korzysta z zamrożonej migawki danych zapisanej przy tworzeniu
  // protokołu — nie pobiera aktualnych danych z bazy, więc nie zmienia treści
  // dokumentu ani nie tworzy nowego numeru.
  const result = await generateAndStorePdf(supabase, row.id, row.protocol_number, row.snapshot);

  revalidatePath("/protokoly");
  return { ok: true, data: { pdfGenerated: result.ok } };
}

export async function getProtocolDownloadUrlAction(
  path: string
): Promise<ActionResult<{ url: string }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from("protokoly").createSignedUrl(path, 60);
  if (error || !data) {
    return { ok: false, error: "Nie udało się przygotować linku do pobrania." };
  }
  return { ok: true, data: { url: data.signedUrl } };
}

export async function uploadSignedScanAction(
  protocolId: string,
  protocolNumber: string,
  fileBase64: string,
  fileName: string
): Promise<ActionResult<undefined>> {
  const supabase = await createSupabaseServerClient();
  const ext = fileName.includes(".") ? fileName.split(".").pop() : "pdf";
  const path = `${protocolNumber}-podpisany.${ext}`;
  const buffer = Buffer.from(fileBase64, "base64");

  const { error: uploadError } = await supabase.storage
    .from("protokoly")
    .upload(path, buffer, { upsert: true });

  if (uploadError) {
    return { ok: false, error: "Nie udało się wgrać podpisanego skanu." };
  }

  const { error: updateError } = await supabase
    .from("protocols")
    .update({ signed_scan_path: path })
    .eq("id", protocolId);

  if (updateError) {
    return { ok: false, error: "Nie udało się zapisać informacji o skanie." };
  }

  revalidatePath("/protokoly");
  return { ok: true, data: undefined };
}
