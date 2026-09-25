"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ConfigMissing } from "@/components/ui/ConfigMissing";
import { FormField, inputClass } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { signInAction } from "@/lib/supabase/actions/auth-actions";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("blad") === "link_wygasl"
      ? "Link wygasł lub jest nieprawidłowy. Poproś o nowy."
      : null
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Logowanie odbywa się na serwerze — tam liczone są nieudane próby i blokowane konta.
    const result = await signInAction(email, password);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    const dalej = searchParams.get("dalej") || "/pulpit";
    router.push(dalej);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Logo firmy" className="mx-auto mb-4 h-12 w-auto" />
        <h1 className="text-lg font-semibold">Ewidencja sprzętu IT</h1>
        <p className="mt-1 text-sm text-muted">Zaloguj się do systemu</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
        <FormField label="Hasło" htmlFor="password" required>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full justify-center">
          {loading ? "Logowanie…" : "Zaloguj się"}
        </Button>

        <Link
          href="/logowanie/reset-hasla"
          className="text-center text-sm text-primary hover:underline"
        >
          Nie pamiętasz hasła?
        </Link>
      </form>
    </div>
  );
}

export default function LogowaniePage() {
  if (!isSupabaseConfigured()) {
    return <ConfigMissing />;
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
