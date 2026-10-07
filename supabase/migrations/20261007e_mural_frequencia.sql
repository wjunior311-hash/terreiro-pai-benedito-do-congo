-- =====================================================================
-- 2026-10-07 (e) — Mural: reações "axé" e comentários · Frequência
-- Pode rodar mais de uma vez sem problema (idempotente).
-- =====================================================================

-- telefone (WhatsApp) no cadastro — usado na Frequência para chamar quem sumiu
alter table public.profiles add column if not exists phone text;

-- ---------- Reações (axé 🙏) ----------
create table if not exists public.community_post_reactions (
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  kind       text not null default 'axe' check (kind in ('axe')),
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id, kind)
);
create index if not exists community_post_reactions_post_idx on public.community_post_reactions(post_id);

alter table public.community_post_reactions enable row level security;
drop policy if exists "reacoes: membros veem" on public.community_post_reactions;
create policy "reacoes: membros veem" on public.community_post_reactions
  for select to authenticated using (app.is_active_member());
drop policy if exists "reacoes: eu reajo" on public.community_post_reactions;
create policy "reacoes: eu reajo" on public.community_post_reactions
  for insert to authenticated with check (profile_id = auth.uid() and app.is_active_member());
drop policy if exists "reacoes: eu desfaço" on public.community_post_reactions;
create policy "reacoes: eu desfaço" on public.community_post_reactions
  for delete to authenticated using (profile_id = auth.uid());
grant select, insert, delete on public.community_post_reactions to authenticated;

