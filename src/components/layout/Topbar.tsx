"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, KeyRound, LogOut, Menu, UserCircle } from "lucide-react";
import { logLogoutAction } from "@/lib/supabase/actions/login-event-actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { ThemeToggle } from "./ThemeToggle";

export function Topbar({
  onMenuClick,
  userEmail,
}: {
  onMenuClick: () => void;
  userEmail: string;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createSupabaseBrowserClient();
    await logLogoutAction();
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

      <div className="flex items-center gap-1">
      <ThemeToggle />
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-black/5"
        >
          <UserCircle size={22} />
          <span className="max-w-[160px] truncate sm:max-w-none">{userEmail}</span>
          <ChevronDown size={14} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-border bg-surface py-1 shadow-lg">
            <button
              onClick={() => {
                setMenuOpen(false);
                setPasswordDialogOpen(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/5"
            >
              <KeyRound size={15} />
              Zmień hasło
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-red-50 disabled:opacity-50"
            >
              <LogOut size={15} />
              Wyloguj
            </button>
          </div>
        )}
      </div>
      </div>

      <ChangePasswordDialog
        open={passwordDialogOpen}
        userEmail={userEmail}
        onClose={() => setPasswordDialogOpen(false)}
      />
    </header>
  );
}
