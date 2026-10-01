"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Archive, ArchiveRestore, Check, GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SortableTh } from "@/components/ui/SortableTh";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";
import { Pagination } from "@/components/ui/Pagination";
import { Tabs } from "@/components/ui/Tabs";
import { inputClass } from "@/components/ui/Form";
import { useCurrentUser, useTicketPermissions } from "@/lib/current-user-context";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { useSort } from "@/lib/useSort";
import { applySort, compareNumbers, compareStrings } from "@/lib/sort";
import { formatDateTime } from "@/lib/format";
import { getTicketCategoryName, ticketPriorityTone, ticketStatusTone } from "@/lib/ticket-helpers";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type Ticket,
  type TicketAssignableUser,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/types";
import {
  createTicketCategoryAction,
  renameTicketCategoryAction,
  reorderTicketCategoriesAction,
  setTicketCategoryArchivedAction,
} from "@/lib/supabase/actions/ticket-actions";

const UNASSIGNED = "__nieprzydzielone";
const PRIORITY_ORDER: Record<TicketPriority, number> = { zwykly: 0, wysoki: 1, krytyczny: 2 };

type QuickView = "wszystkie" | "moje" | "nieprzydzielone" | "otwarte";

const QUICK_VIEWS: { key: QuickView; label: string }[] = [
  { key: "wszystkie", label: "Wszystkie" },
  { key: "moje", label: "Przypisane do mnie" },
  { key: "nieprzydzielone", label: "Nieprzydzielone" },
  { key: "otwarte", label: "Otwarte" },
];

interface TicketFiltersState {
  query: string;
  statuses: TicketStatus[];
  priorities: TicketPriority[];
  categoryIds: string[];
  assigneeIds: string[];
  quickView: QuickView;
  showArchived: boolean;
}

const EMPTY_FILTERS: TicketFiltersState = {
  query: "",
  statuses: [],
  priorities: [],
  categoryIds: [],
  assigneeIds: [],
  showArchived: false,
  quickView: "wszystkie",
};

type SortKey = "ticketNumber" | "title" | "category" | "status" | "priority" | "author" | "assignee" | "createdAt" | "assignedAt";

