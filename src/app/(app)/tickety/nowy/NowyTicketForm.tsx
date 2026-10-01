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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          {canAttach && (
            <FormField label="Załączniki" htmlFor="attachments" full>
              <input
                id="attachments"
                type="file"
                multiple
                accept={ATTACHMENT_ACCEPT}
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <Paperclip size={16} />
                Dodaj pliki
              </Button>
              {files.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="shrink-0 text-muted hover:text-danger"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {attachmentError && <p className="mt-1 text-sm text-danger">{attachmentError}</p>}
              <p className="mt-1.5 text-xs text-muted">
                Obrazy (np. zrzuty ekranu), PDF, dokumenty biurowe, TXT/CSV, ZIP — maks. 10 MB na plik.
              </p>
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
