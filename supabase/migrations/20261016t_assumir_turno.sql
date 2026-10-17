-- =====================================================================
-- 2026-10-16 (t) — "Assumir este turno": quem confirmou e está sem turno
-- assume o lugar de quem está em dois turnos que ainda não começaram.
-- Troca direta: quem estava em dobro fica só com o outro turno e recebe aviso.
-- Atividades já distribuídas naquele turno passam para quem assumiu.
-- =====================================================================

-- lugares disponíveis para mim (só se estou confirmado e sem turno nesta gira)
create or replace function app.double_turn_offers(p_gira uuid) returns jsonb
language plpgsql stable security definer set search_path = public, app as $$
begin
  if auth.uid() is null then return '[]'::jsonb; end if;
  if not exists(select 1 from public.gira_responses where gira_id = p_gira and profile_id = auth.uid() and status = 'going') then return '[]'::jsonb; end if;
  if exists(select 1 from public.gira_turn_availability a join public.gira_turns t on t.id = a.gira_turn_id
             where t.gira_id = p_gira and a.profile_id = auth.uid()) then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('turn_id', t.id, 'label', t.label, 'shift_date', t.shift_date, 'starts_at', app.turno_inicio(t),
             'from_id', p.id, 'from_name', split_part(trim(p.name), ' ', 1), 'from_orixa', p.orixa_symbol,
             'tasks', (select string_agg(k.name, ' · ' order by k.sort_order) from public.tasks k where k.gira_turn_id = t.id))
           order by app.turno_inicio(t), p.name)
    from public.gira_turns t
    join public.gira_turn_availability a on a.gira_turn_id = t.id
    join public.profiles p on p.id = a.profile_id and p.is_active and not coalesce(p.is_pai_de_santo, false)
    where t.gira_id = p_gira and t.enabled and app.turno_inicio(t) > now()
      and (select count(*) from public.gira_turn_availability a2 join public.gira_turns t2 on t2.id = a2.gira_turn_id
            where t2.gira_id = p_gira and t2.enabled and a2.profile_id = p.id and app.turno_inicio(t2) > now()) >= 2
  ), '[]'::jsonb);
end $$;

create or replace function app.take_double_turn(p_turn uuid, p_from uuid) returns text
language plpgsql security definer set search_path = public, app as $$
declare v_t public.gira_turns; v_me public.profiles; v_from public.profiles; v_outro public.gira_turns;
begin
  if auth.uid() is null then raise exception 'Entre no app.'; end if;
  select * into v_t from public.gira_turns where id = p_turn;
  if v_t.id is null or not v_t.enabled then raise exception 'Turno não encontrado.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_t.gira_id::text, 7));
  if app.turno_inicio(v_t) <= now() then raise exception 'Esse turno já começou.'; end if;
  select * into v_me from public.profiles where id = auth.uid();
  select * into v_from from public.profiles where id = p_from;
  if not exists(select 1 from public.gira_responses where gira_id = v_t.gira_id and profile_id = auth.uid() and status = 'going') then
    raise exception 'Confirme sua presença na gira primeiro.';
  end if;
  if exists(select 1 from public.gira_turn_availability a join public.gira_turns t on t.id = a.gira_turn_id
             where t.gira_id = v_t.gira_id and a.profile_id = auth.uid()) then
    raise exception 'Você já tem um turno nesta gira.';
  end if;
  if not exists(select 1 from public.gira_turn_availability where gira_turn_id = p_turn and profile_id = p_from) then
    raise exception 'Alguém já assumiu esse lugar. Escolha outro.';
  end if;
  select t2.* into v_outro from public.gira_turn_availability a2 join public.gira_turns t2 on t2.id = a2.gira_turn_id
   where t2.gira_id = v_t.gira_id and t2.enabled and a2.profile_id = p_from and t2.id <> p_turn and app.turno_inicio(t2) > now()
   order by app.turno_inicio(t2) limit 1;
  if v_outro.id is null then raise exception 'Essa pessoa não está mais em dois turnos. Escolha outro lugar.'; end if;

  update public.gira_turn_availability set profile_id = auth.uid() where gira_turn_id = p_turn and profile_id = p_from;
  update public.task_assignments set profile_id = auth.uid()
   where profile_id = p_from and task_id in (select id from public.tasks where gira_turn_id = p_turn);
  insert into public.gira_turn_change_notifications(gira_id, profile_id, from_turn_id, to_turn_id, message)
  values (v_t.gira_id, p_from, p_turn, v_outro.id,
          split_part(trim(v_me.name), ' ', 1) || ' assumiu seu lugar em ' || v_t.label || '. Agora você fica só em ' || v_outro.label || '. Obrigado! 🙏🏾');
  perform app.push_enqueue(p_from, 'Você foi liberado de um turno 🙏🏾',
    split_part(trim(v_me.name), ' ', 1) || ' assumiu seu lugar em ' || v_t.label || '. Agora você fica só em ' || v_outro.label || '.',
    '?tela=giras', 'turno-liberado:' || p_turn || ':' || p_from);
  return v_t.label;
end $$;

create or replace function public.double_turn_offers(p_gira uuid) returns jsonb language sql stable security invoker set search_path = public, app as $$ select app.double_turn_offers(p_gira) $$;
create or replace function public.take_double_turn(p_turn uuid, p_from uuid) returns text language sql security invoker set search_path = public, app as $$ select app.take_double_turn(p_turn, p_from) $$;
grant execute on function app.double_turn_offers(uuid), app.take_double_turn(uuid, uuid), public.double_turn_offers(uuid), public.take_double_turn(uuid, uuid) to authenticated;
notify pgrst, 'reload schema';

-- (depois) gira_turns.aberto_troca: se algum turno da gira estiver marcado, só esses aceitam troca
-- (Ancestrais: pós-gira e domingo, os mais pesados). app.turno_aceita_troca(turno) aplica a regra.
-- Link da notificação: ?tela=giras&gira=<id>&aba=turn abre direto na aba do turno.
