-- =====================================================================
-- 2026-10-08 (h) — Revista Ẹ̀mí Ìlú dentro do app + quem leu
--
--   * Edições da revista (rascunho / publicada) e o registro de leitura de
--     cada pessoa: quando abriu, quais matérias leu, quando terminou.
--   * Nova permissão "Revista Ẹ̀mí Ìlú" (newsletter.manage): publica a edição e
--     vê quem leu. Veem: administradores (Jefferson, Wagner, Luciana Ramos) e Lucas Rocha.
--   * Ao publicar, todo mundo recebe o aviso no celular.
-- Pode rodar mais de uma vez.
-- =====================================================================

-- ---------- permissão nova ----------
create or replace function app.all_admin_permissions()
 returns text[] language sql immutable
as $$ select array['giras.manage','content.manage','finance.view','finance.edit_payer','people.manage','newsletter.manage'] $$;

-- Jefferson, Wagner e Luciana Ramos Ribeiro já são administradores (veem tudo).
-- Libera só para Lucas Rocha, pelo cadastro dele.
insert into public.profile_permissions(profile_id, permission_key)
select 'ef5d377a-809f-4704-b87b-fda8b8cb9023'::uuid, 'newsletter.manage'
 where not exists (select 1 from public.profile_permissions
                    where profile_id = 'ef5d377a-809f-4704-b87b-fda8b8cb9023' and permission_key = 'newsletter.manage');

-- ---------- edições ----------
create table if not exists public.newsletter_editions (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,              -- ex.: 2026-10
  title        text not null,                     -- ex.: Ẹ̀mí Ìlú · Outubro 2026
  articles     int  not null default 0,           -- quantas matérias a edição tem
  status       text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  published_by uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);
alter table public.newsletter_editions enable row level security;
drop policy if exists "revista: membros veem publicadas" on public.newsletter_editions;
create policy "revista: membros veem publicadas" on public.newsletter_editions
  for select to authenticated using ((status = 'published' and app.is_active_member()) or app.has_permission('newsletter.manage'));
grant select on public.newsletter_editions to authenticated;

