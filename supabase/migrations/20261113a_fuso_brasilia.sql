-- O app inteiro em horário de Brasília: o banco passa a usar America/Sao_Paulo
-- (current_date, now()::date, date_trunc etc. contam o dia em Brasília). Os horários gravados não mudam;
-- os agendamentos do pg_cron continuam escritos em UTC (cron.timezone = GMT).
alter database postgres set timezone to 'America/Sao_Paulo';
