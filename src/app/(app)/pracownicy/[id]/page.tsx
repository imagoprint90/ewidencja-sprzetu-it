import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAssignments, getCategories, getEmployees, getEquipment } from "@/lib/supabase/queries";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { PracownikDetailClient } from "./PracownikDetailClient";

export default async function PracownikDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [employees, equipment, categories, assignments] = await Promise.all([
    getEmployees(supabase),
    getEquipment(supabase),
    getCategories(supabase),
    getAssignments(supabase),
  ]);

  const employee = employees.find((e) => e.id === id);

  if (!employee) {
    return (
      <EmptyState
        title="Nie znaleziono pracownika"
        action={
          <Link href="/pracownicy">
            <Button variant="secondary">Wróć do listy pracowników</Button>
          </Link>
        }
      />
    );
  }

  const history = assignments
    .filter((a) => a.employeeId === id)
    .sort((a, b) => (a.assignedAt < b.assignedAt ? 1 : -1));

  return (
    <PracownikDetailClient
      employee={employee}
      equipment={equipment}
      categories={categories}
      history={history}
    />
  );
}
