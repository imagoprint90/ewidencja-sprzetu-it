"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Archive, ArchiveRestore, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { FormField, inputClass } from "@/components/ui/Form";
import { useCurrentUser, useTicketPermissions } from "@/lib/current-user-context";
import { formatDateTime } from "@/lib/format";
import { getTicketCategoryName, ticketHistoryChangeText, ticketPriorityTone, ticketStatusTone } from "@/lib/ticket-helpers";
import { TicketAttachments } from "@/components/tickets/TicketAttachments";
import {
  TICKET_HISTORY_ACTION_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_WORKFLOW_STATUSES,
  type Ticket,
  type TicketAssignableUser,
  type TicketAttachment,
  type TicketCategory,
  type TicketComment,
  type TicketHistoryEntry,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/types";
import {
  addTicketCommentAction,
  assignTicketAction,
  changeTicketStatusAction,
  closeTicketAction,
  reopenTicketAction,
  setTicketArchivedAction,
  updateTicketDetailsAction,
  updateTicketPriorityAction,
} from "@/lib/supabase/actions/ticket-actions";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

function CommentsPanel({ ticketId, comments }: { ticketId: string; comments: TicketComment[] }) {
  const router = useRouter();
  const perms = useTicketPermissions();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await addTicketCommentAction(ticketId, body);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {comments.length === 0 ? (
        <p className="text-sm text-muted">Brak komentarzy.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-center justify-between gap-2 text-xs text-muted">
                <span className="font-medium text-foreground">{c.authorName}</span>
                <span>{formatDateTime(c.createdAt)}</span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      {perms.canComment && (
        <div className="flex flex-col gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Dodaj komentarz…"
            className={inputClass}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end">
            <Button size="sm" disabled={isPending || !body.trim()} onClick={submit}>
              Dodaj komentarz
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryPanel({ history }: { history: TicketHistoryEntry[] }) {
  if (history.length === 0) return <p className="text-sm text-muted">Brak historii zmian.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {history.map((h) => (
        <li key={h.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
          <div className="flex items-center justify-between gap-2 text-xs text-muted">
            <span className="font-medium text-foreground">{h.actorName ?? "System"}</span>
            <span>{formatDateTime(h.happenedAt)}</span>
          </div>
          <p className="mt-1">
            {TICKET_HISTORY_ACTION_LABELS[h.action]}
            {h.action !== "utworzono" && <span className="text-muted"> — {ticketHistoryChangeText(h)}</span>}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function TicketDetailClient({
  ticket,
  categories,
  assignableUsers,
  comments,
  history,
  attachments,
}: {
  ticket: Ticket;
  categories: TicketCategory[];
  assignableUsers: TicketAssignableUser[];
  comments: TicketComment[];
  history: TicketHistoryEntry[];
  attachments: TicketAttachment[];
}) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const perms = useTicketPermissions();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(ticket.title);
  const [editDescription, setEditDescription] = useState(ticket.description ?? "");
  const [editCategoryId, setEditCategoryId] = useState(ticket.categoryId ?? "");
  const [editError, setEditError] = useState<string | null>(null);

  const isClosed = ticket.status === "zamkniete";

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setActionError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setActionError(result.error ?? "Nie udało się zapisać zmiany.");
        return;
      }
      router.refresh();
    });
  }

  function saveDetails() {
    setEditError(null);
    startTransition(async () => {
      const result = await updateTicketDetailsAction(ticket.id, {
        title: editTitle,
        description: editDescription || null,
        categoryId: editCategoryId || null,
      });
      if (!result.ok) {
        setEditError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => router.back()}
        className="flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Wróć
      </button>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{ticket.ticketNumber}</p>
            <h1 className="text-xl font-semibold">{ticket.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ticket.isArchived && <Badge>Zarchiwizowane</Badge>}
            <Badge tone={ticketStatusTone(ticket.status)}>{TICKET_STATUS_LABELS[ticket.status]}</Badge>
            <Badge tone={ticketPriorityTone(ticket.priority)}>{TICKET_PRIORITY_LABELS[ticket.priority]}</Badge>
          </div>
        </div>

        {actionError && <p className="text-sm text-danger">{actionError}</p>}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          {perms.canChangeStatus && !isClosed && (
            <label className="flex items-center gap-2 text-sm">
              Status:
              <select
                value={ticket.status}
                disabled={isPending}
                onChange={(e) => run(() => changeTicketStatusAction(ticket.id, e.target.value as TicketStatus))}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary"
              >
                {/* Aktualny status dołączony na początku, żeby select poprawnie go pokazywał jako
                    zaznaczony nawet wtedy, gdy to "nowe" (stan spoza TICKET_WORKFLOW_STATUSES). */}
                {Array.from(new Set<TicketStatus>([ticket.status, ...TICKET_WORKFLOW_STATUSES])).map((s) => (
                  <option key={s} value={s}>
                    {TICKET_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          )}

          {perms.canChangePriority && (
            <label className="flex items-center gap-2 text-sm">
              Priorytet:
              <select
                value={ticket.priority}
                disabled={isPending}
                onChange={(e) => run(() => updateTicketPriorityAction(ticket.id, e.target.value as TicketPriority))}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary"
              >
                {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {perms.canAssign && (
            <label className="flex items-center gap-2 text-sm">
              Osoba odpowiedzialna:
              <select
                value={ticket.assignedTo ?? ""}
                disabled={isPending}
                onChange={(e) => run(() => assignTicketAction(ticket.id, e.target.value || null))}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary"
              >
                <option value="">— nie przydzielono —</option>
                {assignableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            </label>
          )}

          {perms.canClose && !isClosed && (
            <Button size="sm" variant="secondary" disabled={isPending} onClick={() => run(() => closeTicketAction(ticket.id))}>
              Zamknij zgłoszenie
            </Button>
          )}
          {perms.canClose && isClosed && (
            <Button size="sm" variant="secondary" disabled={isPending} onClick={() => run(() => reopenTicketAction(ticket.id))}>
              <RotateCcw size={14} />
              Otwórz ponownie
            </Button>
          )}

          {perms.canEdit && !editing && (
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              <Pencil size={14} />
              Edytuj
            </Button>
          )}

          {perms.canAdmin && (
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => run(() => setTicketArchivedAction(ticket.id, !ticket.isArchived))}
            >
              {ticket.isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
              {ticket.isArchived ? "Przywróć z archiwum" : "Archiwizuj"}
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
          <FormField label="Tytuł" htmlFor="edit-title" required>
            <input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Opis" htmlFor="edit-description">
            <textarea
              id="edit-description"
              rows={5}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Kategoria" htmlFor="edit-category">
            <select
              id="edit-category"
              value={editCategoryId}
              onChange={(e) => setEditCategoryId(e.target.value)}
              className={inputClass}
            >
              <option value="">— brak —</option>
              {categories
                .filter((c) => !c.isArchived || c.id === ticket.categoryId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </FormField>
          <div>
            <p className="mb-1.5 block text-sm font-medium">Załączniki</p>
            <TicketAttachments
              ticketId={ticket.id}
              attachments={attachments}
              canUpload={perms.canComment || perms.canEdit || perms.canAdmin}
              canManageAll={perms.canEdit || perms.canAdmin}
              currentUserId={currentUser.id}
            />
          </div>
          {editError && <p className="text-sm text-danger">{editError}</p>}
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditing(false);
                setEditTitle(ticket.title);
                setEditDescription(ticket.description ?? "");
                setEditCategoryId(ticket.categoryId ?? "");
                setEditError(null);
              }}
            >
              Anuluj
            </Button>
            <Button size="sm" disabled={isPending || !editTitle.trim()} onClick={saveDetails}>
              Zapisz
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-5">
          <dl>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">Opis</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm">{ticket.description || <span className="text-muted">— brak opisu —</span>}</dd>
          </dl>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-5">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailRow label="Kategoria" value={getTicketCategoryName(categories, ticket.categoryId)} />
          <DetailRow label="Autor" value={ticket.createdByName} />
          <DetailRow label="Osoba odpowiedzialna" value={ticket.assignedToName ?? "—"} />
          <DetailRow label="Data utworzenia" value={formatDateTime(ticket.createdAt)} />
          <DetailRow label="Pierwsze przydzielenie" value={formatDateTime(ticket.firstAssignedAt)} />
          <DetailRow label="Ostatnia zmiana osoby odpowiedzialnej" value={formatDateTime(ticket.lastAssigneeChangedAt)} />
          <DetailRow label="Ostatnia aktualizacja" value={formatDateTime(ticket.updatedAt)} />
          <DetailRow label="Data rozwiązania" value={formatDateTime(ticket.resolvedAt)} />
          <DetailRow label="Data zamknięcia" value={formatDateTime(ticket.closedAt)} />
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <Tabs
          tabs={[
            { key: "komentarze", label: `Komentarze (${comments.length})`, content: <CommentsPanel ticketId={ticket.id} comments={comments} /> },
            {
              key: "zalaczniki",
              label: `Załączniki (${attachments.length})`,
              content: (
                <TicketAttachments
                  ticketId={ticket.id}
                  attachments={attachments}
                  canUpload={perms.canComment || perms.canEdit || perms.canAdmin}
                  canManageAll={perms.canEdit || perms.canAdmin}
                  currentUserId={currentUser.id}
                />
              ),
            },
            { key: "historia", label: "Historia zmian", content: <HistoryPanel history={history} /> },
          ]}
        />
      </div>
    </div>
  );
}