-- ---------- leituras ----------
create table if not exists public.newsletter_reads (
  edition_id  uuid not null references public.newsletter_editions(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  opened_at   timestamptz not null default now(),
  last_at     timestamptz not null default now(),
  articles    text[] not null default '{}',
  finished_at timestamptz,
  primary key (edition_id, profile_id)
);
alter table public.newsletter_reads enable row level security;
drop policy if exists "revista: vejo minha leitura" on public.newsletter_reads;
create policy "revista: vejo minha leitura" on public.newsletter_reads
  for select to authenticated using (profile_id = auth.uid());
grant select on public.newsletter_reads to authenticated;

-- registra leitura: abrir a edição (p_article null) ou ler uma matéria
create or replace function app.newsletter_mark_read(p_slug text, p_article text default null)
returns void language plpgsql security definer set search_path = public, app as $$
declare v_ed public.newsletter_editions; v_arts text[];
begin
  if auth.uid() is null then return; end if;
  select * into v_ed from public.newsletter_editions where slug = p_slug;
  if v_ed.id is null or (v_ed.status <> 'published' and not app.has_permission('newsletter.manage')) then return; end if;
  insert into public.newsletter_reads(edition_id, profile_id) values (v_ed.id, auth.uid())
  on conflict (edition_id, profile_id) do update set last_at = now();
  if p_article is not null then
    update public.newsletter_reads
       set articles = case when p_article = any(articles) then articles else array_append(articles, left(p_article, 20)) end,
           last_at = now()
     where edition_id = v_ed.id and profile_id = auth.uid()
     returning articles into v_arts;
    if v_ed.articles > 0 and cardinality(v_arts) >= v_ed.articles then
      update public.newsletter_reads set finished_at = coalesce(finished_at, now())
       where edition_id = v_ed.id and profile_id = auth.uid();
    end if;
  end if;
end $$;
create or replace function public.newsletter_mark_read(p_slug text, p_article text default null)
returns void language sql security invoker set search_path = public, app as $$ select app.newsletter_mark_read(p_slug, p_article) $$;

-- gestão: quem leu, quem abriu e não terminou, quem nem abriu
create or replace function app.admin_newsletter_readers(p_slug text)
returns table (profile_id uuid, name text, orixa_symbol text, phone text, opened_at timestamptz,
               articles_read int, articles_total int, finished_at timestamptz)
language plpgsql stable security definer set search_path = public, app as $$
declare v_ed public.newsletter_editions;
begin
  if not app.has_permission('newsletter.manage') then raise exception 'Acesso negado'; end if;
  select * into v_ed from public.newsletter_editions where slug = p_slug;
  if v_ed.id is null then raise exception 'Edição não encontrada.'; end if;
  return query
  select p.id, p.name, p.orixa_symbol, p.phone, r.opened_at,
         coalesce(cardinality(r.articles), 0), v_ed.articles, r.finished_at
    from public.profiles p
    left join public.newsletter_reads r on r.edition_id = v_ed.id and r.profile_id = p.id
   where p.is_active
   order by (r.finished_at is null), (r.opened_at is null), p.name;
end $$;
create or replace function public.admin_newsletter_readers(p_slug text)
returns table (profile_id uuid, name text, orixa_symbol text, phone text, opened_at timestamptz,
               articles_read int, articles_total int, finished_at timestamptz)
language sql stable security invoker set search_path = public, app as $$ select * from app.admin_newsletter_readers(p_slug) $$;

-- gestão: cadastrar / publicar / despublicar uma edição
create or replace function app.admin_save_newsletter(p_slug text, p_title text, p_articles int, p_publish boolean)
returns void language plpgsql security definer set search_path = public, app as $$
declare v_was text; r record;
begin
  if not app.has_permission('newsletter.manage') then raise exception 'Acesso negado'; end if;
  select status into v_was from public.newsletter_editions where slug = p_slug;
  insert into public.newsletter_editions(slug, title, articles, status, published_at, published_by)
  values (p_slug, p_title, coalesce(p_articles, 0),
          case when p_publish then 'published' else 'draft' end,
          case when p_publish then now() end, case when p_publish then auth.uid() end)
  on conflict (slug) do update set
    title = excluded.title, articles = excluded.articles, status = excluded.status,
    published_at = case when p_publish then coalesce(public.newsletter_editions.published_at, now()) else null end,
    published_by = case when p_publish then coalesce(public.newsletter_editions.published_by, auth.uid()) else null end;
  -- primeira publicação: aviso no celular para todo mundo
  if p_publish and coalesce(v_was, 'draft') <> 'published' and to_regprocedure('app.push_enqueue(uuid,text,text,text,text)') is not null then
    for r in select id from public.profiles where is_active loop
      perform app.push_enqueue(r.id, 'Saiu a Ẹ̀mí Ìlú 🌿', p_title || ' já está no app. Toque para ler.', '?tela=revista', 'revista:' || p_slug);
    end loop;
  end if;
end $$;
create or replace function public.admin_save_newsletter(p_slug text, p_title text, p_articles int, p_publish boolean)
returns void language sql security invoker set search_path = public, app as $$ select app.admin_save_newsletter(p_slug, p_title, p_articles, p_publish) $$;

-- outubro já entra como rascunho (só a gestão vê até publicar)
insert into public.newsletter_editions(slug, title, articles, status)
values ('2026-10', 'Ẹ̀mí Ìlú · Outubro 2026', 7, 'draft')
on conflict (slug) do nothing;

grant execute on function public.newsletter_mark_read(text, text) to authenticated;
grant execute on function app.newsletter_mark_read(text, text) to authenticated;
grant execute on function public.admin_newsletter_readers(text) to authenticated;
grant execute on function app.admin_newsletter_readers(text) to authenticated;
grant execute on function public.admin_save_newsletter(text, text, int, boolean) to authenticated;
grant execute on function app.admin_save_newsletter(text, text, int, boolean) to authenticated;

notify pgrst, 'reload schema';

-- confira quem ficou com acesso à revista:
select p.name as "Pode ver quem leu a revista"
  from public.profile_permissions pp join public.profiles p on p.id = pp.profile_id
 where pp.permission_key = 'newsletter.manage'
 order by p.name;
