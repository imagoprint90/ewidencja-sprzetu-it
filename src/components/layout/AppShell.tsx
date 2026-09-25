"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Footer } from "./Footer";
import { BusyIndicator } from "./BusyIndicator";
import { useLocalStorage } from "@/lib/useLocalStorage";

export function AppShell({
  children,
  userEmail,
}: {
  children: ReactNode;
  userEmail: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useLocalStorage("sidebar-collapsed", false);

  return (
    <div className="flex min-h-screen">
      <BusyIndicator />
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} userEmail={userEmail} />
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
