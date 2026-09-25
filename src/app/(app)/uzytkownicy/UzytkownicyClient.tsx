"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, ChevronDown, ChevronUp, Trash2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SortableTh } from "@/components/ui/SortableTh";
import { inputClass } from "@/components/ui/Form";
import { useCurrentUser } from "@/lib/current-user-context";
import { useSort } from "@/lib/useSort";
import { applySort, compareNumbers, compareStrings } from "@/lib/sort";
import { ASSIGNABLE_TABS } from "@/lib/access";
import { formatDateTime } from "@/lib/format";
import type { UserProfile } from "@/lib/supabase/queries";
import type { Category } from "@/lib/types";
import {
  deleteUserAction,
  resetUserPasswordAction,
  updateUserPermissionsAction,
} from "@/lib/supabase/actions/user-actions";
import { unlockUserAction } from "@/lib/supabase/actions/auth-actions";

type SortKey = "fullName" | "email" | "role" | "tabs" | "categories" | "createdAt";

function roleSummary(p: UserProfile): string {
  if (p.role === "administrator") return "Administrator";
  const extras: string[] = [];
  if (p.canEditEquipment || p.role === "edycja_podglad") extras.push("Edycja sprzętu");
  if (p.canTransferEquipment) extras.push("Przekazywanie sprzętu");
  return extras.length > 0 ? extras.join(" + ") : "Tylko podgląd";
}

