-- =====================================================================
-- 2026-10-16 (p) — Turnos: regras novas (valem para giras a partir de 19/10/2026)
--   1. Pais de santo não ocupam vaga nem entram na contagem dos turnos.
--   2. Cada filho da casa escolhe um turno só por gira.
--   3. Lembrete do turno: véspera às 20h e 2 horas antes.
--   4. Gestão recebe alerta às 10h da véspera se algum turno está vazio ou com pouca gente.
-- A Gira de Ancestrais (17/10) continua exatamente como estava.
-- =====================================================================

create or replace function app.turnos_regra_nova(p_gira_id uuid) returns boolean
language sql stable security definer set search_path = public, app as $$
  select coalesce((select starts_at >= timestamptz '2026-10-19 00:00:00-03' from public.giras where id = p_gira_id), false)
$$;

create or replace function app.turno_inicio(p_turn public.gira_turns) returns timestamptz
language sql stable security definer set search_path = public, app as $$
  select case when p_turn.starts_at is null then null
    else ((coalesce(p_turn.shift_date, (select (g.starts_at at time zone 'America/Sao_Paulo')::date from public.giras g where g.id = p_turn.gira_id))
           + p_turn.starts_at) at time zone 'America/Sao_Paulo') end
$$;

-- contagem: pais de santo não ocupam vaga (regra nova)
create or replace function app.gira_turn_summary(p_gira_id uuid)
returns table(turn_id uuid, turn_key text, label text, capacity integer, occupied bigint, available bigint, is_full boolean)
language sql stable security definer set search_path = public, app as $$
  with c as (
    select t.id, t.turn_key, t.label, t.capacity, t.sort_order,
      count(a.id) filter (where not app.turnos_regra_nova(p_gira_id) or not coalesce(p.is_pai_de_santo, false))::integer as n
    from public.gira_turns t
    left join public.gira_turn_availability a on a.gira_turn_id = t.id
    left join public.profiles p on p.id = a.profile_id
    where t.gira_id = p_gira_id and t.enabled = true
    group by t.id, t.turn_key, t.label, t.capacity, t.sort_order)
  select id, turn_key, label, capacity, n::bigint, greatest(capacity - n, 0)::bigint, n >= capacity
  from c order by sort_order
$$;

create or replace function app.set_gira_turn_availability(p_gira_turn_id uuid, p_available boolean)
returns boolean language plpgsql security definer set search_path = public, app as $$
declare v_gira_id uuid; v_capacity integer; v_count integer; v_nova boolean; v_pai boolean;
begin
  select gira_id, capacity into v_gira_id, v_capacity from public.gira_turns where id = p_gira_turn_id;
  if v_gira_id is null then raise exception 'Turno não encontrado.'; end if;
  if not app.gira_availability_open(v_gira_id) then
    raise exception 'O prazo para informar disponibilidade está fechado.';
  end if;
  if not exists(select 1 from public.gira_responses where gira_id = v_gira_id and profile_id = auth.uid() and status = 'going') then
    raise exception 'Confirme que você vai participar antes de indicar disponibilidade.';
  end if;
  v_nova := app.turnos_regra_nova(v_gira_id);
  select coalesce(is_pai_de_santo, false) into v_pai from public.profiles where id = auth.uid();
  perform pg_advisory_xact_lock(hashtextextended(p_gira_turn_id::text, 0));
  if p_available then
    if v_nova and not v_pai and exists(
      select 1 from public.gira_turn_availability a join public.gira_turns t on t.id = a.gira_turn_id
       where t.gira_id = v_gira_id and a.profile_id = auth.uid() and a.gira_turn_id <> p_gira_turn_id) then
      raise exception 'Você já escolheu um turno nesta gira. Para trocar, desmarque o outro primeiro.';
    end if;
    if not (v_nova and v_pai) then
      select count(*) into v_count from public.gira_turn_availability a join public.profiles p on p.id = a.profile_id
       where a.gira_turn_id = p_gira_turn_id and (not v_nova or not coalesce(p.is_pai_de_santo, false));
      if v_count >= v_capacity then raise exception 'Este turno está completo.'; end if;
    end if;
    insert into public.gira_turn_availability(gira_turn_id, profile_id) values (p_gira_turn_id, auth.uid()) on conflict do nothing;
  else
    delete from public.gira_turn_availability where gira_turn_id = p_gira_turn_id and profile_id = auth.uid();
  end if;
  return true;
