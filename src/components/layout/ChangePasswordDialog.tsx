"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, inputClass } from "@/components/ui/Form";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/supabase/auth-errors";

// Zmiana własnego hasła — dostępna dla każdego zalogowanego konta (nie tylko admina, który
// może zresetować hasło innym w zakładce Użytkownicy). Weryfikujemy obecne hasło przez próbę
// zalogowania nim, zanim pozwolimy ustawić nowe — to zwykła praktyka w takich formularzach,
// nie tylko poleganie na tym, że ktoś ma już otwartą sesję na współdzielonym komputerze.
export function ChangePasswordDialog({
  open,
  userEmail,
  onClose,
}: {
  open: boolean;
  userEmail: string;
  onClose: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(false);
    setIsSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError("Podaj obecne hasło.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Nowe hasło musi mieć co najmniej 8 znaków.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Nowe hasła nie są identyczne.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createSupabaseBrowserClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    });
    if (signInError) {
      setIsSubmitting(false);
      setError("Obecne hasło jest nieprawidłowe.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setIsSubmitting(false);
    if (updateError) {
      setError(translateAuthError(updateError.message));
      return;
    }

    setSuccess(true);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} aria-hidden />
      <div className="relative w-full max-w-sm rounded-xl bg-surface p-6 shadow-xl">
        <button
          onClick={handleClose}
          aria-label="Zamknij"
          className="absolute right-4 top-4 text-muted hover:text-foreground"
        >
          <X size={18} />
        </button>
        <h2 className="text-base font-semibold">Zmień hasło</h2>

        {success ? (
          <div className="mt-4 flex flex-col gap-4">
            <p className="text-sm text-muted">Hasło zostało zmienione.</p>
            <div className="flex justify-end">
              <Button onClick={handleClose}>Zamknij</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            <FormField label="Obecne hasło" htmlFor="currentPassword" required>
              <input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                className={inputClass}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </FormField>
            <FormField label="Nowe hasło" htmlFor="newPassword" required>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                className={inputClass}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </FormField>
            <FormField label="Powtórz nowe hasło" htmlFor="confirmPassword" required>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className={inputClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </FormField>

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="mt-1 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Anuluj
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Zapisywanie…" : "Zmień hasło"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
