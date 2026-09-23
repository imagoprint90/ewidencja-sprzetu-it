import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminPage } from "@/lib/supabase/require-tab";
import {
  getAssignments,
  getDepartments,
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
  const [employees, departments, assignments, equipment, templates, schedules, log] = await Promise.all([
    getEmployees(supabase),
    getDepartments(supabase),
    getAssignments(supabase),
    getEquipment(supabase),
    getNotificationTemplates(supabase),
    getNotificationSchedules(supabase),
    getNotificationLog(supabase),
  ]);

  return (
    <PowiadomieniaClient
      employees={employees}
      departments={departments}
      assignments={assignments}
      equipment={equipment}
      templates={templates}
      schedules={schedules}
      log={log}
    />
  );
}
