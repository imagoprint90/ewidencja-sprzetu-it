import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendSmtpEmail } from "@/lib/email";
import { renderNotificationText } from "@/lib/notification-helpers";
import { employeeFullName, getAssignedEquipmentNames } from "@/lib/equipment-helpers";
import { mapAssignment, mapEmployee, mapEquipment, mapNotificationSchedule, mapNotificationTemplate } from "@/lib/supabase/mappers";

// Wywoływane raz dziennie przez Vercel Cron (patrz vercel.json) — sprawdza harmonogramy
// automatycznych powiadomień i wysyła te, których dziś dotyczą. Bez sesji użytkownika, więc
// autoryzacja to nie "administrator jest zalogowany" tylko "żądanie naprawdę przyszło z
// Vercel Cron" (nagłówek Authorization z CRON_SECRET).
//
// Uwaga o precyzji: plan Vercel Hobby pozwala na cron co najwyżej raz dziennie (częstsze
// wywołania Vercel odrzuca już przy wdrożeniu, nie tylko ogranicza w działaniu) — mamy więc
// tylko JEDNĄ okazję dziennie, więc godzina z harmonogramu (sendTime) celowo NIE decyduje
// o tym, czy dziś wysłać — decyduje wyłącznie dzień tygodnia + to, że jeszcze nie wysłano
// dziś (last_sent_date). Gdyby jednak porównywać z konkretną godziną przy jednym sprawdzeniu
// dziennie o stałej porze, harmonogram ustawiony na późniejszą godzinę nigdy by się nie
// uruchomił. Pole sendTime zostaje w danych/UI jako "preferowana pora" — zacznie być realnie
// respektowane dopiero przy częstszym sprawdzaniu (plan Pro + odpowiednia zmiana w
// vercel.json).

export const dynamic = "force-dynamic";

function getWarsawNow(): { isoWeekday: number; date: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const weekdayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

  return {
    isoWeekday: weekdayMap[map.weekday] ?? 0,
    date: `${map.year}-${map.month}-${map.day}`,
  };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const { isoWeekday, date } = getWarsawNow();

  const [{ data: scheduleRows }, { data: templateRows }, { data: employeeRows }, { data: equipmentRows }, { data: assignmentRows }] =
    await Promise.all([
      supabase.from("notification_schedules").select("*").eq("is_active", true),
      supabase.from("notification_templates").select("*"),
      supabase.from("employees").select("*"),
      supabase.from("equipment").select("*"),
      supabase.from("assignments").select("*"),
    ]);

  const schedules = (scheduleRows ?? []).map(mapNotificationSchedule);
  const templates = (templateRows ?? []).map(mapNotificationTemplate);
  const employees = (employeeRows ?? []).map(mapEmployee);
  const equipment = (equipmentRows ?? []).map(mapEquipment);
  const assignments = (assignmentRows ?? []).map(mapAssignment);

  const due = schedules.filter((s) => s.daysOfWeek.includes(isoWeekday) && s.lastSentDate !== date);

  let sentCount = 0;
  let errorCount = 0;

  for (const schedule of due) {
    const template = templates.find((t) => t.id === schedule.templateId);
    if (!template) continue;

    for (const employeeId of schedule.employeeIds) {
      const employee = employees.find((e) => e.id === employeeId);
      if (!employee || !employee.email) {
        errorCount += 1;
        await supabase.from("notification_log").insert({
          employee_id: employeeId,
          employee_name_snapshot: employee ? employeeFullName(employee) : "Nieznany pracownik",
          employee_email_snapshot: employee?.email ?? "",
          template_id: template.id,
          template_name_snapshot: template.name,
          subject: template.subject,
          body: template.body,
          status: "blad",
          error_message: "Pracownik nie ma zapisanego adresu e-mail.",
          sent_by_name: `Harmonogram: ${schedule.name}`,
          schedule_id: schedule.id,
        });
        continue;
      }

      const assignedEquipmentNames = getAssignedEquipmentNames(assignments, equipment, employee.id);
      const subject = renderNotificationText(template.subject, employee, assignedEquipmentNames);
      const body = renderNotificationText(template.body, employee, assignedEquipmentNames);

      const result = await sendSmtpEmail({ to: employee.email, subject, text: body });
      if (result.ok) sentCount += 1;
      else errorCount += 1;

      await supabase.from("notification_log").insert({
        employee_id: employee.id,
        employee_name_snapshot: employeeFullName(employee),
        employee_email_snapshot: employee.email,
        template_id: template.id,
        template_name_snapshot: template.name,
        subject,
        body,
        status: result.ok ? "wyslano" : "blad",
        error_message: result.ok ? null : (result.error ?? null),
        sent_by_name: `Harmonogram: ${schedule.name}`,
        schedule_id: schedule.id,
      });
    }

    await supabase.from("notification_schedules").update({ last_sent_date: date }).eq("id", schedule.id);
  }

  return NextResponse.json({ checked: schedules.length, due: due.length, sent: sentCount, errors: errorCount });
}
