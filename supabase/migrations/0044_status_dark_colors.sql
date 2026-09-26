-- Osobne kolory statusów sprzętu dla ciemnego motywu. NULL = kolor liczony automatycznie
-- (rozjaśniony kolor z jasnego motywu).
alter table public.equipment_statuses add column if not exists text_color_dark text;
alter table public.equipment_statuses add column if not exists background_color_dark text;