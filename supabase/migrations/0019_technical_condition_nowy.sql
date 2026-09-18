-- Dodaje wartość "Nowy" do stanu technicznego sprzętu (najlepszy stan, przed "Bardzo dobry").
alter type public.technical_condition add value if not exists 'nowy' before 'bardzo_dobry';
