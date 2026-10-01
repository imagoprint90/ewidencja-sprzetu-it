"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendSmtpEmail } from "@/lib/email";
import { mapTicket, mapTicketAttachment, mapTicketComment } from "@/lib/supabase/mappers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Ticket, TicketAttachment, TicketComment, TicketPriority, TicketStatus } from "@/lib/types";
import { TICKET_WORKFLOW_STATUSES } from "@/lib/types";

const ATTACHMENT_BUCKET = "tickety-zalaczniki";
const ALLOWED_ATTACHMENT_EXTENSIONS = [
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "svg",
  "pdf", "doc", "docx", "xls", "xlsx", "txt", "csv", "zip",
];
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

interface TicketPermissionRow {
  role: string;
  full_name: string;
  can_create_tickets: boolean;
  can_edit_tickets: boolean;
  can_comment_tickets: boolean;
  can_change_ticket_status: boolean;
  can_change_ticket_priority: boolean;
  can_assign_tickets: boolean;
  can_close_tickets: boolean;
  can_admin_tickets: boolean;
}

type TicketPermissionFlag = Exclude<keyof TicketPermissionRow, "role" | "full_name">;

// Jedno miejsce sprawdzające konkretne uprawnienie ticketów (tak jak requireAdmin() w
// user-actions.ts, tylko sparametryzowane flagą) — daje czytelny komunikat błędu w UI.
// To TYLKO wygoda UX: prawdziwa granica bezpieczeństwa to RLS (migracja 0051), które i tak
// odrzuci zapis bez odpowiedniej flagi, nawet gdyby to sprawdzenie pominąć.
async function requireTicketPermission(flag: TicketPermissionFlag): Promise<
  | { ok: true; supabase: SupabaseClient; userId: string; fullName: string; isAdmin: boolean }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Brak zalogowanego użytkownika." };

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "role, full_name, can_create_tickets, can_edit_tickets, can_comment_tickets, can_change_ticket_status, can_change_ticket_priority, can_assign_tickets, can_close_tickets, can_admin_tickets"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return { ok: false, error: "Brak profilu użytkownika." };

  const isAdmin = profile.role === "administrator";
  const row = profile as TicketPermissionRow;
  if (!isAdmin && !row[flag]) {
    return { ok: false, error: "Brak uprawnień do wykonania tej operacji." };
  }

  return { ok: true, supabase, userId: user.id, fullName: profile.full_name, isAdmin };
}

// Najlepszy wysiłek — brak e-maila (niewypełniony SMTP, błąd dostawcy, konto bez adresu) nie
// może zablokować samego przydzielenia ticketu. Wynik (sukces albo powód błędu) jest zawsze
// zapisywany w historii zgłoszenia — service client, bo zwykli użytkownicy nie mają uprawnień
// insert na ticket_history (wpisy tworzy wyłącznie trigger albo, jak tutaj, ta funkcja).
async function notifyTicketAssignment(
  assigneeId: string,
  ticketId: string,
  ticketNumber: string,
  ticketTitle: string,
  actorId: string,
  actorName: string
): Promise<void> {
  const service = createSupabaseServiceClient();
  let logMessage: string;

  try {
    const { data: assignee } = await service
      .from("profiles")
      .select("email, full_name")
      .eq("id", assigneeId)
      .maybeSingle();

    if (!assignee?.email) {
      logMessage = `Nie wysłano — konto „${assignee?.full_name ?? "nieznane"}” nie ma zapisanego adresu e-mail.`;
    } else {
      const result = await sendSmtpEmail({
        to: assignee.email,
        subject: `Przydzielono Ci zgłoszenie ${ticketNumber}`,
        text: `Cześć ${assignee.full_name},\n\nPrzydzielono Ci zgłoszenie ${ticketNumber}: "${ticketTitle}".\n\nSzczegóły znajdziesz w systemie Ewidencja sprzętu IT, w zakładce Tickety.`,
      });
      logMessage = result.ok
        ? `Wysłano powiadomienie e-mail na adres ${assignee.email}.`
        : `Nie udało się wysłać powiadomienia e-mail na adres ${assignee.email}: ${result.error ?? "nieznany błąd"}.`;
    }
  } catch (err) {
    logMessage = `Nie udało się wysłać powiadomienia e-mail: ${err instanceof Error ? err.message : "nieznany błąd"}.`;
  }

  try {
    await service.from("ticket_history").insert({
      ticket_id: ticketId,
      actor_id: actorId,
      actor_name: actorName,
      action: "wyslano_powiadomienie",
      field: "email",
      new_value: logMessage,
    });
  } catch {
    // Brak wpisu w historii nie może zablokować przydzielenia.
  }
}

