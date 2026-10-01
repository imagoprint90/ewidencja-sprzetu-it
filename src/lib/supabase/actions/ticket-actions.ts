"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendSmtpEmail } from "@/lib/email";
import { mapTicket, mapTicketComment } from "@/lib/supabase/mappers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Ticket, TicketComment, TicketPriority, TicketStatus } from "@/lib/types";
import { TICKET_WORKFLOW_STATUSES } from "@/lib/types";

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
// może zablokować samego przydzielenia ticketu, więc błędy są tu celowo wyciszane.
async function notifyTicketAssignment(assigneeId: string, ticketNumber: string, ticketTitle: string) {
  try {
    const service = createSupabaseServiceClient();
    const { data: assignee } = await service
      .from("profiles")
      .select("email, full_name")
      .eq("id", assigneeId)
      .maybeSingle();
    if (!assignee?.email) return;
    await sendSmtpEmail({
      to: assignee.email,
      subject: `Przydzielono Ci zgłoszenie ${ticketNumber}`,
      text: `Cześć ${assignee.full_name},\n\nPrzydzielono Ci zgłoszenie ${ticketNumber}: "${ticketTitle}".\n\nSzczegóły znajdziesz w systemie Ewidencja sprzętu IT, w zakładce Tickety.`,
    });
  } catch {
    // Celowo ignorowane — patrz komentarz funkcji.
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
    await notifyTicketAssignment(input.assignedTo, data.ticket_number, title);
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
    await notifyTicketAssignment(userId, data.ticket_number, data.title);
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
