"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ticketFormSchema, type TicketFormValues } from "@/lib/schemas";
import { FormField, FormSection, inputClass } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { useTicketPermissions } from "@/lib/current-user-context";
import { createTicketAction } from "@/lib/supabase/actions/ticket-actions";
import { TICKET_PRIORITY_LABELS, type TicketAssignableUser, type TicketCategory } from "@/lib/types";

export function NowyTicketForm({
  categories,
  assignableUsers,
}: {
  categories: TicketCategory[];
  assignableUsers: TicketAssignableUser[];
}) {
  const router = useRouter();
  const perms = useTicketPermissions();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: { priority: "zwykly" },
  });

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
