"use client";

import { useEffect, useRef, useState } from "react";

// Globalny wskaźnik pracy: cienki pasek u góry ekranu, widoczny gdy w tle trwa jakiekolwiek
// żądanie do serwera — zapis (akcje serwerowe), odświeżenie danych albo przejście na inną
// stronę. Liczymy żądania fetch, więc nie trzeba niczego doklejać do poszczególnych przycisków.
// Pasek pojawia się dopiero po krótkiej chwili, żeby błyskawiczne operacje nie migały.
const SHOW_DELAY_MS = 200;

export function BusyIndicator() {
  const [visible, setVisible] = useState(false);
  const pending = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const originalFetch = window.fetch;

    function update() {
      if (pending.current > 0) {
        if (!timer.current) {
          timer.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
        }
      } else {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        setVisible(false);
      }
    }

    window.fetch = async (...args) => {
      pending.current += 1;
      update();
      try {
        return await originalFetch(...args);
      } finally {
        pending.current = Math.max(0, pending.current - 1);
        update();
      }
    };

    return () => {
      window.fetch = originalFetch;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!visible) return null;
  return (
    <div
      role="progressbar"
      aria-label="Trwa przetwarzanie"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-primary/15"
    >
      <div className="busy-bar h-full w-1/3 rounded-full bg-primary" />
    </div>
  );
}