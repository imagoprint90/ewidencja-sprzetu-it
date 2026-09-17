import clsx from "clsx";
import type { EquipmentStatus } from "@/lib/types";
import { EQUIPMENT_STATUS_LABELS } from "@/lib/types";

const STATUS_CLASSES: Record<EquipmentStatus, string> = {
  w_magazynie: "bg-green-100 text-green-700",
  przydzielony: "bg-blue-100 text-blue-700",
  w_naprawie: "bg-amber-100 text-amber-700",
  zepsuty: "bg-red-100 text-red-700",
  wycofany: "bg-gray-200 text-gray-600",
};

export function StatusBadge({ status }: { status: EquipmentStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_CLASSES[status]
      )}
    >
      {EQUIPMENT_STATUS_LABELS[status]}
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
    warning: "bg-amber-100 text-amber-700",
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
