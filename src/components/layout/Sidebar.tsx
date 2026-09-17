"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Laptop,
  Users,
  AppWindow,
  FileText,
  Tags,
  MapPin,
  Settings,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/pulpit", label: "Pulpit", icon: LayoutDashboard },
  { href: "/sprzet", label: "Sprzęt", icon: Laptop },
  { href: "/pracownicy", label: "Pracownicy", icon: Users },
  { href: "/oprogramowanie", label: "Oprogramowanie", icon: AppWindow },
  { href: "/protokoly", label: "Protokoły", icon: FileText },
  { href: "/kategorie", label: "Kategorie", icon: Tags },
  { href: "/lokalizacje", label: "Lokalizacje", icon: MapPin },
  { href: "/ustawienia", label: "Ustawienia", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const active = pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-primary/10 text-primary"
                : "text-foreground/80 hover:bg-black/5"
            }`}
          >
            <Icon size={18} strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Wersja stała — widoczna od szerokości tabletu w górę */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
            IT
          </div>
          <span className="text-sm font-semibold">Ewidencja sprzętu</span>
        </div>
        <NavLinks />
      </aside>

      {/* Wersja mobilna — nakładka */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-surface shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <span className="text-sm font-semibold">Ewidencja sprzętu</span>
              <button
                onClick={onClose}
                aria-label="Zamknij menu"
                className="rounded-md p-1.5 hover:bg-black/5"
              >
                <X size={20} />
              </button>
            </div>
            <NavLinks onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
