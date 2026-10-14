-- =====================================================================
-- 2026-10-13 (l) — Selos exclusivos de eventos
--   * Cada gira/evento pode dar um selo exclusivo (a gestão escolhe).
--   * Quem confirmou "vou" ganha o selo quando o evento começa.
--   * Antes disso, o evento aparece nas insígnias como selo "a conquistar".
-- Pode rodar mais de uma vez. Nada é apagado.
-- =====================================================================
alter table public.giras add column if not exists exclusive_badge boolean not null default false;

create or replace function app.editor_set_gira_badge(p_gira_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public, app as $$
begin
  if not (app.is_admin() or app.is_master() or app.has_permission('giras.manage')) then raise exception 'Acesso negado'; end if;
  update public.giras set exclusive_badge = coalesce(p_on, false) where id = p_gira_id;
end $$;
create or replace function public.editor_set_gira_badge(p_gira_id uuid, p_on boolean) returns void
language sql security invoker set search_path = public, app as $$ select app.editor_set_gira_badge(p_gira_id, p_on) $$;
grant execute on function app.editor_set_gira_badge(uuid, boolean) to authenticated;
grant execute on function public.editor_set_gira_badge(uuid, boolean) to authenticated;

create or replace function app.badge_label(p_badge text) returns text
language sql stable set search_path = public, app as $$
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
    when p_badge like 'evento:%' then coalesce((select 'Selo ' || g.name from public.giras g where g.id::text = substr(p_badge, 8)), 'Selo de evento')
    else p_badge end
$$;

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
  union all
  -- selos exclusivos de eventos: confirmou "vou" e o evento já começou
  select 'evento:' || g.id, 'evento',
         (case when g.starts_at <= now() and exists (select 1 from public.gira_responses x
                where x.gira_id = g.id and x.profile_id = p and x.status = 'going') then 1 else 0 end),
         1, null, g.name
    from public.giras g where g.exclusive_badge and coalesce(g.status, 'published') = 'published'
$$;

-- o EncontrAÇÃO já entra com selo
update public.giras set exclusive_badge = true where id = 'ac1914b2-5078-4a98-8cc6-b2a810011095';

notify pgrst, 'reload schema';

-- emoji do selo, escolhido no cadastro do evento (vazio = 🌟)
alter table public.giras add column if not exists exclusive_badge_icon text;
create or replace function app.editor_set_gira_badge(p_gira_id uuid, p_on boolean, p_icon text) returns void
language plpgsql security definer set search_path = public, app as $$
begin
  if not (app.is_admin() or app.is_master() or app.has_permission('giras.manage')) then raise exception 'Acesso negado'; end if;
  update public.giras set exclusive_badge = coalesce(p_on, false), exclusive_badge_icon = nullif(left(trim(coalesce(p_icon, '')), 16), '') where id = p_gira_id;
end $$;
create or replace function public.editor_set_gira_badge(p_gira_id uuid, p_on boolean, p_icon text) returns void
language sql security invoker set search_path = public, app as $$ select app.editor_set_gira_badge(p_gira_id, p_on, p_icon) $$;
grant execute on function app.editor_set_gira_badge(uuid, boolean, text) to authenticated;
grant execute on function public.editor_set_gira_badge(uuid, boolean, text) to authenticated;
notify pgrst, 'reload schema';
