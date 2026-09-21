"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileWarning, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExpandableList } from "@/components/ui/ExpandableList";
import { SortableTh } from "@/components/ui/SortableTh";
import { formatDateTime } from "@/lib/format";
import { useSort } from "@/lib/useSort";
import { applySort, compareNumbers, compareStrings } from "@/lib/sort";
import { useCurrentUser, useIsAdmin, useCanTransferEquipment } from "@/lib/current-user-context";
import { PROTOCOL_STATUS_LABELS, PROTOCOL_TYPE_LABELS, type Protocol } from "@/lib/types";
import {
  deleteProtocolAction,
  getProtocolDownloadUrlAction,
  retryProtocolPdfAction,
  uploadSignedScanAction,
} from "@/lib/supabase/actions/protocol-actions";

function partySummary(p: Protocol): string {
  const { previousEmployeeName, newEmployeeName, companyName } = p.snapshot;
  if (p.type === "zwrot") return `${previousEmployeeName ?? "—"} → ${companyName} (magazyn)`;
  if (p.type === "wydanie") return `${companyName} → ${newEmployeeName ?? "—"}`;
  return `${previousEmployeeName ?? "—"} → ${newEmployeeName ?? "—"}`;
}

function statusTone(status: Protocol["pdfStatus"]) {
  if (status === "wygenerowany") return "success" as const;
  if (status === "blad") return "danger" as const;
  return "warning" as const;
}

type SortKey = "number" | "type" | "equipment" | "equipmentName" | "parties" | "date" | "status";

