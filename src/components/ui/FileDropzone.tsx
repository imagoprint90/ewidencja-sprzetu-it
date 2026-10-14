"use client";

import { useRef, useState } from "react";
import { Paperclip } from "lucide-react";

// Strefa "przeciągnij i upuść albo kliknij" na pliki — sama strefa, bez listy plików (listę
// pokazuje wywołujący: pliki czekające na wysłanie albo już zapisane). Używana w formularzu
// dodawania sprzętu i na karcie sprzętu.
export function FileDropzone({
  onFiles,
  accept,
  hint,
  disabled = false,
}: {
  onFiles: (files: File[]) => void;
  accept: string;
  hint: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function pick() {
    if (!disabled) inputRef.current?.click();
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={pick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            pick();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (!disabled) onFiles(Array.from(e.dataTransfer.files));
        }}
        className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
          isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <Paperclip size={20} className="text-muted" />
        <p className="text-sm">
          <span className="font-medium text-primary">Wybierz pliki</span> albo przeciągnij je tutaj
        </p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </>
  );
}
