-- =====================================================================
-- 2026-10-13 (m) — Ranking de insígnias (tela inicial)
--   Cada insígnia ou nível conquistado = 1 ponto. Pais de santo ficam de fora.
--   Devolve o top 10 e, se a pessoa estiver fora dele, a posição dela.
-- =====================================================================
create or replace function app.badges_ranking()
returns table (pos int, profile_id uuid, name text, orixa_symbol text, points int, is_me boolean)
language sql stable security definer set search_path = public, app as $$
  with pts as (
    select p.id, p.name, p.orixa_symbol, count(a.*)::int as points, max(a.awarded_at) as last_at
      from public.profiles p
      left join public.badge_awards a on a.profile_id = p.id
     where p.is_active and not coalesce(p.is_pai_de_santo, false)
     group by p.id
  ), ranked as (
    select (row_number() over (order by points desc, last_at asc nulls last, name))::int as pos, * from pts
  )
  select r.pos, r.id, r.name, r.orixa_symbol, r.points, r.id = auth.uid()
    from ranked r
   where app.is_active_member() and r.points > 0 and (r.pos <= 10 or r.id = auth.uid())
   order by r.pos;
$$;
create or replace function public.badges_ranking()
returns table (pos int, profile_id uuid, name text, orixa_symbol text, points int, is_me boolean)
language sql stable security invoker set search_path = public, app as $$ select * from app.badges_ranking() $$;
grant execute on function app.badges_ranking() to authenticated;
grant execute on function public.badges_ranking() to authenticated;
notify pgrst, 'reload schema';
