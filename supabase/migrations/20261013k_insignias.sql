-- =====================================================================
-- 2026-10-13 (k) — Insígnias e missões
--   * O app calcula sozinho o progresso de cada pessoa a partir do que já
--     registra (leituras, respostas de gira, turnos, mural, avisos, cadastro).
--   * Pontuais: Antena ligada, Guardião das regras, Cadastro completo.
--   * Com 6 níveis: Palavra dada, Sabedoria da casa, Responde presente, Mão na massa,
--     Axé que circula, Voz da comunidade.
--   * Coleção Ẹ̀mí Ìlú: um selo por edição lida até o fim.
--   * Conquistas ficam guardadas (badge_awards); o app comemora as novas e,
--     uma vez por dia, quem conquistou algo recebe aviso no celular.
-- Pode rodar mais de uma vez. Nada é apagado.
-- =====================================================================

create table if not exists public.badge_awards (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge      text not null,
  level      int  not null default 1,
  awarded_at timestamptz not null default now(),
  seen_at    timestamptz,
  primary key (profile_id, badge, level)
);
alter table public.badge_awards enable row level security;
do $$ begin
  create policy "insignias: vejo as minhas" on public.badge_awards
    for select to authenticated using (profile_id = auth.uid());
exception when duplicate_object then null; end $$;
grant select on public.badge_awards to authenticated;

-- nomes usados no aviso do celular
create or replace function app.badge_label(p_badge text) returns text
language sql immutable as $$
  select case
    when p_badge = 'antena'    then 'Antena ligada'
    when p_badge = 'regras'    then 'Guardião das regras'
    when p_badge = 'palavra'   then 'Palavra dada'
    when p_badge = 'cadastro'  then 'Cadastro completo'
    when p_badge = 'sabedoria' then 'Sabedoria da casa'
    when p_badge = 'responde'  then 'Responde presente'
    when p_badge = 'mao'       then 'Mão na massa'
    when p_badge = 'axe'       then 'Axé que circula'
    when p_badge = 'voz'       then 'Voz da comunidade'
    when p_badge like 'emi:%'  then 'Ẹ̀mí Ìlú ' || substr(p_badge, 5)
    else p_badge end
$$;

-- progresso de uma pessoa em cada missão
-- kind: 'unico' (vale quando value >= goal e goal > 0), 'niveis' (thresholds), 'colecao'
create or replace function app.badge_state(p uuid)
returns table (badge text, kind text, value int, goal int, thresholds int[], title text)
language sql stable security definer set search_path = public, app as $$
  select 'antena', 'unico',
         (select least(count(*), 1) from public.push_subscriptions s where s.profile_id = p)::int, 1, null::int[], null::text
  union all
  -- regras: lidas; se a regra é obrigatória, precisa do "Li e entendi"
  select 'regras', 'unico',
         (select count(*) from public.house_contents c
           where c.content_type = 'rule' and not c.is_draft
             and exists (select 1 from public.house_content_reads r where r.content_id = c.id and r.profile_id = p
                          and (not c.is_required or r.confirmed_at is not null)))::int,
         (select count(*) from public.house_contents c where c.content_type = 'rule' and not c.is_draft)::int, null, null
  union all
  select 'cadastro', 'unico',
         (select (case when nullif(trim(coalesce(orixa_symbol, '')), '') is not null then 1 else 0 end)
               + (case when nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '') is not null then 1 else 0 end)
               + (case when date_of_birth is not null then 1 else 0 end)
            from public.profiles where id = p)::int, 3, null, null
  union all
  select 'palavra', 'niveis',
         (select count(*) from public.house_content_reads r join public.house_contents c on c.id = r.content_id
           where r.profile_id = p and r.confirmed_at is not null and c.is_required and not c.is_draft)::int,
         null, array[1, 3, 5, 8, 12, 20], null
  union all
  select 'sabedoria', 'niveis',
         (select count(distinct r.content_id) from public.house_content_reads r
            join public.house_contents c on c.id = r.content_id
           where r.profile_id = p and c.content_type = 'content' and not c.is_draft)::int,
         null, array[1, 3, 6, 10, 15, 25], null
  union all
  select 'responde', 'niveis',
         (select count(*) from public.gira_responses x join public.giras g on g.id = x.gira_id
           where x.profile_id = p and x.status is not null and coalesce(g.status, 'published') = 'published')::int,
         null, array[1, 3, 6, 10, 20, 35], null
  union all
  select 'mao', 'niveis',
         ((select count(distinct t.gira_id) from public.gira_turn_availability a join public.gira_turns t on t.id = a.gira_turn_id
            where a.profile_id = p)
        + (select count(*) from public.task_status s where s.completed_by = p and s.done))::int,
         null, array[1, 3, 6, 10, 20, 35], null
  union all
  select 'axe', 'niveis',
         (select count(*) from public.community_post_reactions r join public.community_posts po on po.id = r.post_id
           where r.profile_id = p and po.author_id <> p)::int,
         null, array[1, 5, 15, 30, 60, 100], null
  union all
  select 'voz', 'niveis',
         ((select count(*) from public.community_posts po where po.author_id = p)
        + (select count(*) from public.community_post_comments c where c.author_id = p))::int,
         null, array[1, 3, 8, 15, 30, 50], null
  union all
  select 'emi:' || e.slug, 'colecao',
         (case when exists (select 1 from public.newsletter_reads r where r.edition_id = e.id and r.profile_id = p and r.finished_at is not null) then 1 else 0 end),
         1, null, e.title
    from public.newsletter_editions e where e.status = 'published'
