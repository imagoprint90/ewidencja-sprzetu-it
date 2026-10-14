"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapEquipmentDocument } from "@/lib/supabase/mappers";
import type { EquipmentDocument } from "@/lib/types";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

// Pliki leżą w istniejącym prywatnym buckecie faktur (polityki Storage z migracji 0028).
const BUCKET = "faktury";
const ALLOWED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "webp", "gif", "doc", "docx", "xls", "xlsx", "txt"];
const MAX_SIZE = 3 * 1024 * 1024; // patrz serverActions.bodySizeLimit w next.config.ts

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
};

// equipment.purchase_invoice_path = "pierwszy dokument" — z niego korzysta kolumna FV na liście
// Sprzęt. Po dodaniu/usunięciu dokumentu ustawiamy go na najstarszy pozostały albo czyścimy.
async function syncPrimaryPath(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  equipmentId: string
) {
  const { data: first } = await supabase
    .from("equipment_documents")
    .select("file_path")
    .eq("equipment_id", equipmentId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  await supabase
    .from("equipment")
    .update({ purchase_invoice_path: first?.file_path ?? null })
    .eq("id", equipmentId);
}

// Dla okien, które nie dostają listy z serwera razem ze stroną (np. edycja z listy Sprzęt).
export async function listEquipmentDocumentsAction(equipmentId: string): Promise<ActionResult<EquipmentDocument[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("equipment_documents")
    .select("*")
    .eq("equipment_id", equipmentId)
    .order("created_at");
  if (error) return { ok: false, error: "Nie udało się wczytać dokumentów." };
  return { ok: true, data: (data ?? []).map(mapEquipmentDocument) };
}

export async function uploadEquipmentDocumentAction(
  equipmentId: string,
  fileBase64: string,
  fileName: string
): Promise<ActionResult<EquipmentDocument>> {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { ok: false, error: "Niedozwolony typ pliku. Dozwolone: PDF, obrazy, Word, Excel, TXT." };
  }
  const buffer = Buffer.from(fileBase64, "base64");
  if (buffer.byteLength > MAX_SIZE) return { ok: false, error: "Plik jest za duży (maks. 3 MB)." };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Brak zalogowanego użytkownika." };
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();

  const path = `dokumenty/${equipmentId}/${randomUUID()}-${fileName.replace(/[^\w.\-]+/g, "_")}`;
  const contentType = CONTENT_TYPES[extension];

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: false });
  if (uploadError) return { ok: false, error: "Nie udało się wgrać pliku." };

  const { data, error } = await supabase
    .from("equipment_documents")
    .insert({
      equipment_id: equipmentId,
      file_path: path,
      file_name: fileName,
      file_size: buffer.byteLength,
      content_type: contentType,
      uploaded_by_name: profile?.full_name ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    // Sprzątamy po sobie — nie zostawiamy w Storage pliku, którego nic nie zna.
    await supabase.storage.from(BUCKET).remove([path]);
    return {
      ok: false,
      error: "Nie udało się zapisać dokumentu (czy uruchomiono migrację 0055 i masz uprawnienia do edycji sprzętu?).",
    };
  }

  await syncPrimaryPath(supabase, equipmentId);

  revalidatePath("/sprzet");
  revalidatePath(`/sprzet/${equipmentId}`);
  return { ok: true, data: mapEquipmentDocument(data) };
}

export async function deleteEquipmentDocumentAction(id: string): Promise<ActionResult<undefined>> {
  const supabase = await createSupabaseServerClient();

  // .select() po delete pozwala odróżnić "RLS nie pozwoliło" od "usunięto" (brak wiersza = brak zmiany).
  const { data: deleted, error } = await supabase
    .from("equipment_documents")
    .delete()
    .eq("id", id)
    .select("equipment_id, file_path")
    .maybeSingle();

  if (error) return { ok: false, error: "Nie udało się usunąć dokumentu." };
  if (!deleted) return { ok: false, error: "Brak uprawnień do usunięcia tego dokumentu albo już nie istnieje." };

  await supabase.storage.from(BUCKET).remove([deleted.file_path]);
  await syncPrimaryPath(supabase, deleted.equipment_id);

  revalidatePath("/sprzet");
  revalidatePath(`/sprzet/${deleted.equipment_id}`);
  return { ok: true, data: undefined };
}

export async function getEquipmentDocumentUrlAction(path: string): Promise<ActionResult<{ url: string }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error || !data) return { ok: false, error: "Nie udało się przygotować linku do pliku." };
  return { ok: true, data: { url: data.signedUrl } };
}
