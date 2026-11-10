-- Gira com UM turno só: quem confirma presença entra nele automaticamente (e sai se mudar para "não vou").
-- Se passar das vagas do turno, as vagas acompanham. Aplicado em 04/11/2026 e preenchido para quem já tinha
-- confirmado no Festival dos Orixás (26 pessoas) e na Gira de desenvolvimento de 08/11 (15 pessoas).
create or replace function app.trg_gira_response_turno_unico()
returns trigger language plpgsql security definer set search_path = public, app as $$
declare v_turn uuid; v_n int;
begin
  select count(*), (array_agg(t.id))[1] into v_n, v_turn
    from public.gira_turns t join public.giras g on g.id = t.gira_id
   where t.gira_id = new.gira_id and t.enabled and g.has_activity_shifts;
  if v_n <> 1 then return new; end if;
  if new.status = 'going' then
    if not exists (select 1 from public.gira_turn_availability a where a.gira_turn_id = v_turn and a.profile_id = new.profile_id) then
      insert into public.gira_turn_availability(gira_turn_id, profile_id) values (v_turn, new.profile_id);
      update public.gira_turns set capacity = greatest(capacity, (select count(*) from public.gira_turn_availability a where a.gira_turn_id = v_turn)) where id = v_turn;
    end if;
  elsif tg_op = 'UPDATE' and old.status = 'going' then
    delete from public.gira_turn_availability where gira_turn_id = v_turn and profile_id = new.profile_id;
  end if;
  return new;
end $$;
create or replace trigger gira_responses_turno_unico after insert or update of status on public.gira_responses
  for each row execute function app.trg_gira_response_turno_unico();
