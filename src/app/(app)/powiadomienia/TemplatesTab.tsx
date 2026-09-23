"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField, FormSection, inputClass } from "@/components/ui/Form";
import { NOTIFICATION_PLACEHOLDERS, type NotificationTemplate } from "@/lib/types";
import {
  createTemplateAction,
  deleteTemplateAction,
  updateTemplateAction,
  type TemplateInput,
} from "@/lib/supabase/actions/notification-actions";

const EMPTY_FORM: TemplateInput = { name: "", subject: "", body: "" };

function PlaceholderHints() {
  return (
    <p className="text-xs text-muted">
      Dostępne placeholdery (podstawiane danymi pracownika przy wysyłce):{" "}
      {NOTIFICATION_PLACEHOLDERS.map((p) => (
        <code key={p.token} className="mx-0.5 rounded bg-black/5 px-1" title={p.description}>
          {p.token}
        </code>
      ))}
    </p>
  );
}

function TemplateForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: TemplateInput;
  onCancel: () => void;
  onSubmit: (input: TemplateInput) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      setError("Nazwa, temat i treść są wymagane.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await onSubmit(form);
      if (!result.ok) {
        setError(result.error ?? "Nie udało się zapisać szablonu.");
        return;
      }
      router.refresh();
      onCancel();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <FormSection title="Szablon powiadomienia">
        <FormField label="Nazwa szablonu" htmlFor="name" required full>
          <input
            id="name"
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </FormField>
        <FormField label="Temat maila" htmlFor="subject" required full>
          <input
            id="subject"
            className={inputClass}
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          />
        </FormField>
        <FormField label="Treść" htmlFor="body" required full>
          <textarea
            id="body"
            rows={6}
            className={inputClass}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          />
        </FormField>
      </FormSection>
      <PlaceholderHints />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Anuluj
        </Button>
        <Button type="submit" disabled={isPending}>
          Zapisz szablon
        </Button>
      </div>
    </form>
  );
}

export function TemplatesTab({ templates }: { templates: NotificationTemplate[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotificationTemplate | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    startTransition(async () => {
      const result = await deleteTemplateAction(id);
      setDeleteTarget(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={16} />
            Nowy szablon
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {creating && (
        <TemplateForm initial={EMPTY_FORM} onCancel={() => setCreating(false)} onSubmit={createTemplateAction} />
      )}

      {templates.length === 0 && !creating ? (
        <EmptyState
          title="Brak zapisanych szablonów"
          description="Dodaj pierwszy szablon, żeby móc go szybko użyć przy wysyłce."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {templates.map((t) =>
            editingId === t.id ? (
              <li key={t.id}>
                <TemplateForm
                  initial={{ name: t.name, subject: t.subject, body: t.body }}
                  onCancel={() => setEditingId(null)}
                  onSubmit={(input) => updateTemplateAction(t.id, input)}
                />
              </li>
            ) : (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-4"
              >
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted">{t.subject}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setEditingId(t.id)}>
                    Edytuj
                  </Button>
                  <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setDeleteTarget(t)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </li>
            )
          )}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Usunąć ten szablon?"
        description="Historia już wysłanych powiadomień zostanie zachowana — ta operacja usuwa tylko sam szablon do przyszłego użycia."
        confirmLabel="Usuń"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
