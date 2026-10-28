-- 10 novas insígnias (28/10/2026): Sequência de axé, Primeira gira do ano, Chegou cedo, Leitor(a) da Ẹ̀mí Ìlú,
-- Curioso(a), Raiz, Parabéns com axé, Minha voz na roda, Festa da Abundância e Mutirão da reforma (concedido pela casa).
create table if not exists public.badge_grants (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge text not null,
  granted_by uuid,
  granted_at timestamptz not null default now(),
  primary key (profile_id, badge)
);
alter table public.badge_grants enable row level security;

create or replace function app.badge_state(p uuid)
 returns table(badge text, kind text, value integer, goal integer, thresholds integer[], title text)
 language sql stable security definer set search_path to 'public', 'app'
as $function$
  select 'antena', 'unico',
         (select least(count(*), 1) from public.push_subscriptions s where s.profile_id = p)::int, 1, null::int[], null::text
  union all
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
  select 'avatar', 'unico', (case when pr.avatar is not null then 1 else 0 end), 1, null, null
    from public.profiles pr where pr.id = p and (pr.avatar is not null or now() >= timestamptz '2026-10-28 00:00-03')
  union all
  -- Curioso(a): mandou uma dúvida para os Pais (as anônimas não contam, para não revelar quem perguntou)
  select 'curioso', 'unico', (select least(count(*), 1) from public.house_questions q where q.author_id = p and not coalesce(q.is_anonymous, false))::int, 1, null, null
  union all
  -- Parabéns com axé: mandou parabéns no Mural (publicação ou comentário) para 5 irmãos diferentes
  select 'parabens', 'unico', (select count(distinct lower(trim(m[1]))) from (
           select regexp_match(body, 'anivers[aá]rio,?\s+([^!.,\n]+)', 'i') m from public.community_posts where author_id = p
           union all
           select regexp_match(body, 'anivers[aá]rio,?\s+([^!.,\n]+)', 'i') from public.community_post_comments where author_id = p) x
          where m is not null)::int, 5, null, null
  union all
  -- Minha voz na roda: primeira publicação no Mural
  select 'roda', 'unico', (select least(count(*), 1) from public.community_posts po where po.author_id = p)::int, 1, null, null
  union all
  select 'palavra', 'niveis',
         (select count(*) from public.house_content_reads r join public.house_contents c on c.id = r.content_id
           where r.profile_id = p and r.confirmed_at is not null and c.is_required and not c.is_draft)::int,
         (select count(*) from public.house_contents c where c.is_required and not c.is_draft)::int, array[1, 3, 5, 8, 12, 20], null
  union all
  select 'sabedoria', 'niveis',
         (select count(distinct r.content_id) from public.house_content_reads r
            join public.house_contents c on c.id = r.content_id
           where r.profile_id = p and c.content_type = 'content' and not c.is_draft)::int,
         (select count(*) from public.house_contents c where c.content_type = 'content' and not c.is_draft)::int, array[1, 3, 6, 10, 15, 25], null
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
  -- Sequência de axé: meses (já encerrados) em que a pessoa confirmou todas as giras do mês
  select 'sequencia', 'niveis', (select count(*) from (
           select date_trunc('month', g.starts_at at time zone 'America/Sao_Paulo') mes,
                  bool_and(exists (select 1 from public.gira_responses x where x.gira_id = g.id and x.profile_id = p and x.status = 'going')) todas
             from public.giras g
            where coalesce(g.status, 'published') = 'published'
              and g.activity_type in ('gira', 'desenvolvimento', 'interna', 'festa', 'quintal')
              and g.starts_at < date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
            group by 1) m where m.todas)::int,
         null, array[1, 2, 3, 6, 9, 12], null
  union all
  -- Primeira gira do ano: esteve (confirmou) na primeira gira de cada ano
  select 'abertura', 'niveis', (select count(*) from (
           select distinct on (extract(year from g.starts_at at time zone 'America/Sao_Paulo')) g.id
             from public.giras g
            where coalesce(g.status, 'published') = 'published' and g.activity_type not in ('reuniao', 'outra')
            order by extract(year from g.starts_at at time zone 'America/Sao_Paulo'), g.starts_at) f
          where exists (select 1 from public.giras g2 where g2.id = f.id and g2.starts_at <= now())
            and exists (select 1 from public.gira_responses x where x.gira_id = f.id and x.profile_id = p and x.status = 'going'))::int,
         null, array[1, 2, 3, 5, 7, 10], null
  union all
  -- Chegou cedo: confirmou presença nas primeiras 24 horas depois da gira publicada
  select 'cedo', 'niveis', (select count(*) from public.gira_responses x join public.giras g on g.id = x.gira_id
          where x.profile_id = p and x.status = 'going' and g.published_at is not null
            and coalesce(g.status, 'published') = 'published'
            and x.created_at <= g.published_at + interval '24 hours')::int,
         null, array[1, 3, 6, 10, 20, 35], null
  union all
  -- Leitor(a) da Ẹ̀mí Ìlú: edições lidas até o fim
  select 'leitor', 'niveis', (select count(*) from public.newsletter_reads r join public.newsletter_editions e on e.id = r.edition_id
          where r.profile_id = p and r.finished_at is not null and e.status = 'published')::int,
         null, array[3, 6, 9, 12, 18, 24], null
  union all
  -- Raiz: anos de casa, pelo "Na casa desde" do perfil
  select 'raiz', 'niveis', (select greatest(0, extract(year from now() at time zone 'America/Sao_Paulo')::int - pr.na_casa_desde)
            from public.profiles pr where pr.id = p and pr.na_casa_desde is not null)::int,
         null, array[1, 2, 3, 5, 7, 10], null
  union all
  select 'emi:' || e.slug, 'colecao',
         (case when exists (select 1 from public.newsletter_reads r where r.edition_id = e.id and r.profile_id = p and r.finished_at is not null) then 1 else 0 end),
         1, null, e.title
    from public.newsletter_editions e where e.status = 'published'
  union all
  select 'evento:' || g.id, 'evento',
         (case when g.starts_at <= now() and exists (select 1 from public.gira_responses x
                where x.gira_id = g.id and x.profile_id = p and x.status = 'going') then 1 else 0 end),
         1, null, g.name
    from public.giras g where g.exclusive_badge and coalesce(g.status, 'published') = 'published'
  union all
  select 'democracia', 'especial', 1, 1, null, 'Democracia'
   where exists (select 1 from public.profiles pr where pr.id = p and pr.created_at < timestamptz '2026-10-28 00:00-03')
  union all
  -- Festa da Abundância: esteve na festa
  select 'abundancia', 'especial', 1, 1, null, 'Festa da Abundância'
   where exists (select 1 from public.gira_responses x join public.giras g on g.id = x.gira_id
                  where x.profile_id = p and x.status = 'going' and g.name ilike '%abund%' and g.starts_at <= now()
                    and coalesce(g.status, 'published') = 'published')
  union all
  -- selos concedidos pela casa (ex.: Mutirão da reforma)
  select gr.badge, 'especial', 1, 1, null, null from public.badge_grants gr where gr.profile_id = p
