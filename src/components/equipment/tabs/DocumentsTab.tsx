"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDateTime } from "@/lib/format";
import { useIsAdmin } from "@/lib/current-user-context";
import { PROTOCOL_STATUS_LABELS, PROTOCOL_TYPE_LABELS, type Protocol } from "@/lib/types";
import { deleteProtocolAction, getProtocolDownloadUrlAction } from "@/lib/supabase/actions/protocol-actions";

export function DocumentsTab({ protocols }: { protocols: Protocol[] }) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleDownload(path: string | null) {
    if (!path) return;
    startTransition(async () => {
      const result = await getProtocolDownloadUrlAction(path);
      if (result.ok) {
        window.open(result.data.url, "_blank", "noopener,noreferrer");
      }
    });
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
      setError(null);
      router.refresh();
    });
  }

  if (protocols.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted">
        Ten sprzęt nie ma jeszcze żadnych wystawionych protokołów. Protokół pojawi się tu
        automatycznie po pierwszym przekazaniu lub zwrocie.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-danger">{error}</p>}
      <ul className="flex flex-col gap-2">
        {protocols.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-4"
          >
            <div>
              <p className="font-medium">
                {PROTOCOL_TYPE_LABELS[p.type]} · {p.protocolNumber}
              </p>
              <p className="text-xs text-muted">{formatDateTime(p.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={p.pdfStatus === "wygenerowany" ? "success" : p.pdfStatus === "blad" ? "danger" : "warning"}>
                {PROTOCOL_STATUS_LABELS[p.pdfStatus]}
              </Badge>
              {p.pdfStatus === "wygenerowany" && (
                <Button size="sm" variant="secondary" disabled={isPending} onClick={() => handleDownload(p.pdfPath)}>
                  <Download size={14} />
                  Pobierz
                </Button>
              )}
              {isAdmin && (
                <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setDeleteTarget(p.id)}>
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Usunąć ten protokół?"
        description="Tej operacji nie można cofnąć — usunięty zostanie zarówno wpis, jak i plik PDF. Usunięcie ostatniego protokołu tego sprzętu może odblokować możliwość usunięcia samego sprzętu."
        confirmLabel="Usuń"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
