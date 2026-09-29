-- Pole "OpenVPN" (TAK/NIE) dla sprzętu — ta sama zasada co "Domena" (has_openvpn, domyślnie
-- false), edytowalne w formularzach i bezpośrednio w kolumnie na liście Sprzęt.
alter table public.equipment add column if not exists has_openvpn boolean not null default false;