-- ---------- Comentários ----------
create table if not exists public.community_post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  body       text not null check (length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists community_post_comments_post_idx on public.community_post_comments(post_id, created_at);

alter table public.community_post_comments enable row level security;
drop policy if exists "comentarios: membros veem" on public.community_post_comments;
create policy "comentarios: membros veem" on public.community_post_comments
  for select to authenticated using (app.is_active_member());
drop policy if exists "comentarios: eu comento" on public.community_post_comments;
create policy "comentarios: eu comento" on public.community_post_comments
  for insert to authenticated with check (author_id = auth.uid() and app.is_active_member());
drop policy if exists "comentarios: eu edito" on public.community_post_comments;
create policy "comentarios: eu edito" on public.community_post_comments
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "comentarios: eu ou a gestão apagamos" on public.community_post_comments;
create policy "comentarios: eu ou a gestão apagamos" on public.community_post_comments
  for delete to authenticated using (author_id = auth.uid() or app.is_editor_or_admin());
grant select, insert, update, delete on public.community_post_comments to authenticated;

-- Resumo social de vários posts de uma vez: quantos axés, se eu reagi, quantos comentários.
create or replace function app.community_post_social(p_post_ids uuid[])
returns table (post_id uuid, axe_count int, i_reacted boolean, comment_count int)
language sql stable security definer set search_path = public, app as $$
  select p.id,
         (select count(*)::int from public.community_post_reactions r where r.post_id = p.id and r.kind = 'axe'),
         exists(select 1 from public.community_post_reactions r where r.post_id = p.id and r.kind = 'axe' and r.profile_id = auth.uid()),
         (select count(*)::int from public.community_post_comments c where c.post_id = p.id)
  from public.community_posts p
  where p.id = any(p_post_ids) and app.is_active_member();
$$;
create or replace function public.community_post_social(p_post_ids uuid[])
returns table (post_id uuid, axe_count int, i_reacted boolean, comment_count int)
language sql stable security invoker set search_path = public, app as $$
  select * from app.community_post_social(p_post_ids);
$$;

-- Comentários de um post com nome e Orixá de quem escreveu.
create or replace function app.community_post_comments_list(p_post_id uuid)
returns table (id uuid, author_id uuid, name text, orixa_symbol text, body text, created_at timestamptz)
language sql stable security definer set search_path = public, app as $$
  select c.id, c.author_id, pr.name, pr.orixa_symbol, c.body, c.created_at
  from public.community_post_comments c
  left join public.profiles pr on pr.id = c.author_id
  where c.post_id = p_post_id and app.is_active_member()
  order by c.created_at;
$$;
create or replace function public.community_post_comments_list(p_post_id uuid)
returns table (id uuid, author_id uuid, name text, orixa_symbol text, body text, created_at timestamptz)
language sql stable security invoker set search_path = public, app as $$
  select * from app.community_post_comments_list(p_post_id);
$$;

-- Quem mandou axé num post.
create or replace function app.community_post_reactors(p_post_id uuid)
returns table (profile_id uuid, name text, orixa_symbol text)
language sql stable security definer set search_path = public, app as $$
  select r.profile_id, pr.name, pr.orixa_symbol
  from public.community_post_reactions r
  left join public.profiles pr on pr.id = r.profile_id
  where r.post_id = p_post_id and r.kind = 'axe' and app.is_active_member()
  order by r.created_at;
$$;
create or replace function public.community_post_reactors(p_post_id uuid)
returns table (profile_id uuid, name text, orixa_symbol text)
language sql stable security invoker set search_path = public, app as $$
  select * from app.community_post_reactors(p_post_id);
$$;

-- ---------- Frequência ----------
-- Para cada membro ativo: nas giras publicadas que já aconteceram no período,
-- quantas confirmou presença, quantas disse que não ia e quantas não respondeu.
-- Obs.: é a confirmação pelo app, não a chamada no dia.
drop function if exists public.admin_attendance_report(int, text);
drop function if exists app.admin_attendance_report(int, text);
create or replace function app.admin_attendance_report(p_months int default 6, p_activity_type text default null)
returns table (
  profile_id uuid, name text, orixa_symbol text, group_name text,
  giras_total int, going int, not_going int, no_answer int,
  last_going_at timestamptz, last_seen_at timestamptz, member_since timestamptz, phone text
)
language plpgsql stable security definer set search_path = public, app as $$
begin
  if not (app.is_admin() or app.is_master() or app.has_permission('people.manage')) then
    raise exception 'Acesso negado';
  end if;
  return query
  with g as (
    select gi.id, gi.starts_at
    from public.giras gi
    where coalesce(gi.status, 'published') = 'published'
      and gi.starts_at < now()
      and gi.starts_at >= now() - make_interval(months => greatest(1, least(coalesce(p_months, 6), 24)))
      and (p_activity_type is null or gi.activity_type = p_activity_type)
  )
  select pr.id, pr.name, pr.orixa_symbol, grp.name,
         count(g.id)::int,
         count(g.id) filter (where r.status = 'going')::int,
         count(g.id) filter (where r.status = 'not_going')::int,
         count(g.id) filter (where r.status is null)::int,
         max(g.starts_at) filter (where r.status = 'going'),
         pr.last_seen_at,
         pr.created_at,
         pr.phone
  from public.profiles pr
  left join public.groups grp on grp.id = pr.group_id
  left join g on g.starts_at >= pr.created_at - interval '1 day'   -- só conta giras depois que a pessoa entrou
  left join public.gira_responses r on r.gira_id = g.id and r.profile_id = pr.id
  where pr.is_active
  group by pr.id, pr.name, pr.orixa_symbol, grp.name, pr.last_seen_at, pr.created_at, pr.phone
  order by pr.name;
end $$;
create or replace function public.admin_attendance_report(p_months int default 6, p_activity_type text default null)
returns table (
  profile_id uuid, name text, orixa_symbol text, group_name text,
  giras_total int, going int, not_going int, no_answer int,
  last_going_at timestamptz, last_seen_at timestamptz, member_since timestamptz, phone text
)
language sql stable security invoker set search_path = public, app as $$
  select * from app.admin_attendance_report(p_months, p_activity_type);
$$;

grant execute on function public.community_post_social(uuid[]) to authenticated;
grant execute on function public.community_post_comments_list(uuid) to authenticated;
grant execute on function public.community_post_reactors(uuid) to authenticated;
grant execute on function public.admin_attendance_report(int, text) to authenticated;
grant execute on function app.community_post_social(uuid[]) to authenticated;
grant execute on function app.community_post_comments_list(uuid) to authenticated;
grant execute on function app.community_post_reactors(uuid) to authenticated;
grant execute on function app.admin_attendance_report(int, text) to authenticated;

notify pgrst, 'reload schema';
