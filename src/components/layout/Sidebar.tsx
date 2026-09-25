"use client";

import { useState } from "react";
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
  ChevronDown,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { useCurrentUser } from "@/lib/current-user-context";
import { canViewTab, type TabKey } from "@/lib/access";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  tab?: TabKey;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/pulpit", label: "Pulpit", icon: LayoutDashboard },
  { href: "/sprzet", label: "Sprzęt", icon: Laptop, tab: "sprzet" },
  { href: "/pracownicy", label: "Pracownicy", icon: Users, tab: "pracownicy" },
  { href: "/oprogramowanie", label: "Oprogramowanie", icon: AppWindow, tab: "oprogramowanie" },
  { href: "/protokoly", label: "Protokoły", icon: FileText, tab: "protokoly" },
];

// Rozwijane menu "Ustawienia" jest widoczne zawsze. Kliknięcie otwiera stronę ustawień firmy (jeśli
// konto ma do niej dostęp) i rozwija podmenu; podpozycje pokazują się wg uprawnień konta, więc
// bez żadnych uprawnień podmenu jest po prostu puste.
const SETTINGS_ITEM: NavItem = { href: "/ustawienia", label: "Ustawienia", icon: Settings, tab: "ustawienia" };
const SETTINGS_CHILDREN: NavItem[] = [
  { href: "/kategorie", label: "Kategorie", icon: Tags, tab: "kategorie" },
  { href: "/lokalizacje", label: "Lokalizacje", icon: MapPin, tab: "lokalizacje" },
  { href: "/powiadomienia", label: "Powiadomienia", icon: Bell, adminOnly: true },
  { href: "/statusy-sprzetu", label: "Statusy sprzętu", icon: Palette, tab: "statusy" },
  { href: "/uzytkownicy", label: "Użytkownicy", icon: ShieldCheck, adminOnly: true },
];

function NavLinks({
  onNavigate,
  collapsed,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const { role, visibleTabs } = useCurrentUser();
  const visible = (item: NavItem) => {
    if (item.adminOnly) return role === "administrator";
    if (!item.tab) return true;
    return canViewTab(role, visibleTabs, item.tab);
  };
  const items = NAV_ITEMS.filter(visible);
  const children = SETTINGS_CHILDREN.filter(visible);
  const showSettingsParent = visible(SETTINGS_ITEM);

  const inSettings =
    pathname.startsWith(SETTINGS_ITEM.href) || SETTINGS_CHILDREN.some((c) => pathname.startsWith(c.href));
  // Podmenu jest rozwinięte na stronach ustawień albo po ręcznym rozwinięciu; ręczne zwinięcie
  // obowiązuje do zmiany strony.
  const [manualOpen, setManualOpen] = useState(false);
  const [closedAt, setClosedAt] = useState<string | null>(null);
  const open = (manualOpen || inSettings) && closedAt !== pathname;
  const setOpen = (next: boolean) => {
    setManualOpen(next);
    setClosedAt(next ? null : pathname);
  };

  const linkClass = (active: boolean, extra = "") =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${extra} ${
      active ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-black/5"
    }`;

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={linkClass(pathname.startsWith(item.href), collapsed ? "justify-center" : "")}
          >
            <Icon size={18} strokeWidth={2} />
            {!collapsed && item.label}
          </Link>
        );
      })}

      {(
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            {showSettingsParent ? (
              <Link
                href={SETTINGS_ITEM.href}
                onClick={() => {
                  setOpen(true);
                  onNavigate?.();
                }}
                title={collapsed ? SETTINGS_ITEM.label : undefined}
                className={`${linkClass(pathname.startsWith(SETTINGS_ITEM.href), collapsed ? "justify-center" : "")} flex-1`}
              >
                <Settings size={18} strokeWidth={2} />
                {!collapsed && SETTINGS_ITEM.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setOpen(!open)}
                title={collapsed ? SETTINGS_ITEM.label : undefined}
                className={`${linkClass(false, collapsed ? "justify-center" : "")} flex-1`}
              >
                <Settings size={18} strokeWidth={2} />
                {!collapsed && SETTINGS_ITEM.label}
              </button>
            )}
            {!collapsed && (
              <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-label={open ? "Zwiń Ustawienia" : "Rozwiń Ustawienia"}
                aria-expanded={open}
                className="rounded-md p-1.5 text-foreground/60 hover:bg-black/5 hover:text-foreground"
              >
                <ChevronDown size={16} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
              </button>
            )}
          </div>
          {!collapsed && open && children.length === 0 && (
            <p className="ml-4 border-l border-border pl-3 text-xs text-muted">Brak dostępnych pozycji.</p>
          )}
          {!collapsed && open && children.length > 0 && (
            <div className="ml-4 flex flex-col gap-0.5 border-l border-border pl-2">
              {children.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={linkClass(pathname.startsWith(item.href)).replace("py-2.5", "py-2")}
                  >
                    <Icon size={16} strokeWidth={2} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
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
