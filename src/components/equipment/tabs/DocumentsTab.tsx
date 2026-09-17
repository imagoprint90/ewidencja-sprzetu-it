"use client";

import { useTransition } from "react";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import { PROTOCOL_STATUS_LABELS, PROTOCOL_TYPE_LABELS, type Protocol } from "@/lib/types";
import { getProtocolDownloadUrlAction } from "@/lib/supabase/actions/protocol-actions";

export function DocumentsTab({ protocols }: { protocols: Protocol[] }) {
  const [isPending, startTransition] = useTransition();

  function handleDownload(path: string | null) {
    if (!path) return;
    startTransition(async () => {
      const result = await getProtocolDownloadUrlAction(path);
      if (result.ok) {
        window.open(result.data.url, "_blank", "noopener,noreferrer");
      }
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
          </div>
        </li>
      ))}
    </ul>
  );
}
