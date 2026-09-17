-- Prywatny magazyn dokumentów (protokoły PDF, podpisane skany).
-- Bucket tworzymy jako prywatny (public = false) — pliki są dostępne wyłącznie
-- przez podpisane, czasowo ograniczone URL-e generowane po stronie serwera dla
-- zalogowanych użytkowników z odpowiednią rolą, nigdy przez stały publiczny link.

insert into storage.buckets (id, name, public)
values ('protokoly', 'protokoly', false)
on conflict (id) do nothing;

create policy "odczyt dokumentow dla zalogowanych" on storage.objects
  for select using (bucket_id = 'protokoly' and auth.uid() is not null);

create policy "admin wgrywa dokumenty" on storage.objects
  for insert with check (bucket_id = 'protokoly' and public.is_admin());

create policy "admin aktualizuje dokumenty" on storage.objects
  for update using (bucket_id = 'protokoly' and public.is_admin());

create policy "admin usuwa dokumenty" on storage.objects
  for delete using (bucket_id = 'protokoly' and public.is_admin());
