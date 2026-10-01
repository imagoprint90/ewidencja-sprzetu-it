import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTabAccess } from "@/lib/supabase/require-tab";
import {
  getTicketAssignableUsers,
  getTicketAttachments,
  getTicketById,
  getTicketCategories,
  getTicketComments,
  getTicketHistory,
} from "@/lib/supabase/queries";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { TicketDetailClient } from "./TicketDetailClient";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTabAccess("tickety");
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const ticket = await getTicketById(supabase, id);
  if (!ticket) {
    return (
      <EmptyState
        title="Nie znaleziono zgłoszenia"
        description="Zgłoszenie o podanym identyfikatorze nie istnieje albo nie masz do niego dostępu."
        action={
          <Link href="/tickety">
            <Button variant="secondary">Wróć do listy zgłoszeń</Button>
          </Link>
        }
      />
    );
  }

  const [categories, assignableUsers, comments, history, attachments] = await Promise.all([
    getTicketCategories(supabase),
    getTicketAssignableUsers(supabase),
    getTicketComments(supabase, id),
    getTicketHistory(supabase, id),
    getTicketAttachments(supabase, id),
  ]);

  return (
    <TicketDetailClient
      ticket={ticket}
      categories={categories}
      assignableUsers={assignableUsers}
      comments={comments}
      history={history}
      attachments={attachments}
    />
  );
}
