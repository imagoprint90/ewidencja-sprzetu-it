"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Paperclip, Trash2 } from "lucide-react";
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

// Komponent jest reużywany w dwóch miejscach na karcie zgłoszenia: w zakładce "Załączniki"
// (zawsze widocznej, dla każdego z Komentowaniem/Edycją/Administracją) i wewnątrz panelu
// "Edytuj" (żeby nie trzeba było przełączać zakładki w trakcie edycji tytułu/opisu/kategorii).
// Upload tu jest NATYCHMIASTOWY per plik (nie ma kroku "Zapisz") — inaczej niż przy tworzeniu
// nowego zgłoszenia, gdzie pliki czekają na utworzenie ticketu i dopiero wtedy się wysyłają.
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
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TicketAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFilesPicked(list: FileList | null) {
    if (!list || list.length === 0) return;
    setError(null);
    const files = Array.from(list);
    const tooBig = files.find((f) => f.size > MAX_SIZE);
    if (tooBig) {
      setError(`Plik „${tooBig.name}” jest za duży (maks. 10 MB).`);
      return;
    }
    startTransition(async () => {
      for (const file of files) {
        const base64 = await readFileAsBase64(file);
        const result = await uploadTicketAttachmentAction(
          ticketId,
          base64,
          file.name,
          file.type || "application/octet-stream"
        );
        if (!result.ok) {
          setError(`Nie udało się dodać „${file.name}”: ${result.error}`);
          return;
        }
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

      {canUpload && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            handleFilesPicked(e.dataTransfer.files);
          }}
          className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
            isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
          } ${isPending ? "pointer-events-none opacity-60" : ""}`}
        >
          <Paperclip size={20} className="text-muted" />
          <p className="text-sm">
            <span className="font-medium text-primary">Wybierz pliki</span> albo przeciągnij je tutaj
          </p>
          <p className="text-xs text-muted">
            Obrazy (np. zrzuty ekranu), PDF, dokumenty biurowe, TXT/CSV, ZIP — maks. 10 MB na plik.
          </p>
        </div>
      )}

      <input
        type="file"
        multiple
        ref={fileInputRef}
        className="hidden"
        accept={ACCEPT}
        onChange={(e) => {
          handleFilesPicked(e.target.files);
          e.target.value = "";
        }}
      />

      {error && <p className="text-sm text-danger">{error}</p>}

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
