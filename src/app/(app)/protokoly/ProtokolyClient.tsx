"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileWarning, RefreshCw, Upload } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/format";
import { PROTOCOL_STATUS_LABELS, PROTOCOL_TYPE_LABELS, type Protocol } from "@/lib/types";
import {
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

export function ProtokolyClient({ protocols }: { protocols: Protocol[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Protokoły</h1>
        <p className="text-sm text-muted">
          Protokoły wydania, przekazania i zwrotu sprzętu, generowane automatycznie po
          zatwierdzeniu operacji „Przekaż sprzęt”.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {protocols.length === 0 ? (
        <EmptyState
          title="Brak wystawionych protokołów"
          description="Protokół pojawi się tutaj automatycznie po pierwszym przekazaniu lub zwrocie sprzętu."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Numer</th>
                <th className="px-4 py-3 font-medium">Typ</th>
                <th className="px-4 py-3 font-medium">Strony</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Działania</th>
              </tr>
            </thead>
            <tbody>
              {protocols.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{p.protocolNumber}</td>
                  <td className="px-4 py-3">{PROTOCOL_TYPE_LABELS[p.type]}</td>
                  <td className="px-4 py-3">{partySummary(p)}</td>
                  <td className="px-4 py-3">{formatDateTime(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(p.pdfStatus)}>{PROTOCOL_STATUS_LABELS[p.pdfStatus]}</Badge>
                    {p.signedScanPath && (
                      <span className="ml-2 text-xs text-muted">+ podpisany skan</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
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
                      {p.pdfStatus === "blad" && (
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
    </div>
  );
}
