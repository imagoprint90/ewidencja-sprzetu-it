-- Miejsce na dołączenie podpisanego skanu protokołu (ścieżka w prywatnym Storage).

alter table public.protocols
  add column if not exists signed_scan_path text;