export function UzytkownicyClient({
  profiles,
  categories,
  lockedUntil,
}: {
  profiles: UserProfile[];
  categories: Category[];
  lockedUntil: Record<string, string>;
}) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { sortKey, sortDir, toggleSort } = useSort<SortKey>("fullName");
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<"administrator" | "podglad">("podglad");
  const [editTabs, setEditTabs] = useState<Set<string>>(new Set());
  const [editCanEdit, setEditCanEdit] = useState(false);
  const [editCanTransfer, setEditCanTransfer] = useState(false);
  const [editCategories, setEditCategories] = useState<Set<string>>(new Set());
  const [editError, setEditError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function startEdit(p: UserProfile) {
    setExpandedId(p.id);
    setEditRole(p.role === "administrator" ? "administrator" : "podglad");
    setEditTabs(new Set(p.visibleTabs ?? ASSIGNABLE_TABS.map((t) => t.key)));
    setEditCanEdit(p.canEditEquipment || p.role === "edycja_podglad");
    setEditCanTransfer(p.canTransferEquipment);
    setEditCategories(new Set(p.visibleCategories ?? []));
    setEditError(null);
    setNewPassword("");
    setPasswordMessage(null);
  }

  function toggleTab(key: string) {
    setEditTabs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleCategory(id: string) {
    setEditCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function saveEdit(id: string) {
    setEditError(null);
    startTransition(async () => {
      const result = await updateUserPermissionsAction(id, {
        role: editRole,
        visibleTabs: editRole === "administrator" ? null : Array.from(editTabs),
        canEditEquipment: editCanEdit,
        canTransferEquipment: editCanTransfer,
        visibleCategories: Array.from(editCategories),
      });
      if (!result.ok) {
        setEditError(result.error);
        return;
      }
      setExpandedId(null);
      router.refresh();
    });
  }

  function savePassword(id: string) {
    if (newPassword.length < 8) {
      setPasswordMessage("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }
    startTransition(async () => {
      const result = await resetUserPasswordAction(id, newPassword);
      if (!result.ok) {
        setPasswordMessage(result.error);
        return;
      }
      setNewPassword("");
      setPasswordMessage("Hasło zostało zmienione.");
    });
  }

  function unlock(id: string) {
    startTransition(async () => {
      const result = await unlockUserAction(id);
      if (!result.ok) setDeleteError(result.error);
      else setDeleteError(null);
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteUserAction(deleteTarget.id);
      if (!result.ok) {
        setDeleteTarget(null);
        setDeleteError(result.error);
        return;
      }
      setDeleteTarget(null);
      setDeleteError(null);
      router.refresh();
    });
  }

  const sorted = useMemo(() => {
    const comparators: Record<string, (a: UserProfile, b: UserProfile) => number> = {
      fullName: (a, b) => compareStrings(a.fullName, b.fullName),
      email: (a, b) => compareStrings(a.email ?? "", b.email ?? ""),
      role: (a, b) => compareStrings(roleSummary(a), roleSummary(b)),
      tabs: (a, b) =>
        compareNumbers(a.visibleTabs?.length ?? ASSIGNABLE_TABS.length, b.visibleTabs?.length ?? ASSIGNABLE_TABS.length),
      categories: (a, b) => compareNumbers((a.visibleCategories ?? []).length, (b.visibleCategories ?? []).length),
      createdAt: (a, b) => compareStrings(a.createdAt, b.createdAt),
    };
    return applySort(profiles, sortKey, sortDir, comparators);
  }, [profiles, sortKey, sortDir]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Użytkownicy</h1>
          <p className="text-sm text-muted">
            {profiles.length} {profiles.length === 1 ? "konto" : "kont"} w systemie. Zakładka
            widoczna tylko dla administratora.
          </p>
        </div>
        <Link href="/uzytkownicy/nowy">
          <Button>
            <Plus size={16} />
            Dodaj użytkownika
          </Button>
        </Link>
      </div>

      {deleteError && (
        <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
          {deleteError}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[1020px] text-sm">
          <thead>
            <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
              <SortableTh label="Imię i nazwisko" sortKey="fullName" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} />
              <SortableTh label="Email" sortKey="email" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} />
              <SortableTh label="Rola" sortKey="role" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} />
              <SortableTh label="Zakładki" sortKey="tabs" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} />
              <SortableTh label="Kategorie sprzętu do edycji" sortKey="categories" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} />
              <SortableTh label="Utworzono" sortKey="createdAt" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} />
              <th className="px-4 py-3 font-medium text-right">Działania</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const isSelf = p.id === currentUser.id;
              const expanded = expandedId === p.id;
              const canEdit = p.canEditEquipment || p.role === "edycja_podglad";
              return (
                <Fragment key={p.id}>
                  <tr className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      {p.fullName}
                      {isSelf && <span className="ml-2 text-xs text-muted">(Ty)</span>}
                      {lockedUntil[p.id] && (
                        <span className="ml-2 inline-flex items-center gap-1" suppressHydrationWarning>
                          <Badge tone="danger">
                            Zablokowane do{" "}
                            {new Date(lockedUntil[p.id]).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                          </Badge>
                          <Button size="sm" variant="secondary" disabled={isPending} onClick={() => unlock(p.id)}>
                            Odblokuj
                          </Button>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{p.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={p.role === "administrator" ? "success" : "default"}>
                          {p.role === "administrator" ? "Administrator" : "Podgląd"}
                        </Badge>
                        {p.role !== "administrator" && canEdit && <Badge tone="warning">Edycja sprzętu</Badge>}
                        {p.role !== "administrator" && p.canTransferEquipment && (
                          <Badge tone="warning">Przekazywanie</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.role === "administrator" || !p.visibleTabs ? (
                        <span className="text-xs text-muted">wszystkie</span>
                      ) : (
                        <span className="text-xs text-muted">
                          {p.visibleTabs.length === 0
                            ? "brak"
                            : ASSIGNABLE_TABS.filter((t) => p.visibleTabs!.includes(t.key))
                                .map((t) => t.label)
                                .join(", ")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.role === "administrator" ? (
                        <span className="text-xs text-muted">wszystkie</span>
                      ) : (p.visibleCategories ?? []).length === 0 ? (
                        <span className="text-xs text-danger">
                          brak — nie zobaczy żadnych protokołów{canEdit ? " ani sprzętu do edycji" : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">
                          {categories
                            .filter((c) => p.visibleCategories!.includes(c.id))
                            .map((c) => c.name)
                            .join(", ")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatDateTime(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => (expanded ? setExpandedId(null) : startEdit(p))}
                        >
                          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          Zarządzaj
                        </Button>
                        {!isSelf && (
                          <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(p)}>
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="border-b border-border bg-black/[0.015] last:border-0">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="flex flex-col gap-4">
                          <div>
                            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                              Rola
                            </p>
                            <div className="flex gap-3">
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  checked={editRole === "podglad"}
                                  disabled={isSelf}
                                  onChange={() => setEditRole("podglad")}
                                  className="h-4 w-4 text-primary"
                                />
                                Standardowe konto
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  checked={editRole === "administrator"}
                                  onChange={() => setEditRole("administrator")}
                                  className="h-4 w-4 text-primary"
                                />
                                Administrator
                              </label>
                            </div>
                            {isSelf && (
                              <p className="mt-1 text-xs text-muted">
                                Nie możesz odebrać uprawnień administratora samemu sobie.
                              </p>
                            )}
                          </div>

                          {editRole === "podglad" ? (
                            <>
                              <div>
                                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                                  Widoczne zakładki
                                </p>
                                <div className="flex flex-wrap gap-3">
                                  {ASSIGNABLE_TABS.map((t) => (
                                    <label key={t.key} className="flex items-center gap-2 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={editTabs.has(t.key)}
                                        onChange={() => toggleTab(t.key)}
                                        className="h-4 w-4 rounded border-border text-primary"
                                      />
                                      {t.label}
                                    </label>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                                  Uprawnienia dodatkowe
                                </p>
                                <div className="flex flex-col gap-2">
                                  <label className="flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={editCanEdit}
                                      onChange={(e) => setEditCanEdit(e.target.checked)}
                                      className="h-4 w-4 rounded border-border text-primary"
                                    />
                                    Edycja i podgląd sprzętu — tylko w wybranych kategoriach
                                  </label>
                                  <label className="flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={editCanTransfer}
                                      onChange={(e) => setEditCanTransfer(e.target.checked)}
                                      className="h-4 w-4 rounded border-border text-primary"
                                    />
                                    Przekazywanie sprzętu — „Przekaż sprzęt”, generowanie
                                    protokołów, wgląd i usuwanie własnych protokołów
                                  </label>
                                </div>
                              </div>

                              <div>
                                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                                  Kategorie sprzętu do edycji
                                </p>
                                {categories.length === 0 ? (
                                  <p className="text-sm text-muted">Brak kategorii w systemie.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-3">
                                    {categories
                                      .filter((c) => !c.isArchived)
                                      .map((c) => (
                                        <label key={c.id} className="flex items-center gap-2 text-sm">
                                          <input
                                            type="checkbox"
                                            checked={editCategories.has(c.id)}
                                            onChange={() => toggleCategory(c.id)}
                                            className="h-4 w-4 rounded border-border text-primary"
                                          />
                                          {c.name}
                                        </label>
                                      ))}
                                  </div>
                                )}
                                <p className="mt-1.5 text-xs text-muted">
                                  To konto widzi w zakładce Protokoły wyłącznie protokoły
                                  zawierające sprzęt z zaznaczonych tu kategorii (bez zaznaczonej
                                  kategorii nie zobaczy żadnego protokołu). Jeśli włączone jest
                                  „Edycja i podgląd sprzętu” powyżej, dodatkowo sprzęt spoza
                                  zaznaczonych kategorii nie będzie w ogóle widoczny dla tego
                                  konta.
                                </p>
                              </div>
                            </>
                          ) : (
                            <p className="text-xs text-muted">
                              Administrator ma zawsze pełny dostęp do wszystkich zakładek i
                              sprzętu.
                            </p>
                          )}

                          {editError && <p className="text-sm text-danger">{editError}</p>}

                          <div className="flex justify-end gap-3 border-t border-border pt-3">
                            <Button variant="secondary" size="sm" onClick={() => setExpandedId(null)}>
                              Anuluj
                            </Button>
                            <Button size="sm" disabled={isPending} onClick={() => saveEdit(p.id)}>
                              Zapisz uprawnienia
                            </Button>
                          </div>

                          <div className="border-t border-border pt-3">
                            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                              Reset hasła
                            </p>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Nowe hasło (min. 8 znaków)"
                                className={`${inputClass} sm:max-w-xs`}
                              />
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={isPending}
                                onClick={() => savePassword(p.id)}
                              >
                                <KeyRound size={14} />
                                Ustaw nowe hasło
                              </Button>
                            </div>
                            {passwordMessage && (
                              <p className="mt-1.5 text-sm text-muted">{passwordMessage}</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Usunąć to konto?"
        description={
          deleteTarget
            ? `Konto „${deleteTarget.fullName}” (${deleteTarget.email ?? "brak e-mail"}) zostanie trwale usunięte. Tej operacji nie można cofnąć.`
            : undefined
        }
        confirmLabel="Usuń"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
