"use client";

import { Menu, UserCircle } from "lucide-react";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
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
      <div className="flex items-center gap-2 text-sm text-muted">
        <UserCircle size={22} />
        <span>Tryb demonstracyjny — brak logowania</span>
      </div>
    </header>
  );
}
