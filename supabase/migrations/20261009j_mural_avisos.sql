-- =====================================================================
-- 2026-10-09 (j) — Mural: avisos de axé e comentário + novidades na tela inicial
--   * Axé numa publicação: o autor recebe aviso no celular (uma vez por pessoa).
--   * Comentário: o aviso agora abre direto na publicação.
--   * Tela inicial: "No seu mural" mostra quem mandou axé / comentou desde a
--     última vez que a pessoa abriu o Mural.
-- Pode rodar mais de uma vez. (Sem "drop": nada é apagado.)
-- =====================================================================

alter table public.profiles add column if not exists mural_seen_at timestamptz;

-- ---------- aviso de axé ----------
create or replace function app.push_from_reaction() returns trigger
language plpgsql security definer set search_path = public, app as $$
declare v_author uuid; v_body text; v_name text;
begin
  select author_id, body into v_author, v_body from public.community_posts where id = new.post_id;
  if v_author is null or v_author = new.profile_id then return new; end if;
  select split_part(coalesce(name, 'Alguém'), ' ', 1) into v_name from public.profiles where id = new.profile_id;
  -- a etiqueta por pessoa + publicação evita repetir o aviso se a pessoa tirar e devolver o axé
  perform app.push_enqueue(v_author, v_name || ' mandou axé 🙏',
    'Na sua publicação: "' || left(regexp_replace(coalesce(v_body, ''), '\s+', ' ', 'g'), 90) || '"',
    '?tela=community&post=' || new.post_id, 'axe:' || new.post_id || ':' || new.profile_id);
  return new;
end $$;
create or replace trigger push_reaction after insert on public.community_post_reactions
  for each row execute function app.push_from_reaction();

-- ---------- aviso de comentário: abre direto na publicação ----------
create or replace function app.push_from_comment() returns trigger
language plpgsql security definer set search_path = public, app as $$
declare v_author uuid; v_name text;
begin
  select author_id into v_author from public.community_posts where id = new.post_id;
  if v_author is null or v_author = new.author_id then return new; end if;
  select split_part(coalesce(name, 'Alguém'), ' ', 1) into v_name from public.profiles where id = new.author_id;
  perform app.push_enqueue(v_author, v_name || ' comentou sua publicação', new.body,
    '?tela=community&post=' || new.post_id, 'comentario:' || new.id);
  return new;
end $$;

-- ---------- novidades do meu mural (tela inicial) ----------
create or replace function app.my_mural_activity()
returns table (post_id uuid, post_body text, post_kind text, gira_id uuid,
               axes int, comments int, names text[], last_at timestamptz)
language sql stable security definer set search_path = public, app as $$
  with me as (
    select greatest(coalesce(mural_seen_at, '-infinity'::timestamptz), now() - interval '14 days') as since
      from public.profiles where id = auth.uid()
  ), ev as (
    select r.post_id, r.profile_id as who, r.created_at as at, 'axe' as t
      from public.community_post_reactions r
      join public.community_posts p on p.id = r.post_id
     where p.author_id = auth.uid() and r.profile_id <> auth.uid() and r.created_at > (select since from me)
    union all
    select c.post_id, c.author_id, c.created_at, 'cm'
      from public.community_post_comments c
      join public.community_posts p on p.id = c.post_id
     where p.author_id = auth.uid() and c.author_id <> auth.uid() and c.created_at > (select since from me)
  )
  select p.id, left(p.body, 140), p.kind::text, p.gira_id,
         (count(*) filter (where ev.t = 'axe'))::int,
         (count(*) filter (where ev.t = 'cm'))::int,
         (select array_agg(n order by lt desc) from (
            select split_part(coalesce(pr.name, 'Alguém'), ' ', 1) as n, max(e2.at) as lt
              from ev e2 join public.profiles pr on pr.id = e2.who
             where e2.post_id = p.id group by pr.id, pr.name) s),
         max(ev.at)
    from ev join public.community_posts p on p.id = ev.post_id
   where app.is_active_member()
   group by p.id
   order by max(ev.at) desc
   limit 5;
$$;
create or replace function public.my_mural_activity()
returns table (post_id uuid, post_body text, post_kind text, gira_id uuid,
               axes int, comments int, names text[], last_at timestamptz)
language sql stable security invoker set search_path = public, app as $$ select * from app.my_mural_activity() $$;

-- abriu o Mural: zera as novidades
create or replace function app.mark_mural_seen() returns void
language sql security definer set search_path = public, app as $$
  update public.profiles set mural_seen_at = now() where id = auth.uid();
$$;
create or replace function public.mark_mural_seen() returns void
language sql security invoker set search_path = public, app as $$ select app.mark_mural_seen() $$;

grant execute on function app.my_mural_activity() to authenticated;
grant execute on function public.my_mural_activity() to authenticated;
grant execute on function app.mark_mural_seen() to authenticated;
grant execute on function public.mark_mural_seen() to authenticated;

notify pgrst, 'reload schema';
