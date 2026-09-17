"use client";

// Klient Supabase do użytku w komponentach przeglądarkowych.
// Nieużywany, dopóki trwa Etap 1 (tryb demonstracyjny). Zaczniemy z niego korzystać
// w Etapie 2, po uzupełnieniu NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
// w pliku .env.local (patrz .env.example).

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Brak konfiguracji Supabase. Uzupełnij NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY w pliku .env.local."
    );
  }

  return createBrowserClient(url, anonKey);
}
