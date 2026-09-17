"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/supabase/auth-errors";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ConfigMissing } from "@/components/ui/ConfigMissing";
import { FormField, inputClass } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";

export default function ResetHaslaPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isSupabaseConfigured()) {
    return <ConfigMissing />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?dalej=/ustaw-haslo`,
    });

    setLoading(false);

    if (resetError) {
      setError(translateAuthError(resetError.message));
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Sprawdź skrzynkę e-mail</h1>
        <p className="mt-2 text-sm text-muted">
          Jeśli podany adres istnieje w systemie, wysłaliśmy na niego link do ustawienia nowego
          hasła. Link jest ważny przez ograniczony czas.
        </p>
        <Link href="/logowanie" className="mt-4 inline-block text-sm text-primary hover:underline">
          Wróć do logowania
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <Link href="/logowanie" className="mb-4 flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={16} />
        Wróć do logowania
      </Link>
      <h1 className="text-lg font-semibold">Przypomnij hasło</h1>
      <p className="mt-1 text-sm text-muted">
        Podaj adres e-mail powiązany z Twoim kontem — wyślemy link do ustawienia nowego hasła.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <FormField label="Adres e-mail" htmlFor="email" required>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full justify-center">
          {loading ? "Wysyłanie…" : "Wyślij link resetujący"}
        </Button>
      </form>
    </div>
  );
}
