-- Pole "FortiClient" (TAK/NIE) dla sprzętu — ta sama zasada co "OpenVPN" (has_forticlient,
-- domyślnie false), edytowalne w formularzach i bezpośrednio w kolumnie na liście Sprzęt.
alter table public.equipment add column if not exists has_forticlient boolean not null default false;
