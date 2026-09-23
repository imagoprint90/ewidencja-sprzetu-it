"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapNotificationTemplate } from "@/lib/supabase/mappers";
import type { NotificationTemplate } from "@/lib/types";

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
  if (error) return { ok: false, error: "Nie udało się usunąć szablonu." };

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

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM_EMAIL;

  async function logAndReturn(status: "wyslano" | "blad", errorMessage: string | null): Promise<ActionResult<undefined>> {
    if (!guard.ok) return { ok: false, error: "Brak zalogowanego użytkownika." };
    await guard.supabase.from("notification_log").insert({
      employee_id: input.employeeId,
      employee_name_snapshot: input.employeeName,
      employee_email_snapshot: input.employeeEmail,
      template_id: input.templateId,
      template_name_snapshot: input.templateName,
      subject: input.subject,
      body: input.body,
      status,
      error_message: errorMessage,
      sent_by: guard.userId,
      sent_by_name: guard.userName,
    });
    revalidatePath("/powiadomienia");
    return errorMessage ? { ok: false, error: errorMessage } : { ok: true, data: undefined };
  }

  if (!host || !port || !user || !password || !from) {
    return logAndReturn(
      "blad",
      "Wysyłka mailowa nie jest jeszcze skonfigurowana — uzupełnij zmienne środowiskowe SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD i SMTP_FROM_EMAIL."
    );
  }

  try {
    const portNumber = Number(port);
    // Port 465 = szyfrowanie od razu (SSL/TLS), inne porty (np. 587) = STARTTLS.
    // Można to też wymusić jawnie zmienną SMTP_SECURE=true, gdyby dostawca odbiegał od normy.
    const secure = process.env.SMTP_SECURE === "true" || portNumber === 465;

    const transporter = nodemailer.createTransport({
      host,
      port: portNumber,
      secure,
      auth: { user, pass: password },
    });

    await transporter.sendMail({
      from,
      to: input.employeeEmail,
      subject: input.subject,
      text: input.body,
    });

    return logAndReturn("wyslano", null);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nie udało się wysłać wiadomości przez SMTP.";
    return logAndReturn("blad", message);
  }
}
