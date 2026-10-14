"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileImage, FileText, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { FilePreviewDialog, isPreviewable } from "@/components/ui/FilePreviewDialog";
import { formatDate } from "@/lib/format";
import type { EquipmentDocument } from "@/lib/types";
import {
  deleteEquipmentDocumentAction,
  getEquipmentDocumentUrlAction,
  listEquipmentDocumentsAction,
  uploadEquipmentDocumentAction,
} from "@/lib/supabase/actions/equipment-document-actions";

export const DOCUMENT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt";
export const DOCUMENT_HINT = "Faktury, gwarancje, skany — PDF, obrazy, Word, Excel, TXT; maks. 3 MB na plik.";
export const MAX_DOCUMENT_BYTES = 3 * 1024 * 1024;

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(((reader.result as string) ?? "").split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Dokumenty sprzętu na karcie: lista nazw (kliknięcie = szybki podgląd), krzyżyk usuwa, strefa
// przeciągnij-i-upuść dodaje kolejne pliki (zapis od razu, bez osobnego "Zapisz").
export function EquipmentDocuments({
  equipmentId,
  documents,
  canEdit,
}: {
  equipmentId: string;
  // Gdy brak — lista jest dociągana z serwera (okno edycji na liście Sprzęt nie dostaje jej ze stroną).
  documents?: EquipmentDocument[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<EquipmentDocument[] | null>(documents ?? null);
  const [prevDocuments, setPrevDocuments] = useState(documents);
  if (documents !== prevDocuments) {
    setPrevDocuments(documents);
    if (documents) setItems(documents);
  }
  useEffect(() => {
    if (documents !== undefined) return;
    let cancelled = false;
    listEquipmentDocumentsAction(equipmentId).then((r) => {
      if (!cancelled) setItems(r.ok ? r.data : []);
    });
    return () => {
      cancelled = true;
    };
  }, [equipmentId, documents]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<EquipmentDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EquipmentDocument | null>(null);

  function handleFiles(files: File[]) {
    if (files.length === 0) return;
    setError(null);
    const tooBig = files.find((f) => f.size > MAX_DOCUMENT_BYTES);
    if (tooBig) {
      setError(`Plik „${tooBig.name}” jest za duży (${(tooBig.size / 1024 / 1024).toFixed(1)} MB) — maksymalnie 3 MB.`);
      return;
    }
    startTransition(async () => {
      for (const file of files) {
        try {
          const base64 = await readFileAsBase64(file);
          const result = await uploadEquipmentDocumentAction(equipmentId, base64, file.name);
          if (!result.ok) {
            setError(`„${file.name}”: ${result.error}`);
            router.refresh();
            return;
          }
          setItems((prev) => [...(prev ?? []), result.data]);
        } catch {
          setError(`Nie udało się wysłać „${file.name}” (połączenie przerwane albo plik za duży).`);
          router.refresh();
          return;
        }
      }
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    startTransition(async () => {
      const result = await deleteEquipmentDocumentAction(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItems((prev) => (prev ?? []).filter((d) => d.id !== id));
      router.refresh();
    });
  }

  const documentList = items ?? [];

  return (
    <div className="flex flex-col gap-3">
      {items === null ? (
        <p className="text-sm text-muted">Wczytywanie dokumentów…</p>
      ) : documentList.length === 0 ? (
        <p className="text-sm text-muted">Brak dokumentów.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documentList.map((d) => {
            const Icon = isPreviewable(d.contentType, d.fileName) === "image" ? FileImage : FileText;
            const meta = [formatFileSize(d.fileSize), formatDate(d.createdAt)].filter(Boolean).join(" · ");
            return (
              <li
                key={d.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                <button
                  type="button"
                  onClick={() => setPreview(d)}
                  title="Kliknij, aby zobaczyć podgląd"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-primary"
                >
                  <Icon size={18} className="shrink-0 text-muted" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{d.fileName}</span>
                    {meta && <span className="block text-xs text-muted">{meta}</span>}
                  </span>
                </button>
                {canEdit && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setDeleteTarget(d)}
                    title="Usuń dokument"
                    aria-label={`Usuń dokument ${d.fileName}`}
                    className="shrink-0 rounded-full p-1 text-muted hover:bg-black/10 hover:text-danger disabled:opacity-50"
                  >
                    <X size={15} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && <FileDropzone onFiles={handleFiles} accept={DOCUMENT_ACCEPT} hint={DOCUMENT_HINT} disabled={isPending} />}
      {isPending && <p className="text-xs text-muted">Przetwarzanie…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {preview && (
        <FilePreviewDialog
          fileName={preview.fileName}
          contentType={preview.contentType}
          loadUrl={() => getEquipmentDocumentUrlAction(preview.filePath)}
          onClose={() => setPreview(null)}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Usunąć dokument?"
        description={deleteTarget ? `Plik „${deleteTarget.fileName}” zostanie trwale usunięty z systemu.` : undefined}
        confirmLabel="Usuń"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