function TicketListView({
  tickets,
  categories,
  assignableUsers,
}: {
  tickets: Ticket[];
  categories: TicketCategory[];
  assignableUsers: TicketAssignableUser[];
}) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const perms = useTicketPermissions();
  const [filters, setFilters] = useLocalStorage<TicketFiltersState>("tickety-filtry", EMPTY_FILTERS);
  const { sortKey, sortDir, toggleSort } = useSort<SortKey>("createdAt", "desc", "tickety-sort");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useLocalStorage<number>("tickety-page-size", 25);

  function setFiltersAndResetPage(next: TicketFiltersState) {
    setFilters(next);
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return tickets.filter((t) => {
      if (!filters.showArchived && t.isArchived) return false;
      if (filters.quickView === "moje" && t.assignedTo !== currentUser.id) return false;
      if (filters.quickView === "nieprzydzielone" && t.assignedTo !== null) return false;
      if (filters.quickView === "otwarte" && (t.status === "rozwiazane" || t.status === "zamkniete")) return false;

      if (filters.statuses.length > 0 && !filters.statuses.includes(t.status)) return false;
      if (filters.priorities.length > 0 && !filters.priorities.includes(t.priority)) return false;
      if (filters.categoryIds.length > 0 && (!t.categoryId || !filters.categoryIds.includes(t.categoryId))) return false;
      if (filters.assigneeIds.length > 0) {
        const matchesUnassigned = filters.assigneeIds.includes(UNASSIGNED) && t.assignedTo === null;
        const matchesUser = t.assignedTo !== null && filters.assigneeIds.includes(t.assignedTo);
        if (!matchesUnassigned && !matchesUser) return false;
      }

      if (!q) return true;
      return [t.ticketNumber, t.title].join(" ").toLowerCase().includes(q);
    });
  }, [tickets, filters, currentUser.id]);

  const sorted = useMemo(() => {
    const comparators: Record<string, (a: Ticket, b: Ticket) => number> = {
      ticketNumber: (a, b) => compareStrings(a.ticketNumber, b.ticketNumber),
      title: (a, b) => compareStrings(a.title, b.title),
      category: (a, b) =>
        compareStrings(getTicketCategoryName(categories, a.categoryId), getTicketCategoryName(categories, b.categoryId)),
      status: (a, b) => compareStrings(TICKET_STATUS_LABELS[a.status], TICKET_STATUS_LABELS[b.status]),
      priority: (a, b) => compareNumbers(PRIORITY_ORDER[a.priority], PRIORITY_ORDER[b.priority]),
      author: (a, b) => compareStrings(a.createdByName, b.createdByName),
      assignee: (a, b) => compareStrings(a.assignedToName ?? "", b.assignedToName ?? ""),
      createdAt: (a, b) => compareStrings(a.createdAt, b.createdAt),
      assignedAt: (a, b) => compareStrings(a.lastAssigneeChangedAt ?? "", b.lastAssigneeChangedAt ?? ""),
    };
    return applySort(filtered, sortKey, sortDir, comparators);
  }, [filtered, sortKey, sortDir, categories]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const th = (label: string, key: SortKey) => (
    <SortableTh label={label} sortKey={key} currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {QUICK_VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setFiltersAndResetPage({ ...filters, quickView: v.key })}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              filters.quickView === v.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-foreground/80 hover:bg-black/5"
            }`}
          >
            {v.label}
          </button>
        ))}
        {perms.canAdmin && (
          <label className="ml-auto flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={filters.showArchived}
              onChange={(e) => setFiltersAndResetPage({ ...filters, showArchived: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary"
            />
            Pokaż zarchiwizowane
          </label>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          value={filters.query}
          onChange={(e) => setFiltersAndResetPage({ ...filters, query: e.target.value })}
          placeholder="Szukaj: numer, tytuł…"
          className={`${inputClass} sm:max-w-xs`}
        />
        <MultiSelectFilter
          label="Status"
          options={Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          selected={filters.statuses}
          onChange={(v) => setFiltersAndResetPage({ ...filters, statuses: v as TicketStatus[] })}
        />
        <MultiSelectFilter
          label="Priorytet"
          options={Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
          selected={filters.priorities}
          onChange={(v) => setFiltersAndResetPage({ ...filters, priorities: v as TicketPriority[] })}
        />
        <MultiSelectFilter
          label="Kategoria"
          options={categories.filter((c) => !c.isArchived).map((c) => ({ value: c.id, label: c.name }))}
          selected={filters.categoryIds}
          onChange={(v) => setFiltersAndResetPage({ ...filters, categoryIds: v })}
        />
        <MultiSelectFilter
          label="Osoba odpowiedzialna"
          options={[
            { value: UNASSIGNED, label: "Nieprzydzielone" },
            ...assignableUsers.map((u) => ({ value: u.id, label: u.fullName })),
          ]}
          selected={filters.assigneeIds}
          onChange={(v) => setFiltersAndResetPage({ ...filters, assigneeIds: v })}
        />
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          title="Brak zgłoszeń spełniających kryteria"
          description={tickets.length === 0 ? "W systemie nie ma jeszcze żadnych zgłoszeń." : undefined}
          action={
            perms.canCreate ? (
              <Link href="/tickety/nowy">
                <Button variant="secondary">Dodaj pierwsze zgłoszenie</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
                {th("Numer", "ticketNumber")}
                {th("Tytuł", "title")}
                {th("Kategoria", "category")}
                {th("Status", "status")}
                {th("Priorytet", "priority")}
                {th("Autor", "author")}
                {th("Osoba odpowiedzialna", "assignee")}
                {th("Data utworzenia", "createdAt")}
                {th("Data przydzielenia", "assignedAt")}
              </tr>
            </thead>
            <tbody>
              {paged.map((t) => (
                <tr
                  key={t.id}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-black/[0.02]"
                  onClick={() => router.push(`/tickety/${t.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-primary">{t.ticketNumber}</td>
                  <td className="max-w-[320px] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="truncate" title={t.title}>
                        {t.title}
                      </span>
                      {t.isArchived && <Badge>Archiwum</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">{getTicketCategoryName(categories, t.categoryId)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={ticketStatusTone(t.status)}>{TICKET_STATUS_LABELS[t.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={ticketPriorityTone(t.priority)}>{TICKET_PRIORITY_LABELS[t.priority]}</Badge>
                  </td>
                  <td className="px-4 py-3">{t.createdByName}</td>
                  <td className="px-4 py-3">{t.assignedToName ?? <span className="text-muted">—</span>}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(t.createdAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(t.lastAssigneeChangedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={currentPage} pageSize={pageSize} total={sorted.length} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
        </div>
      )}
    </div>
  );
}

function TicketCategoriesPanel({ categories }: { categories: TicketCategory[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function moveCategory(fromId: string, toId: string) {
    if (fromId === toId) return;
    const ids = active.map((c) => c.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    startTransition(async () => {
      const result = await reorderTicketCategoriesAction(ids);
      if (!result.ok) setActionError(result.error);
      else setActionError(null);
      router.refresh();
    });
  }

  function handleAdd() {
    startTransition(async () => {
      const result = await createTicketCategoryAction(newName);
      if (!result.ok) {
        setAddError(result.error);
        return;
      }
      setNewName("");
      setAddError(null);
      router.refresh();
    });
  }

  function saveEdit(id: string) {
    startTransition(async () => {
      const result = await renameTicketCategoryAction(id, editValue);
      if (!result.ok) {
        setEditError(result.error);
        return;
      }
      setEditingId(null);
      router.refresh();
    });
  }

  function setArchived(id: string, isArchived: boolean) {
    startTransition(async () => {
      const result = await setTicketCategoryArchivedAction(id, isArchived);
      if (!result.ok) setActionError(result.error);
      else setActionError(null);
      router.refresh();
    });
  }

  const active = categories.filter((c) => !c.isArchived);
  const archived = categories.filter((c) => c.isArchived);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Kategorie zgłoszeń to osobny słownik, niezależny od kategorii sprzętu — służy wyłącznie do
        porządkowania ticketów i ograniczania widoczności przy uprawnieniu „Podgląd wszystkich”.
      </p>

      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="mb-2 text-sm font-medium">Dodaj nową kategorię</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="np. Drukarki"
            className={inputClass}
          />
          <Button onClick={handleAdd} disabled={isPending}>
            <Plus size={16} />
            Dodaj
          </Button>
        </div>
        {addError && <p className="mt-2 text-sm text-danger">{addError}</p>}
      </div>

      {actionError && (
        <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">{actionError}</p>
      )}

      <p className="text-xs text-muted">
        Przeciągnij uchwyt <GripVertical size={12} className="inline" />, żeby zmienić kolejność —
        w tej samej kolejności kategorie pojawią się później na liście wyboru.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
              <th className="w-8 px-2 py-3" />
              <th className="px-4 py-3 font-medium">Nazwa</th>
              <th className="px-4 py-3 font-medium text-right">Działania</th>
            </tr>
          </thead>
          <tbody>
            {active.map((c) => (
              <tr
                key={c.id}
                onDragOver={(e) => {
                  if (dragId) {
                    e.preventDefault();
                    setOverId(c.id);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId) moveCategory(dragId, c.id);
                  setDragId(null);
                  setOverId(null);
                }}
                className={`border-b border-border last:border-0 ${dragId === c.id ? "opacity-40" : ""} ${
                  overId === c.id && dragId && dragId !== c.id ? "bg-primary/10" : ""
                }`}
              >
                <td className="px-2 py-3">
                  <span
                    draggable
                    onDragStart={(e) => {
                      setDragId(c.id);
                      e.dataTransfer.effectAllowed = "move";
                      const row = e.currentTarget.closest("tr");
                      if (row) e.dataTransfer.setDragImage(row, 10, 10);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverId(null);
                    }}
                    className="inline-flex cursor-grab text-muted hover:text-foreground"
                    title="Przeciągnij, aby zmienić kolejność"
                  >
                    <GripVertical size={16} />
                  </span>
                </td>
                <td className="px-4 py-3">
                  {editingId === c.id ? (
                    <div className="flex flex-col gap-1">
                      <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} className={inputClass} />
                      {editError && <span className="text-xs text-danger">{editError}</span>}
                    </div>
                  ) : (
                    c.name
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {editingId === c.id ? (
                      <>
                        <Button size="sm" variant="secondary" disabled={isPending} onClick={() => saveEdit(c.id)}>
                          <Check size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X size={14} />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingId(c.id);
                            setEditValue(c.name);
                            setEditError(null);
                          }}
                        >
                          <Pencil size={14} />
                          Zmień nazwę
                        </Button>
                        <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setArchived(c.id, true)}>
                          <Archive size={14} />
                          Archiwizuj
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {archived.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted">Zarchiwizowane kategorie</h2>
          <div className="flex flex-wrap gap-2">
            {archived.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1">
                <Badge>{c.name}</Badge>
                <button
                  type="button"
                  onClick={() => setArchived(c.id, false)}
                  title="Przywróć kategorię"
                  className="text-muted hover:text-primary"
                >
                  <ArchiveRestore size={14} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TicketyClient({
  tickets,
  categories,
  assignableUsers,
}: {
  tickets: Ticket[];
  categories: TicketCategory[];
  assignableUsers: TicketAssignableUser[];
}) {
  const perms = useTicketPermissions();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Tickety</h1>
          <p className="text-sm text-muted">
            {tickets.length} {tickets.length === 1 ? "zgłoszenie" : "zgłoszeń"} dostępnych dla Twojego konta.
          </p>
        </div>
        {perms.canCreate && (
          <Link href="/tickety/nowy">
            <Button>
              <Plus size={16} />
              Dodaj zgłoszenie
            </Button>
          </Link>
        )}
      </div>

      {perms.canAdmin ? (
        <Tabs
          tabs={[
            { key: "zgloszenia", label: "Zgłoszenia", content: <TicketListView tickets={tickets} categories={categories} assignableUsers={assignableUsers} /> },
            { key: "kategorie", label: "Kategorie", content: <TicketCategoriesPanel categories={categories} /> },
          ]}
        />
      ) : (
        <TicketListView tickets={tickets} categories={categories} assignableUsers={assignableUsers} />
      )}
    </div>
  );
}
