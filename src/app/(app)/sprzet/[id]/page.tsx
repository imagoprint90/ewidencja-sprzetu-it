import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getAssignments,
  getCategories,
  getEmployees,
  getEquipment,
  getEquipmentLinks,
} from "@/lib/supabase/queries";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { SprzetDetailClient } from "./SprzetDetailClient";

export default async function SprzetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [equipment, categories, employees, assignments, equipmentLinks] = await Promise.all([
    getEquipment(supabase),
    getCategories(supabase),
    getEmployees(supabase),
    getAssignments(supabase),
    getEquipmentLinks(supabase),
  ]);

  const item = equipment.find((e) => e.id === id);

  if (!item) {
    return (
      <EmptyState
        title="Nie znaleziono sprzętu"
        description="Sprzęt o podanym identyfikatorze nie istnieje lub został usunięty."
        action={
          <Link href="/sprzet">
            <Button variant="secondary">Wróć do listy sprzętu</Button>
          </Link>
        }
      />
    );
  }

  return (
    <SprzetDetailClient
      item={item}
      allEquipment={equipment}
      categories={categories}
      employees={employees}
      assignments={assignments}
      equipmentLinks={equipmentLinks}
    />
  );
}
