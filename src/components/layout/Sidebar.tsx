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
  ShieldCheck,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { useCurrentUser } from "@/lib/current-user-context";
import { canViewTab, type TabKey } from "@/lib/access";

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  tab?: TabKey;
  adminOnly?: boolean;
}[] = [
  { href: "/pulpit", label: "Pulpit", icon: LayoutDashboard },
  { href: "/sprzet", label: "Sprzęt", icon: Laptop, tab: "sprzet" },
  { href: "/pracownicy", label: "Pracownicy", icon: Users, tab: "pracownicy" },
  { href: "/oprogramowanie", label: "Oprogramowanie", icon: AppWindow, tab: "oprogramowanie" },
  { href: "/protokoly", label: "Protokoły", icon: FileText, tab: "protokoly" },
  { href: "/kategorie", label: "Kategorie", icon: Tags, tab: "kategorie" },
  { href: "/lokalizacje", label: "Lokalizacje", icon: MapPin, tab: "lokalizacje" },
  { href: "/ustawienia", label: "Ustawienia", icon: Settings, tab: "ustawienia" },
  { href: "/powiadomienia", label: "Powiadomienia", icon: Bell, adminOnly: true },
  { href: "/uzytkownicy", label: "Użytkownicy", icon: ShieldCheck, adminOnly: true },
];

function NavLinks({
  onNavigate,
  collapsed,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const { role, visibleTabs } = useCurrentUser();
  const items = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return role === "administrator";
    if (!item.tab) return true;
    return canViewTab(role, visibleTabs, item.tab);
  });
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {items.map((item) => {
        const active = pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              collapsed ? "justify-center" : ""
            } ${active ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-black/5"}`}
          >
            <Icon size={18} strokeWidth={2} />
            {!collapsed && item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({
  mobileOpen,
  onClose,
  collapsed,
  onToggleCollapsed,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  return (
    <>
      {/* Wersja stała — widoczna od szerokości tabletu w górę */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-150 lg:flex ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div
          className={`flex h-16 items-center border-b border-border ${
            collapsed ? "justify-center px-2" : "justify-between px-5"
          }`}
        >
          {!collapsed && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo.svg" alt="Logo firmy" className="h-9 w-auto" />
          )}
          <button
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Rozwiń menu" : "Zwiń menu"}
            title={collapsed ? "Rozwiń menu" : "Zwiń menu"}
            className="rounded-md p-1.5 text-foreground/60 hover:bg-black/5 hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <NavLinks collapsed={collapsed} />
      </aside>

      {/* Wersja mobilna — nakładka (zawsze pełna szerokość, bez trybu zwiniętego) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-surface shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Logo firmy" className="h-9 w-auto" />
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
