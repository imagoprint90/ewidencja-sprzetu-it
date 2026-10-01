"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDateTime } from "@/lib/format";
import type { TicketAttachment } from "@/lib/types";
import {
  deleteTicketAttachmentAction,
  getTicketAttachmentDownloadUrlAction,
  uploadTicketAttachmentAction,
} from "@/lib/supabase/actions/ticket-actions";

const ACCEPT = ".png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip";
const MAX_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(((reader.result as string) ?? "").split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function TicketAttachments({
  ticketId,
  attachments,
  canUpload,
  canManageAll,
  currentUserId,
}: {
  ticketId: string;
  attachments: TicketAttachment[];
  canUpload: boolean;
  canManageAll: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TicketAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFilePicked(file: File) {
    setError(null);
    if (file.size > MAX_SIZE) {
      setError("Plik jest za duży (maks. 10 MB).");
      return;
    }
    startTransition(async () => {
      const base64 = await readFileAsBase64(file);
      const result = await uploadTicketAttachmentAction(
        ticketId,
        base64,
        file.name,
        file.type || "application/octet-stream"
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDownload(path: string) {
    setError(null);
    startTransition(async () => {
      const result = await getTicketAttachmentDownloadUrlAction(path);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    startTransition(async () => {
      const result = await deleteTicketAttachmentAction(id);
      setDeleteTarget(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {attachments.length === 0 ? (
        <p className="text-sm text-muted">Brak załączników.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {attachments.map((a) => {
            const canDelete = canManageAll || a.uploadedBy === currentUserId;
            return (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Paperclip size={16} className="shrink-0 text-muted" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.fileName}</p>
                    <p className="text-xs text-muted">
                      {formatFileSize(a.fileSize)} · {a.uploadedByName} · {formatDateTime(a.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="secondary" disabled={isPending} onClick={() => handleDownload(a.filePath)}>
                    <Download size={14} />
                  </Button>
                  {canDelete && (
                    <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setDeleteTarget(a)}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {canUpload && (
        <div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={ACCEPT}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFilePicked(file);
              e.target.value = "";
            }}
          />
          <Button size="sm" variant="secondary" disabled={isPending} onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} />
            Dodaj załącznik
          </Button>
          <p className="mt-1.5 text-xs text-muted">
            Obrazy (np. zrzuty ekranu), PDF, dokumenty biurowe, TXT/CSV, ZIP — maks. 10 MB.
          </p>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Usunąć załącznik?"
        description={deleteTarget ? `Plik „${deleteTarget.fileName}” zostanie trwale usunięty.` : undefined}
        confirmLabel="Usuń"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