export function ProtokolyClient({ protocols }: { protocols: Protocol[] }) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const canTransferEquipment = useCanTransferEquipment();
  const currentUser = useCurrentUser();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const { sortKey, sortDir, toggleSort } = useSort<SortKey>("date", "desc");

  // Ponowienie generowania PDF, wgranie skanu i usunięcie są operacjami zapisu na
  // protokole — RLS dla kont z uprawnieniem "Przekazywanie sprzętu" (bez roli admina)
  // pozwala na zapis tylko na protokołach, które ten użytkownik sam wystawił.
  function canManageProtocol(p: Protocol): boolean {
    return isAdmin || (canTransferEquipment && p.issuedBy === currentUser.id);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return protocols;
    return protocols.filter((p) => {
      const equipmentNames = p.snapshot.items
        .map((i) => `${i.name} ${i.equipmentName ?? ""}`)
        .join(" ");
      const haystack = [
        p.protocolNumber,
        PROTOCOL_TYPE_LABELS[p.type],
        p.snapshot.previousEmployeeName ?? "",
        p.snapshot.newEmployeeName ?? "",
        p.city,
        equipmentNames,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [protocols, query]);

  const sorted = useMemo(() => {
    const comparators: Record<string, (a: Protocol, b: Protocol) => number> = {
      number: (a, b) => compareStrings(a.protocolNumber, b.protocolNumber),
      type: (a, b) => compareStrings(PROTOCOL_TYPE_LABELS[a.type], PROTOCOL_TYPE_LABELS[b.type]),
      equipment: (a, b) => compareNumbers(a.snapshot.items.length, b.snapshot.items.length),
      equipmentName: (a, b) => compareNumbers(a.snapshot.items.length, b.snapshot.items.length),
      parties: (a, b) => compareStrings(partySummary(a), partySummary(b)),
      date: (a, b) => compareStrings(a.createdAt, b.createdAt),
      status: (a, b) => compareStrings(PROTOCOL_STATUS_LABELS[a.pdfStatus], PROTOCOL_STATUS_LABELS[b.pdfStatus]),
    };
    return applySort(filtered, sortKey, sortDir, comparators);
  }, [filtered, sortKey, sortDir]);

  function handleDownload(path: string | null) {
    if (!path) return;
    setError(null);
    startTransition(async () => {
      const result = await getProtocolDownloadUrlAction(path);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    });
  }

  function handleRetry(id: string) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const result = await retryProtocolPdfAction(id);
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!result.data.pdfGenerated) {
        setError("Ponowna próba generowania PDF również się nie powiodła. Spróbuj później.");
      }
      router.refresh();
    });
  }

  function handleFilePicked(protocol: Protocol, file: File) {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1] ?? "";
      startTransition(async () => {
        const result = await uploadSignedScanAction(protocol.id, protocol.protocolNumber, base64, file.name);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.refresh();
      });
    };
    reader.readAsDataURL(file);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget;
    startTransition(async () => {
      const result = await deleteProtocolAction(id);
      if (!result.ok) {
        setError(result.error);
        setDeleteTarget(null);
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Protokoły</h1>
        <p className="text-sm text-muted">
          Protokoły wydania, przekazania i zwrotu sprzętu, generowane automatycznie po
          zatwierdzeniu operacji „Przekaż sprzęt”.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj: numer, sprzęt, pracownik, miejscowość…"
          className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={protocols.length === 0 ? "Brak wystawionych protokołów" : "Brak protokołów spełniających kryteria"}
          description={
            protocols.length === 0
              ? "Protokół pojawi się tutaj automatycznie po pierwszym przekazaniu lub zwrocie sprzętu."
              : "Zmień frazę wyszukiwania."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
                <SortableTh label="Numer" sortKey="number" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} className="px-3 py-2.5 font-medium" />
                <SortableTh label="Typ" sortKey="type" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} className="px-3 py-2.5 font-medium" />
                <SortableTh label="Sprzęt" sortKey="equipment" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} className="px-3 py-2.5 font-medium" />
                <SortableTh label="Nazwa sprzętu" sortKey="equipmentName" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} className="px-3 py-2.5 font-medium" />
                <SortableTh label="Strony" sortKey="parties" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} className="px-3 py-2.5 font-medium" />
                <SortableTh label="Data" sortKey="date" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} className="px-3 py-2.5 font-medium" />
                <SortableTh label="Status" sortKey="status" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} className="px-3 py-2.5 font-medium" />
                <th className="px-3 py-2.5 font-medium text-right">Działania</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 align-middle font-medium">{p.protocolNumber}</td>
                  <td className="px-3 py-2 align-middle">{PROTOCOL_TYPE_LABELS[p.type]}</td>
                  <td className="px-3 py-2 align-middle">
                    <ExpandableList items={p.snapshot.items.map((i) => i.name)} />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <ExpandableList items={p.snapshot.items.map((i) => i.equipmentName ?? i.name)} />
                  </td>
                  <td className="px-3 py-2 align-middle">{partySummary(p)}</td>
                  <td className="px-3 py-2 align-middle">{formatDateTime(p.createdAt)}</td>
                  <td className="px-3 py-2 align-middle">
                    <Badge tone={statusTone(p.pdfStatus)}>{PROTOCOL_STATUS_LABELS[p.pdfStatus]}</Badge>
                    {p.signedScanPath && (
                      <span className="ml-2 text-xs text-muted">+ podpisany skan</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <div className="flex justify-end gap-2">
                      {p.pdfStatus === "wygenerowany" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isPending}
                          onClick={() => handleDownload(p.pdfPath)}
                        >
                          <Download size={14} />
                          Pobierz
                        </Button>
                      )}
                      {p.pdfStatus === "blad" && canManageProtocol(p) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isPending && busyId === p.id}
                          onClick={() => handleRetry(p.id)}
                          title={p.pdfError ?? undefined}
                        >
                          <RefreshCw size={14} />
                          Ponów
                        </Button>
                      )}
                      {canManageProtocol(p) && (
                        <>
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            className="hidden"
                            ref={(el) => {
                              fileInputs.current[p.id] = el;
                            }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFilePicked(p, file);
                              e.target.value = "";
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => fileInputs.current[p.id]?.click()}
                          >
                            <Upload size={14} />
                            Skan
                          </Button>
                        </>
                      )}
                      {canManageProtocol(p) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() => setDeleteTarget(p.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-dashed border-border bg-surface p-4 text-xs text-muted">
        <FileWarning size={16} className="mt-0.5 shrink-0" />
        <p>
          Dokumenty przechowywane są w prywatnym magazynie plików — link do pobrania jest
          ważny tylko 60 sekund i wymaga zalogowania. Treść wystawionego protokołu (dane
          firmy, pracowników, sprzętu) jest zamrożona w momencie utworzenia i nie zmienia się
          nawet po późniejszej edycji tych danych w systemie.
        </p>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Usunąć ten protokół?"
        description="Tej operacji nie można cofnąć — usunięty zostanie zarówno wpis, jak i plik PDF. Usunięcie ostatniego protokołu danego sprzętu może odblokować możliwość usunięcia samego sprzętu."
        confirmLabel="Usuń"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
