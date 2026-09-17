"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/supabase/auth-errors";
import { FormField, inputClass } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";

export function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Hasło musi mieć co najmniej 6 znaków.");
      return;
    }
    if (password !== confirm) {
      setError("Hasła nie są identyczne.");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(translateAuthError(updateError.message));
      return;
    }

    router.push("/pulpit");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h1 className="text-lg font-semibold">Ustaw nowe hasło</h1>
      <p className="mt-1 text-sm text-muted">Wprowadź nowe hasło do swojego konta.</p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <FormField label="Nowe hasło" htmlFor="password" required>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>
        <FormField label="Powtórz nowe hasło" htmlFor="confirm" required>
          <input
            id="confirm"
            type="password"
            required
            autoComplete="new-password"
            className={inputClass}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </FormField>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full justify-center">
          {loading ? "Zapisywanie…" : "Zapisz nowe hasło"}
        </Button>
      </form>
    </div>
  );
}
