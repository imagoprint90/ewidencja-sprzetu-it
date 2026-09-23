import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminPage } from "@/lib/supabase/require-tab";
import {
  getAssignments,
  getEmployees,
  getEquipment,
  getNotificationLog,
  getNotificationSchedules,
  getNotificationTemplates,
} from "@/lib/supabase/queries";
import { PowiadomieniaClient } from "./PowiadomieniaClient";

export default async function PowiadomieniaPage() {
  await requireAdminPage();
  const supabase = await createSupabaseServerClient();
  const [employees, assignments, equipment, templates, schedules, log] = await Promise.all([
    getEmployees(supabase),
    getAssignments(supabase),
    getEquipment(supabase),
    getNotificationTemplates(supabase),
    getNotificationSchedules(supabase),
    getNotificationLog(supabase),
  ]);

  return (
    <PowiadomieniaClient
      employees={employees}
      assignments={assignments}
      equipment={equipment}
      templates={templates}
      schedules={schedules}
      log={log}
    />
  );
}
