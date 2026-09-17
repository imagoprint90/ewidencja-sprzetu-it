"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu, UserCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function Topbar({
  onMenuClick,
  userEmail,
}: {
  onMenuClick: () => void;
  userEmail: string;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/logowanie");
    router.refresh();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 sm:px-6 lg:px-8">
      <button
        onClick={onMenuClick}
        aria-label="Otwórz menu"
        className="rounded-md p-2 hover:bg-black/5 lg:hidden"
      >
        <Menu size={22} />
      </button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-3 text-sm text-muted">
        <div className="flex items-center gap-2">
          <UserCircle size={22} />
          <span className="max-w-[160px] truncate sm:max-w-none">{userEmail}</span>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-black/5 disabled:opacity-50"
        >
          <LogOut size={14} />
          Wyloguj
        </button>
      </div>
    </header>
  );
}