export interface TicketInput {
  title: string;
  description: string | null;
  categoryId: string | null;
  priority: TicketPriority;
  assignedTo: string | null;
}

export async function createTicketAction(input: TicketInput): Promise<ActionResult<Ticket>> {
  const guard = await requireTicketPermission("can_create_tickets");
  if (!guard.ok) return guard;

  const title = input.title.trim();
  if (!title) return { ok: false, error: "Tytuł zgłoszenia jest wymagany." };

  const { data, error } = await guard.supabase
    .from("tickets")
    .insert({
      title,
      description: input.description?.trim() || null,
      category_id: input.categoryId || null,
      priority: input.priority,
      created_by: guard.userId,
      assigned_to: input.assignedTo || null,
    })
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: "Nie udało się zapisać zgłoszenia. Spróbuj ponownie." };
  }

  if (input.assignedTo) {
    await notifyTicketAssignment(input.assignedTo, data.id, data.ticket_number, title, guard.userId, guard.fullName);
  }

  revalidatePath("/tickety");
  return { ok: true, data: mapTicket(data) };
}

export async function updateTicketDetailsAction(
  id: string,
  input: { title: string; description: string | null; categoryId: string | null }
): Promise<ActionResult<undefined>> {
  const guard = await requireTicketPermission("can_edit_tickets");
  if (!guard.ok) return guard;

  const title = input.title.trim();
  if (!title) return { ok: false, error: "Tytuł zgłoszenia jest wymagany." };

  const { error } = await guard.supabase
    .from("tickets")
    .update({ title, description: input.description?.trim() || null, category_id: input.categoryId || null })
    .eq("id", id);

  if (error) return { ok: false, error: "Nie udało się zapisać zmian." };

  revalidatePath("/tickety");
  revalidatePath(`/tickety/${id}`);
  return { ok: true, data: undefined };
}

// Tylko przejścia w trakcie obsługi (w_trakcie/oczekujace/rozwiazane) — "nowe" to tylko stan
// startowy, a "zamkniete" wymaga osobnego uprawnienia (patrz closeTicketAction/reopenTicketAction).
export async function changeTicketStatusAction(id: string, status: TicketStatus): Promise<ActionResult<undefined>> {
  if (!TICKET_WORKFLOW_STATUSES.includes(status)) {
    return { ok: false, error: "Nieprawidłowy status — użyj zamknięcia/otwarcia dla stanu „Zamknięte”." };
  }
  const guard = await requireTicketPermission("can_change_ticket_status");
  if (!guard.ok) return guard;

  const { error } = await guard.supabase.from("tickets").update({ status }).eq("id", id);
  if (error) return { ok: false, error: "Nie udało się zmienić statusu." };

  revalidatePath("/tickety");
  revalidatePath(`/tickety/${id}`);
  return { ok: true, data: undefined };
}

export async function updateTicketPriorityAction(id: string, priority: TicketPriority): Promise<ActionResult<undefined>> {
  const guard = await requireTicketPermission("can_change_ticket_priority");
  if (!guard.ok) return guard;

  const { error } = await guard.supabase.from("tickets").update({ priority }).eq("id", id);
  if (error) return { ok: false, error: "Nie udało się zmienić priorytetu." };

  revalidatePath("/tickety");
  revalidatePath(`/tickety/${id}`);
  return { ok: true, data: undefined };
}

export async function assignTicketAction(id: string, userId: string | null): Promise<ActionResult<undefined>> {
  const guard = await requireTicketPermission("can_assign_tickets");
  if (!guard.ok) return guard;

  const { data, error } = await guard.supabase
    .from("tickets")
    .update({ assigned_to: userId })
    .eq("id", id)
    .select("ticket_number, title")
    .single();

  if (error || !data) return { ok: false, error: "Nie udało się przydzielić zgłoszenia." };

  if (userId) {
    await notifyTicketAssignment(userId, id, data.ticket_number, data.title, guard.userId, guard.fullName);
  }

  revalidatePath("/tickety");
  revalidatePath(`/tickety/${id}`);
  return { ok: true, data: undefined };
}

