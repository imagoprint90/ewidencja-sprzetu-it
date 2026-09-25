-- Blokada konta po 5 nieudanych logowaniach pod rząd: dwa nowe typy zdarzeń w dzienniku logowań.
alter table public.login_events drop constraint if exists login_events_event_check;
alter table public.login_events
  add constraint login_events_event_check
  check (event in ('logowanie', 'blad_logowania', 'wylogowanie', 'konto_zablokowane', 'konto_odblokowane'));