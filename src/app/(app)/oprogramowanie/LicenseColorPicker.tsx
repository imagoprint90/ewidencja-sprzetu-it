"use client";

// Wybór koloru czcionki licencji: gotowe kolory + własny (natywny wybierak) + "Domyślny"
// (null = bez koloru, tak jak przed wprowadzeniem tej funkcji).
const PRESETS = ["#dc2626", "#ef7d00", "#ca8a04", "#16a34a", "#0d9488", "#2563eb", "#7c3aed", "#db2777"];

export function LicenseColorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`rounded-full border px-2.5 py-1 text-xs ${
          value === null ? "border-primary bg-primary/10 text-primary" : "border-border text-muted hover:text-foreground"
        }`}
      >
        Domyślny
      </button>
      {PRESETS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          title={c}
          aria-label={`Kolor ${c}`}
          style={{ backgroundColor: c }}
          className={`h-6 w-6 rounded-full border-2 ${
            value?.toLowerCase() === c ? "border-foreground" : "border-transparent"
          }`}
        />
      ))}
      <label className="flex items-center gap-1.5 text-xs text-muted">
        <input
          type="color"
          value={value ?? "#808080"}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
          aria-label="Własny kolor"
        />
        własny
      </label>
    </div>
  );
}