export async function closeTicketAction(id: string): Promise<ActionResult<undefined>> {
  const guard = await requireTicketPermission("can_close_tickets");
  if (!guard.ok) return guard;

  const { error } = await guard.supabase.from("tickets").update({ status: "zamkniete" }).eq("id", id);
  if (error) return { ok: false, error: "Nie udało się zamknąć zgłoszenia." };

  revalidatePath("/tickety");
  revalidatePath(`/tickety/${id}`);
  return { ok: true, data: undefined };
}

// Ponowne otwarcie wraca do "w_trakcie" (wznowienie obsługi), niezależnie od tego, czy ticket
// był wcześniej rozwiązany, czy zamknięty bez rozwiązania.
export async function reopenTicketAction(id: string): Promise<ActionResult<undefined>> {
  const guard = await requireTicketPermission("can_close_tickets");
  if (!guard.ok) return guard;

  const { error } = await guard.supabase.from("tickets").update({ status: "w_trakcie" }).eq("id", id);
  if (error) return { ok: false, error: "Nie udało się ponownie otworzyć zgłoszenia." };

  revalidatePath("/tickety");
  revalidatePath(`/tickety/${id}`);
  return { ok: true, data: undefined };
}

export async function setTicketArchivedAction(id: string, isArchived: boolean): Promise<ActionResult<undefined>> {
  const guard = await requireTicketPermission("can_admin_tickets");
  if (!guard.ok) return guard;

  const { error } = await guard.supabase.from("tickets").update({ is_archived: isArchived }).eq("id", id);
  if (error) return { ok: false, error: "Nie udało się zapisać zmiany." };

  revalidatePath("/tickety");
  revalidatePath(`/tickety/${id}`);
  return { ok: true, data: undefined };
}

export async function addTicketCommentAction(id: string, body: string): Promise<ActionResult<TicketComment>> {
  const guard = await requireTicketPermission("can_comment_tickets");
  if (!guard.ok) return guard;

  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Komentarz nie może być pusty." };

  const { data, error } = await guard.supabase
    .from("ticket_comments")
    .insert({ ticket_id: id, author_id: guard.userId, author_name: guard.fullName, body: trimmed })
    .select()
    .single();

  if (error || !data) return { ok: false, error: "Nie udało się dodać komentarza." };

  revalidatePath(`/tickety/${id}`);
  return { ok: true, data: mapTicketComment(data) };
}

// ------------------------------------------------------------------------------------------
// Kategorie zgłoszeń (osobny byt od kategorii sprzętu) — zarządzane wewnątrz modułu Tickety,
// wyłącznie przez uprawnienie "Administracja modułem".
// ------------------------------------------------------------------------------------------

export async function createTicketCategoryAction(name: string): Promise<ActionResult<undefined>> {
  const guard = await requireTicketPermission("can_admin_tickets");
  if (!guard.ok) return guard;

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Nazwa kategorii nie może być pusta." };

  const { data: last } = await guard.supabase
    .from("ticket_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await guard.supabase
    .from("ticket_categories")
    .insert({ name: trimmed, sort_order: (last?.sort_order ?? 0) + 1 });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Kategoria o tej nazwie już istnieje." };
    return { ok: false, error: "Nie udało się dodać kategorii." };
  }

  revalidatePath("/tickety");
  return { ok: true, data: undefined };
}

export async function renameTicketCategoryAction(id: string, name: string): Promise<ActionResult<undefined>> {
  const guard = await requireTicketPermission("can_admin_tickets");
  if (!guard.ok) return guard;

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Nazwa kategorii nie może być pusta." };

  const { error } = await guard.supabase.from("ticket_categories").update({ name: trimmed }).eq("id", id);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Kategoria o tej nazwie już istnieje." };
    return { ok: false, error: "Nie udało się zmienić nazwy kategorii." };
  }

  revalidatePath("/tickety");
  return { ok: true, data: undefined };
}

export async function setTicketCategoryArchivedAction(id: string, isArchived: boolean): Promise<ActionResult<undefined>> {
  const guard = await requireTicketPermission("can_admin_tickets");
  if (!guard.ok) return guard;

  const { error } = await guard.supabase.from("ticket_categories").update({ is_archived: isArchived }).eq("id", id);
  if (error) return { ok: false, error: "Nie udało się zapisać zmiany." };

  revalidatePath("/tickety");
  return { ok: true, data: undefined };
}

