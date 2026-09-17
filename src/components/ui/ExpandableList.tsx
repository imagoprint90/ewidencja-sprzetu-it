"use client";

import { useState } from "react";

export function ExpandableList({
  items,
  emptyLabel = "—",
  visibleCount = 1,
}: {
  items: string[];
  emptyLabel?: string;
  visibleCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return <span className="text-muted">{emptyLabel}</span>;

  const shown = expanded ? items : items.slice(0, visibleCount);
  const rest = items.length - shown.length;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((item, i) => (
        <span
          key={i}
          className="inline-flex rounded bg-black/5 px-1.5 py-0.5 text-xs text-foreground/80"
        >
          {item}
        </span>
      ))}
      {rest > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="text-xs font-medium text-primary hover:underline"
        >
          +{rest} więcej
        </button>
      )}
      {expanded && items.length > visibleCount && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          className="text-xs font-medium text-muted hover:underline"
        >
          zwiń
        </button>
      )}
    </div>
  );
}
