export type SortDirection = "asc" | "desc";

// Sortuje kopię tablicy wg comparatora znalezionego pod sortKey w mapie comparators (nic nie
// robi, jeśli sortKey jest null albo nie ma dla niego comparatora — czyli kolumna jest
// nieaktywna/niesortowalna).
export function applySort<T>(
  items: T[],
  sortKey: string | null,
  direction: SortDirection,
  comparators: Record<string, (a: T, b: T) => number>
): T[] {
  if (!sortKey) return items;
  const comparator = comparators[sortKey];
  if (!comparator) return items;
  const sorted = [...items].sort(comparator);
  return direction === "asc" ? sorted : sorted.reverse();
}

export function compareStrings(a: string, b: string): number {
  // numeric: true — sortowanie naturalne, żeby "Komputer-10" było po "Komputer-9", a nie po "Komputer-1".
  return a.localeCompare(b, "pl", { numeric: true });
}

export function compareNumbers(a: number, b: number): number {
  return a - b;
}