// ids = nowa kolejność (przeciągnij i upuść w panelu kategorii) — ten sam wzorzec co
// reorderCategoriesAction dla kategorii sprzętu.
export async function reorderTicketCategoriesAction(ids: string[]): Promise<ActionResult<undefined>> {
  const guard = await requireTicketPermission("can_admin_tickets");
  if (!guard.ok) return guard;

  const results = await Promise.all(
    ids.map((id, i) => guard.supabase.from("ticket_categories").update({ sort_order: i + 1 }).eq("id", id))
  );
  if (results.some((r) => r.error)) {
    return { ok: false, error: "Nie udało się zapisać kolejności kategorii." };
  }

  revalidatePath("/tickety");
  return { ok: true, data: undefined };
}

// ------------------------------------------------------------------------------------------
// Załączniki — wiele plików na zgłoszenie (np. zrzuty ekranu), w osobnym prywatnym buckecie
// Storage. Kto może dodawać: każdy, kto może komentować/edytować/administrować ticketami (te
// same trzy flagi co RLS na ticket_attachments w migracji 0052) — nie ma tu jednej "właściwej"
// flagi do użycia z requireTicketPermission, więc sprawdzenie jest inline.
// ------------------------------------------------------------------------------------------

export async function uploadTicketAttachmentAction(
  ticketId: string,
  fileBase64: string,
  fileName: string,
  contentType: string
): Promise<ActionResult<TicketAttachment>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Brak zalogowanego użytkownika." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, can_comment_tickets, can_edit_tickets, can_admin_tickets")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return { ok: false, error: "Brak profilu użytkownika." };

  const isAdmin = profile.role === "administrator";
  if (!isAdmin && !profile.can_comment_tickets && !profile.can_edit_tickets && !profile.can_admin_tickets) {
    return { ok: false, error: "Brak uprawnień do dodawania załączników." };
  }

  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(extension)) {
    return {
      ok: false,
      error: "Niedozwolony typ pliku. Dozwolone: obrazy, PDF, dokumenty biurowe, TXT/CSV, ZIP.",
    };
  }

  const buffer = Buffer.from(fileBase64, "base64");
  if (buffer.byteLength > MAX_ATTACHMENT_SIZE) {
    return { ok: false, error: "Plik jest za duży (maks. 10 MB)." };
  }

  const safeName = fileName.replace(/[^\w.\-]+/g, "_");
  const storagePath = `${ticketId}/${randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: false });
  if (uploadError) return { ok: false, error: "Nie udało się wgrać pliku." };

  const { data, error } = await supabase
    .from("ticket_attachments")
    .insert({
      ticket_id: ticketId,
      file_path: storagePath,
      file_name: fileName,
      file_size: buffer.byteLength,
      content_type: contentType,
      uploaded_by: user.id,
      uploaded_by_name: profile.full_name,
    })
    .select()
    .single();

  if (error || !data) {
    // Sprzątamy po sobie — nie zostawiamy w Storage pliku, którego nic nie zna.
    await supabase.storage.from(ATTACHMENT_BUCKET).remove([storagePath]);
    return { ok: false, error: "Nie udało się zapisać załącznika." };
  }

  revalidatePath(`/tickety/${ticketId}`);
  return { ok: true, data: mapTicketAttachment(data) };
}

export async function deleteTicketAttachmentAction(id: string): Promise<ActionResult<undefined>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Brak zalogowanego użytkownika." };

  // RLS (uploaded_by = auth.uid() albo can_edit_tickets/can_admin_tickets) decyduje, czy wiersz
  // w ogóle zostanie usunięty — .select() po delete pozwala to tu rozróżnić od "nie istnieje".
  const { data: deleted, error } = await supabase
    .from("ticket_attachments")
    .delete()
    .eq("id", id)
    .select("ticket_id, file_path")
    .maybeSingle();

  if (error) return { ok: false, error: "Nie udało się usunąć załącznika." };
  if (!deleted) {
    return { ok: false, error: "Brak uprawnień do usunięcia tego załącznika albo załącznik już nie istnieje." };
  }

  await supabase.storage.from(ATTACHMENT_BUCKET).remove([deleted.file_path]);

  revalidatePath(`/tickety/${deleted.ticket_id}`);
  return { ok: true, data: undefined };
}

export async function getTicketAttachmentDownloadUrlAction(path: string): Promise<ActionResult<{ url: string }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(path, 60);
  if (error || !data) return { ok: false, error: "Nie udało się przygotować linku do pobrania." };
  return { ok: true, data: { url: data.signedUrl } };
}
