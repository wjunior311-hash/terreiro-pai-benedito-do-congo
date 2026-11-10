-- Avisos da tela inicial somem quando a pessoa age:
-- respondeu a gira -> some "Nova gira publicada" (e tudo da gira, se marcou que não vai);
-- escolheu turno -> some qualquer aviso pendente daquela gira. Também limpa avisos de giras que já passaram.
create or replace function app.limpa_avisos_ao_responder() returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  update public.gira_turn_availability_notifications set read_at = now()
   where gira_id = new.gira_id and profile_id = new.profile_id and read_at is null
     and (message like 'Nova gira publicada%' or new.status = 'not_going');
  return new;
end $$;
create or replace trigger gira_responses_limpa_avisos after insert or update of status on public.gira_responses
  for each row execute function app.limpa_avisos_ao_responder();
create or replace function app.limpa_avisos_ao_escolher_turno() returns trigger language plpgsql security definer set search_path = public, app as $$
declare v_gira uuid;
begin
  select gira_id into v_gira from public.gira_turns where id = new.gira_turn_id;
  update public.gira_turn_availability_notifications set read_at = now()
   where gira_id = v_gira and profile_id = new.profile_id and read_at is null;
  return new;
end $$;
create or replace trigger gira_turn_availability_limpa_avisos after insert on public.gira_turn_availability
  for each row execute function app.limpa_avisos_ao_escolher_turno();
