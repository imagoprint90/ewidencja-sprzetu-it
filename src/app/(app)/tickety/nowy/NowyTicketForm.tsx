"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Paperclip, X } from "lucide-react";
import { ticketFormSchema, type TicketFormValues } from "@/lib/schemas";
import { FormField, FormSection, inputClass } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { useTicketPermissions } from "@/lib/current-user-context";
import { createTicketAction, uploadTicketAttachmentAction } from "@/lib/supabase/actions/ticket-actions";
import { TICKET_PRIORITY_LABELS, type TicketAssignableUser, type TicketCategory } from "@/lib/types";

const ATTACHMENT_ACCEPT = ".png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip";
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(((reader.result as string) ?? "").split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Strefa przeciągnij-i-upuść + chipy ze stage'owanymi plikami (krzyżyk usuwa przed wysłaniem) —
// pliki trafiają na serwer dopiero po udanym utworzeniu zgłoszenia (patrz onSubmit).
function AttachmentPicker({
  files,
  onAdd,
  onRemove,
  error,
}: {
  files: File[];
  onAdd: (list: FileList | null) => void;
  onRemove: (index: number) => void;
  error: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div>
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
          onAdd(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
          isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
        }`}
      >
        <Paperclip size={20} className="text-muted" />
        <p className="text-sm">
          <span className="font-medium text-primary">Wybierz pliki</span> albo przeciągnij je tutaj
        </p>
        <p className="text-xs text-muted">Obrazy (np. zrzuty ekranu), PDF, dokumenty biurowe, TXT/CSV, ZIP — maks. 10 MB na plik.</p>
      </div>
      <input
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          onAdd(e.target.files);
          e.target.value = "";
        }}
      />

      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}

      {files.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-3 pr-1.5 text-xs"
            >
              <span className="max-w-[200px] truncate">{f.name}</span>
              <span className="text-muted">{formatFileSize(f.size)}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                title="Usuń załącznik"
                className="rounded-full p-0.5 text-muted hover:bg-black/10 hover:text-danger"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function NowyTicketForm({
  categories,
  assignableUsers,
}: {
  categories: TicketCategory[];
  assignableUsers: TicketAssignableUser[];
}) {
  const router = useRouter();
  const perms = useTicketPermissions();
  const canAttach = perms.canComment || perms.canEdit || perms.canAdmin;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: { priority: "zwykly" },
  });

  function addFiles(list: FileList | null) {
    if (!list) return;
    setAttachmentError(null);
    const picked = Array.from(list);
    const tooBig = picked.find((f) => f.size > MAX_ATTACHMENT_SIZE);
    if (tooBig) {
      setAttachmentError(`Plik „${tooBig.name}” jest za duży (maks. 10 MB).`);
      return;
    }
    setFiles((prev) => [...prev, ...picked]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(values: TicketFormValues) {
    setSubmitError(null);
    const result = await createTicketAction({
      title: values.title,
      description: values.description || null,
      categoryId: values.categoryId || null,
      priority: values.priority ?? "zwykly",
      assignedTo: perms.canAssign ? values.assignedTo || null : null,
    });
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    for (const file of files) {
      const base64 = await readFileAsBase64(file);
      const uploadResult = await uploadTicketAttachmentAction(
        result.data.id,
        base64,
        file.name,
        file.type || "application/octet-stream"
      );
      if (!uploadResult.ok) {
        // Zgłoszenie już powstało — nie cofamy się, tylko informujemy i kierujemy na kartę,
        // gdzie załącznik można dodać ponownie.
        window.alert(
          `Zgłoszenie utworzono, ale nie udało się dodać załącznika „${file.name}”: ${uploadResult.error} Dodasz go na karcie zgłoszenia.`
        );
      }
    }
    router.push(`/tickety/${result.data.id}`);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Dodaj zgłoszenie</h1>
        <p className="text-sm text-muted">
          Numer zgłoszenia nadaje się automatycznie. Status startowy to „Nowe”, priorytet domyślnie
          „Zwykły” — oba można zmienić po utworzeniu.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormSection title="Zgłoszenie">
          <FormField label="Tytuł" htmlFor="title" required error={errors.title?.message} full>
            <input id="title" className={inputClass} {...register("title")} />
          </FormField>
          <FormField label="Opis" htmlFor="description" error={errors.description?.message} full>
            <textarea id="description" rows={5} className={inputClass} {...register("description")} />
          </FormField>
          {canAttach && (
            <FormField label="Załączniki" htmlFor="attachments" full>
              <AttachmentPicker files={files} onAdd={addFiles} onRemove={removeFile} error={attachmentError} />
            </FormField>
          )}
          <FormField label="Kategoria" htmlFor="categoryId" error={errors.categoryId?.message}>
            <select id="categoryId" className={inputClass} {...register("categoryId")}>
              <option value="">— brak —</option>
              {categories
                .filter((c) => !c.isArchived)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </FormField>
          <FormField label="Priorytet" htmlFor="priority" error={errors.priority?.message}>
            <select id="priority" className={inputClass} {...register("priority")}>
              {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
          {perms.canAssign && (
            <FormField label="Osoba odpowiedzialna" htmlFor="assignedTo" error={errors.assignedTo?.message}>
              <select id="assignedTo" className={inputClass} {...register("assignedTo")}>
                <option value="">— nie przydzielono —</option>
                {assignableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            </FormField>
          )}
        </FormSection>

        {submitError && (
          <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
            {submitError}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Anuluj
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            Utwórz zgłoszenie
          </Button>
        </div>
      </form>
    </div>
  );
}
