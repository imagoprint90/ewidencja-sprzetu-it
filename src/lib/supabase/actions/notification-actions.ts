"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapNotificationSchedule, mapNotificationTemplate } from "@/lib/supabase/mappers";
import { sendSmtpEmail } from "@/lib/email";
import type { NotificationSchedule, NotificationTemplate } from "@/lib/types";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireAdmin(): Promise<
  | { ok: true; supabase: SupabaseClient; userId: string; userName: string }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Brak zalogowanego użytkownika." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "administrator") {
    return { ok: false, error: "Ta operacja wymaga uprawnień administratora." };
  }

  return { ok: true, supabase, userId: user.id, userName: profile.full_name };
}

export interface TemplateInput {
  name: string;
  subject: string;
  body: string;
}

export async function createTemplateAction(
  input: TemplateInput
): Promise<ActionResult<NotificationTemplate>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const { data, error } = await guard.supabase
    .from("notification_templates")
    .insert({ name: input.name.trim(), subject: input.subject.trim(), body: input.body })
    .select()
    .single();

  if (error || !data) return { ok: false, error: "Nie udało się zapisać szablonu." };

  revalidatePath("/powiadomienia");
  return { ok: true, data: mapNotificationTemplate(data) };
}

export async function updateTemplateAction(
  id: string,
  input: TemplateInput
): Promise<ActionResult<undefined>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const { error } = await guard.supabase
    .from("notification_templates")
    .update({ name: input.name.trim(), subject: input.subject.trim(), body: input.body })
    .eq("id", id);

  if (error) return { ok: false, error: "Nie udało się zapisać zmian." };

  revalidatePath("/powiadomienia");
  return { ok: true, data: undefined };
}

export async function deleteTemplateAction(id: string): Promise<ActionResult<undefined>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const { error } = await guard.supabase.from("notification_templates").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error: "Nie można usunąć — ten szablon jest używany w aktywnym harmonogramie. Usuń albo zmień najpierw harmonogram.",
      };
    }
    return { ok: false, error: "Nie udało się usunąć szablonu." };
  }

  revalidatePath("/powiadomienia");
  return { ok: true, data: undefined };
}

export interface SendNotificationInput {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  templateId: string | null;
  templateName: string | null;
  subject: string;
  body: string;
}

export async function sendNotificationAction(
  input: SendNotificationInput
): Promise<ActionResult<undefined>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  if (!input.employeeEmail.trim()) {
    return { ok: false, error: "Ten pracownik nie ma zapisanego adresu e-mail." };
  }

  const result = await sendSmtpEmail({ to: input.employeeEmail, subject: input.subject, text: input.body });

  await guard.supabase.from("notification_log").insert({
    employee_id: input.employeeId,
    employee_name_snapshot: input.employeeName,
    employee_email_snapshot: input.employeeEmail,
    template_id: input.templateId,
    template_name_snapshot: input.templateName,
    subject: input.subject,
    body: input.body,
    status: result.ok ? "wyslano" : "blad",
    error_message: result.ok ? null : (result.error ?? null),
    sent_by: guard.userId,
    sent_by_name: guard.userName,
  });
  revalidatePath("/powiadomienia");

  return result.ok ? { ok: true, data: undefined } : { ok: false, error: result.error ?? "Nie udało się wysłać." };
}

export interface ScheduleInput {
  name: string;
  templateId: string;
  employeeIds: string[];
  sendTime: string; // "HH:MM"
  daysOfWeek: number[];
  isActive: boolean;
}

function scheduleToRow(input: ScheduleInput) {
  return {
    name: input.name.trim(),
    template_id: input.templateId,
    employee_ids: input.employeeIds,
    send_time: input.sendTime,
    days_of_week: input.daysOfWeek,
    is_active: input.isActive,
  };
}

export async function createScheduleAction(
  input: ScheduleInput
): Promise<ActionResult<NotificationSchedule>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  if (input.employeeIds.length === 0) {
    return { ok: false, error: "Wybierz co najmniej jednego pracownika." };
  }
  if (input.daysOfWeek.length === 0) {
    return { ok: false, error: "Wybierz co najmniej jeden dzień tygodnia." };
  }

  const { data, error } = await guard.supabase
    .from("notification_schedules")
    .insert({ ...scheduleToRow(input), created_by: guard.userId })
    .select()
    .single();

  if (error || !data) return { ok: false, error: "Nie udało się zapisać harmonogramu." };

  revalidatePath("/powiadomienia");
  return { ok: true, data: mapNotificationSchedule(data) };
}

export async function updateScheduleAction(
  id: string,
  input: ScheduleInput
): Promise<ActionResult<undefined>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  if (input.employeeIds.length === 0) {
    return { ok: false, error: "Wybierz co najmniej jednego pracownika." };
  }
  if (input.daysOfWeek.length === 0) {
    return { ok: false, error: "Wybierz co najmniej jeden dzień tygodnia." };
  }

  const { error } = await guard.supabase
    .from("notification_schedules")
    .update(scheduleToRow(input))
    .eq("id", id);

  if (error) return { ok: false, error: "Nie udało się zapisać zmian." };

  revalidatePath("/powiadomienia");
  return { ok: true, data: undefined };
}

export async function setScheduleActiveAction(
  id: string,
  isActive: boolean
): Promise<ActionResult<undefined>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const { error } = await guard.supabase
    .from("notification_schedules")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { ok: false, error: "Nie udało się zmienić statusu harmonogramu." };

  revalidatePath("/powiadomienia");
  return { ok: true, data: undefined };
}

export async function deleteScheduleAction(id: string): Promise<ActionResult<undefined>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const { error } = await guard.supabase.from("notification_schedules").delete().eq("id", id);
  if (error) return { ok: false, error: "Nie udało się usunąć harmonogramu." };

  revalidatePath("/powiadomienia");
  return { ok: true, data: undefined };
}
