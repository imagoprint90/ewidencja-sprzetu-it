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
  // Ciemne kolory neutralne (grafit, czerń — np. domyślny kolor statusu "Przydzielony") w ciemnym
  // motywie stają się białe, a nie szare.
  if (s < 0.2) return "#ffffff";
  const newL = 0.72;
  const sat = Math.min(s, 0.85);
  return hslToHex(h, sat, newL);
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const hex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}