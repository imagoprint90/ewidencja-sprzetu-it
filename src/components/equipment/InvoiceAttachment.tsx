"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  deleteEquipmentInvoiceAction,
  getEquipmentInvoiceDownloadUrlAction,
  uploadEquipmentInvoiceAction,
} from "@/lib/supabase/actions/equipment-actions";

export function InvoiceAttachment({
  equipmentId,
  path,
  canEdit,
}: {
  equipmentId: string;
  path: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  function handleDownload() {
    if (!path) return;
    setError(null);
    startTransition(async () => {
      const result = await getEquipmentInvoiceDownloadUrlAction(path);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    });
  }

  function handleFilePicked(file: File) {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1] ?? "";
      startTransition(async () => {
        const result = await uploadEquipmentInvoiceAction(equipmentId, base64, file.name);
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
    setConfirmOpen(false);
    setError(null);
    startTransition(async () => {
      const result = await deleteEquipmentInvoiceAction(equipmentId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Faktura zakupu</p>
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {path ? (
          <>
            <Button size="sm" variant="secondary" disabled={isPending} onClick={handleDownload}>
              <Receipt size={14} />
              Pobierz fakturę
            </Button>
            {canEdit && (
              <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setConfirmOpen(true)}>
                <Trash2 size={14} />
                Usuń
              </Button>
            )}
          </>
        ) : canEdit ? (
          <>
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFilePicked(file);
                e.target.value = "";
              }}
            />
            <Button size="sm" variant="secondary" disabled={isPending} onClick={() => fileInput.current?.click()}>
              <Upload size={14} />
              Dodaj fakturę (PDF)
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted">Brak załączonej faktury zakupu.</p>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Usunąć fakturę zakupu?"
        description="Plik PDF zostanie trwale usunięty z systemu."
        confirmLabel="Usuń"
        danger
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
