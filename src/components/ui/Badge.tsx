"use client";

import clsx from "clsx";
import type { EquipmentStatus } from "@/lib/types";
import { resolveStatusColors, useStatusLookup } from "@/lib/statuses-context";
import { useIsDark } from "@/lib/useTheme";

// Wygląd plakietki statusu pochodzi ze słownika statusów (kolor tekstu + jego lekkie tło).
export function StatusBadge({ status }: { status: EquipmentStatus }) {
  const lookup = useStatusLookup();
  const isDark = useIsDark();
  const def = lookup(status);
  const color = resolveStatusColors(def, isDark).text;
  return (
    <span
      className="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ color, backgroundColor: `${def.textColor}22` }}
    >
      {def.label}
    </span>
  );
}
export function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClasses = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-orange-100 text-orange-700",
    danger: "bg-red-100 text-red-700",
  }[tone];
  return (
    <span
      className={clsx(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses
      )}
    >
      {children}
    </span>
  );
}
