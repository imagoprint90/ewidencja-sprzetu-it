"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

// Czy aktualnie włączony jest ciemny motyw (klasa "dark" na <html>).
export function useIsDark(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false
  );
}

// Kolory wybrane przez użytkownika (kolor statusu/kolumny w tabeli Sprzęt) są zwykle dobrane
// pod jasne tło — w ciemnym motywie podnosimy im jasność (zachowując odcień), żeby ciemny
// granat/czerń nie znikały na ciemnym tle. W jasnym motywie kolor zostaje bez zmian.
export function adaptColorForTheme(hex: string | undefined, dark: boolean): string | undefined {
  if (!hex || !dark) return hex;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  if (l >= 0.6) return hex;
  const newL = 0.72;
  const sat = Math.min(s, 0.85);
  return `hsl(${Math.round(h)} ${Math.round(sat * 100)}% ${Math.round(newL * 100)}%)`;
}