$function$;

create or replace function app.badge_label(p_badge text)
 returns text language sql stable set search_path to 'public', 'app'
as $function$
  select case
    when p_badge = 'antena'    then 'Antena ligada'
    when p_badge = 'regras'    then 'Guardião das regras'
    when p_badge = 'palavra'   then 'Palavra dada'
    when p_badge = 'cadastro'  then 'Cadastro completo'
    when p_badge = 'avatar'    then 'Autorretrato 🎨'
    when p_badge = 'curioso'   then 'Curioso(a) 🤔'
    when p_badge = 'parabens'  then 'Parabéns com axé 🎂'
    when p_badge = 'roda'      then 'Minha voz na roda 🪶'
    when p_badge = 'sabedoria' then 'Sabedoria da casa'
    when p_badge = 'responde'  then 'Responde presente'
    when p_badge = 'mao'       then 'Mão na massa'
    when p_badge = 'axe'       then 'Axé que circula'
    when p_badge = 'voz'       then 'Voz da comunidade'
    when p_badge = 'sequencia' then 'Sequência de axé 🔥'
    when p_badge = 'abertura'  then 'Primeira gira do ano 🌅'
    when p_badge = 'cedo'      then 'Chegou cedo ⏰'
    when p_badge = 'leitor'    then 'Leitor(a) da Ẹ̀mí Ìlú 📚'
    when p_badge = 'raiz'      then 'Raiz 🪵'
    when p_badge = 'democracia' then 'Democracia ⭐'
    when p_badge = 'abundancia' then 'Festa da Abundância 🌾'
    when p_badge = 'mutirao'   then 'Mutirão da reforma 🧱'
    when p_badge like 'emi:%'  then 'Ẹ̀mí Ìlú ' || substr(p_badge, 5)
    when p_badge like 'evento:%' then coalesce((select 'Selo ' || g.name from public.giras g where g.id::text = substr(p_badge, 8)), 'Selo de evento')
    else p_badge end
$function$;

-- gestão: conceder selos especiais da casa (como as demais insígnias, uma vez dado, fica)
create or replace function app.admin_badge_grant(p_badge text, p_profiles uuid[], p_on boolean)
returns integer language plpgsql security definer set search_path = public, app as $$
declare v int := 0; r uuid;
begin
  if not (app.is_admin() or app.is_master() or app.has_permission('people.manage')) then raise exception 'Acesso negado'; end if;
  if p_badge not in ('mutirao') then raise exception 'Selo inválido.'; end if;
  foreach r in array coalesce(p_profiles, '{}') loop
    insert into public.badge_grants(profile_id, badge, granted_by) values (r, p_badge, auth.uid()) on conflict do nothing;
    perform app.sync_badges(r, true);
    v := v + 1;
  end loop;
  return v;
end $$;

create or replace function app.admin_badge_grants(p_badge text)
returns table(profile_id uuid) language plpgsql stable security definer set search_path = public, app as $$
begin
  if not (app.is_admin() or app.is_master() or app.has_permission('people.manage')) then raise exception 'Acesso negado'; end if;
  return query select g.profile_id from public.badge_grants g where g.badge = p_badge;
end $$;

create or replace function public.admin_badge_grant(p_badge text, p_profiles uuid[], p_on boolean) returns integer language sql security invoker set search_path = public, app as $$ select app.admin_badge_grant(p_badge, p_profiles, p_on) $$;
create or replace function public.admin_badge_grants(p_badge text) returns table(profile_id uuid) language sql stable security invoker set search_path = public, app as $$ select * from app.admin_badge_grants(p_badge) $$;
grant execute on function app.admin_badge_grant(text, uuid[], boolean), app.admin_badge_grants(text), public.admin_badge_grant(text, uuid[], boolean), public.admin_badge_grants(text) to authenticated;
notify pgrst, 'reload schema';
