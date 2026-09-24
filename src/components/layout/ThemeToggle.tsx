"use client";

import { Moon, Sun } from "lucide-react";
import { useIsDark } from "@/lib/useTheme";

// Motyw jest przechowywany jako klasa "dark" na <html> (ustawiana przed pierwszym renderem
// przez skrypt w layout.tsx, żeby nie było mignięcia jasnego motywu) i zapamiętywany w
// localStorage. Komponent tylko odczytuje/przełącza tę klasę.
export function ThemeToggle({ className = "" }: { className?: string }) {
  const dark = useIsDark();

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      window.localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // tryb prywatny — motyw zadziała do końca sesji
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw"}
      title={dark ? "Jasny motyw" : "Ciemny motyw"}
      className={`rounded-lg p-2 text-muted hover:bg-black/5 hover:text-foreground ${className}`}
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
