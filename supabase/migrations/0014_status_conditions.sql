-- Rozszerzenie statusu sprzętu o bardziej szczegółowe stany serwisowe, zamiast
-- osobnego, równoległego pola "Stan" (unikamy dwóch nakładających się źródeł prawdy).
-- "w_magazynie"/"przydzielony" pozostają sterowane automatycznie przez operację
-- "Przekaż sprzęt". Nowe stany "w_naprawie" (zmieniony z "w_serwisie") i "zepsuty"
-- ustawia się ręcznie na liście sprzętu.

alter type public.equipment_status rename value 'w_serwisie' to 'w_naprawie';
alter type public.equipment_status add value if not exists 'zepsuty' after 'w_naprawie';