end $$;

-- lembretes do turno + alerta da gestão (roda de hora em hora)
create or replace function app.push_turn_reminders() returns integer
language plpgsql security definer set search_path = public, app as $$
declare
  v_now timestamptz := now();
  v_local timestamp := now() at time zone 'America/Sao_Paulo';
  v_n int := 0; r record; v_txt text;
begin
  for r in
    select t.id as turn_id, t.label, g.id as gira_id, g.name as gira, a.profile_id, app.turno_inicio(t) as inicio,
      (select string_agg(tk.name, ', ' order by tk.sort_order) from public.tasks tk
         join public.task_assignments ta on ta.task_id = tk.id
        where tk.gira_turn_id = t.id and ta.profile_id = a.profile_id) as tarefas
    from public.gira_turns t
    join public.giras g on g.id = t.gira_id and coalesce(g.status, 'published') = 'published'
    join public.gira_turn_availability a on a.gira_turn_id = t.id
    join public.profiles p on p.id = a.profile_id and p.is_active
    where t.enabled and app.turnos_regra_nova(g.id) and app.turno_inicio(t) > v_now
      and app.turno_inicio(t) < v_now + interval '30 hours'
  loop
    v_txt := r.gira || ': ' || r.label || coalesce('. ' || r.tarefas, '') || '.';
    -- véspera, às 20h
    if extract(hour from v_local) = 20 and (r.inicio at time zone 'America/Sao_Paulo')::date = v_local::date + 1 then
      perform app.push_enqueue(r.profile_id, 'Amanhã é seu turno, às ' || regexp_replace(to_char(r.inicio at time zone 'America/Sao_Paulo', 'FMHH24"h"MI'), 'h00$', 'h') || ' 🕯️',
        v_txt, '?tela=giras', 'turno-vespera:' || r.turn_id);
      v_n := v_n + 1;
    end if;
    -- 2 horas antes
    if r.inicio > v_now + interval '1 hour' and r.inicio <= v_now + interval '2 hours' then
      perform app.push_enqueue(r.profile_id, 'Seu turno é hoje, às ' || regexp_replace(to_char(r.inicio at time zone 'America/Sao_Paulo', 'FMHH24"h"MI'), 'h00$', 'h') || ' 🕯️',
        v_txt, '?tela=giras', 'turno-2h:' || r.turn_id);
      v_n := v_n + 1;
    end if;
  end loop;

  -- gestão: às 10h, turnos de amanhã vazios ou abaixo da metade
  if extract(hour from v_local) = 10 then
    for r in
      select g.id as gira_id, g.name as gira,
        string_agg(t.label || ': ' || x.n || ' de ' || t.capacity, ' · ' order by t.sort_order) as lista
      from public.gira_turns t
      join public.giras g on g.id = t.gira_id and coalesce(g.status, 'published') = 'published'
      cross join lateral (select count(*)::int as n from public.gira_turn_availability a join public.profiles p on p.id = a.profile_id
                           where a.gira_turn_id = t.id and not coalesce(p.is_pai_de_santo, false)) x
      where t.enabled and app.turnos_regra_nova(g.id)
        and (app.turno_inicio(t) at time zone 'America/Sao_Paulo')::date = v_local::date + 1
        and x.n * 2 < t.capacity
      group by g.id, g.name
    loop
      perform app.push_enqueue(pr.id, 'Turnos com pouca gente amanhã ⚠️', r.gira || ' · ' || r.lista, '?tela=admin',
        'turno-alerta:' || r.gira_id || ':' || to_char(v_local, 'YYYY-MM-DD'))
        from public.profiles pr where pr.is_active and (pr.role = 'admin' or pr.is_master);
      v_n := v_n + 1;
    end loop;
  end if;
  return v_n;
end $$;

select cron.schedule('tpbc-turnos', '0 * * * *', 'select app.push_turn_reminders()');

notify pgrst, 'reload schema';