$$;

-- nível alcançado a partir do estado
create or replace function app.badge_level(p_kind text, p_value int, p_goal int, p_thresholds int[]) returns int
language sql immutable as $$
  select case
    when p_kind = 'niveis' then (select count(*)::int from unnest(p_thresholds) t where p_value >= t)
    else case when coalesce(p_goal, 0) > 0 and p_value >= p_goal then 1 else 0 end end
$$;

-- guarda as conquistas novas; com p_push, avisa no celular (uma mensagem por pessoa)
create or replace function app.sync_badges(p uuid, p_push boolean default false) returns int
language plpgsql security definer set search_path = public, app as $$
declare v_new int := 0; v_names text[] := '{}'; r record; n int;
begin
  for r in select s.badge, app.badge_level(s.kind, s.value, s.goal, s.thresholds) as lvl from app.badge_state(p) s loop
    if r.lvl > 0 then
      insert into public.badge_awards(profile_id, badge, level, seen_at)
      select p, r.badge, l, null from generate_series(1, r.lvl) l
      on conflict do nothing;
      get diagnostics n = row_count;
      if n > 0 then v_new := v_new + n; v_names := array_append(v_names, app.badge_label(r.badge)); end if;
    end if;
  end loop;
  if p_push and v_new > 0 then
    perform app.push_enqueue(p,
      case when cardinality(v_names) = 1 then 'Nova insígnia: ' || v_names[1] || ' 🏅' else 'Você conquistou ' || cardinality(v_names) || ' insígnias 🏅' end,
      'Toque para ver suas missões e o que falta para o próximo nível.',
      '?tela=insignias', 'insignias:' || to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM-DD'));
  end if;
  return v_new;
end $$;

create or replace function app.sync_all_badges(p_push boolean default true) returns int
language plpgsql security definer set search_path = public, app as $$
declare r record; v int := 0;
begin
  for r in select id from public.profiles where is_active loop
    v := v + app.sync_badges(r.id, p_push);
  end loop;
  return v;
end $$;

-- as minhas insígnias (o app chama ao abrir)
create or replace function app.my_badges() returns jsonb
language plpgsql security definer set search_path = public, app as $$
begin
  if auth.uid() is null or not app.is_active_member() then return '{}'::jsonb; end if;
  perform app.sync_badges(auth.uid(), false);
  return jsonb_build_object(
    'state', (select coalesce(jsonb_agg(to_jsonb(s) || jsonb_build_object('level', app.badge_level(s.kind, s.value, s.goal, s.thresholds))), '[]') from app.badge_state(auth.uid()) s),
    'awards', (select coalesce(jsonb_agg(to_jsonb(a) order by a.awarded_at), '[]') from public.badge_awards a where a.profile_id = auth.uid()));
end $$;
create or replace function public.my_badges() returns jsonb
language sql security invoker set search_path = public, app as $$ select app.my_badges() $$;

create or replace function app.mark_badges_seen() returns void
language sql security definer set search_path = public, app as $$
  update public.badge_awards set seen_at = now() where profile_id = auth.uid() and seen_at is null;
$$;
create or replace function public.mark_badges_seen() returns void
language sql security invoker set search_path = public, app as $$ select app.mark_badges_seen() $$;

-- gestão: progresso de todo mundo
create or replace function app.admin_badges_overview()
returns table (profile_id uuid, name text, orixa_symbol text, phone text, badge text, kind text, value int, goal int, level int)
language plpgsql stable security definer set search_path = public, app as $$
begin
  if not (app.is_admin() or app.is_master() or app.has_permission('people.manage')) then raise exception 'Acesso negado'; end if;
  return query
  select pr.id, pr.name, pr.orixa_symbol, pr.phone, s.badge, s.kind, s.value, s.goal,
         app.badge_level(s.kind, s.value, s.goal, s.thresholds)
    from public.profiles pr cross join lateral app.badge_state(pr.id) s
   where pr.is_active
   order by pr.name;
end $$;
create or replace function public.admin_badges_overview()
returns table (profile_id uuid, name text, orixa_symbol text, phone text, badge text, kind text, value int, goal int, level int)
language sql stable security invoker set search_path = public, app as $$ select * from app.admin_badges_overview() $$;

grant execute on function public.my_badges() to authenticated;
grant execute on function app.my_badges() to authenticated;
grant execute on function public.mark_badges_seen() to authenticated;
grant execute on function app.mark_badges_seen() to authenticated;
grant execute on function public.admin_badges_overview() to authenticated;
grant execute on function app.admin_badges_overview() to authenticated;

-- aviso diário de conquistas novas (12h05 UTC = 9h05 em São Paulo)
do $$ begin
  if not exists (select 1 from cron.job where jobname = 'tpbc-insignias') then
    perform cron.schedule('tpbc-insignias', '5 12 * * *', 'select app.sync_all_badges(true)');
  end if;
end $$;

notify pgrst, 'reload schema';
