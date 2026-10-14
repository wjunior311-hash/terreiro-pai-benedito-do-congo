-- =====================================================================
-- 2026-10-14 (n) — Inscrições da comunidade (link aberto, sem login)
--   * Cada gira diz quem pode se inscrever de fora: casa (ninguém), aberta,
--     ou assist (fechada, com poucas vagas de assistência).
--   * Inscrição com nome, WhatsApp e idade; vagas; lista de espera;
--     desistência até 48h antes (a vaga passa para o 1º da espera).
--   * A tabela não é lida direto por ninguém: tudo passa pelas funções abaixo,
--     que conferem vagas, duplicidade e prazos.
--   * Gestão: lista, check-in na porta, dar vaga, incluir na mão.
-- Pode rodar mais de uma vez. Nada é apagado.
-- =====================================================================

alter table public.giras add column if not exists community_access text not null default 'casa';
alter table public.giras add column if not exists community_slots int not null default 0;
alter table public.giras add column if not exists community_public boolean not null default true;
alter table public.giras add column if not exists community_waitlist boolean not null default true;
alter table public.giras add column if not exists community_opens_at timestamptz;
do $$ begin
  alter table public.giras add constraint giras_community_access_chk check (community_access in ('casa', 'aberta', 'assist'));
exception when duplicate_object then null; end $$;

create table if not exists public.community_signups (
  id           uuid primary key default gen_random_uuid(),
  token        uuid not null unique default gen_random_uuid(),
  gira_id      uuid not null references public.giras(id),
  number       int  not null,
  name         text not null,
  phone        text not null default '',
  age          int,
  status       text not null default 'ok' check (status in ('ok', 'wait', 'pend', 'cancel', 'recusado')),
  source       text not null default 'app',
  checked_in_at timestamptz,
  promoted_at  timestamptz,
  canceled_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists community_signups_gira_idx on public.community_signups(gira_id, status, created_at);
create index if not exists community_signups_phone_idx on public.community_signups(phone);
alter table public.community_signups enable row level security;

-- telefone só com dígitos, sem o 55 do Brasil
create or replace function app.community_phone(p text) returns text
language sql immutable as $$
  select case when length(d) in (12, 13) and d like '55%' then substr(d, 3) else d end
    from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x
$$;

-- quanto da gira já está preenchido (a comunidade vê só a porcentagem, nunca o número)
create or replace function app.community_fill(p_gira uuid) returns table (taken int, slots int, pct int, is_full boolean)
language sql stable security definer set search_path = public, app as $$
  select c.n, g.community_slots,
         case when g.community_slots > 0 then least(100, round(100.0 * c.n / g.community_slots))::int else 100 end,
         c.n >= g.community_slots
    from public.giras g,
         lateral (select count(*)::int as n from public.community_signups s where s.gira_id = g.id and s.status in ('ok', 'pend')) c
   where g.id = p_gira
$$;

-- ---------- público (sem login) ----------
create or replace function app.public_giras(p_gira uuid default null)
returns table (id uuid, name text, starts_at timestamptz, activity_type text, art_path text, cover_color text,
               description text, what_to_bring text, access text, fill_pct int, is_full boolean, waitlist boolean, opens_at timestamptz)
language sql stable security definer set search_path = public, app as $$
  select g.id, g.name, g.starts_at, g.activity_type, nullif(g.art_path, ''), g.cover_color,
         g.description, g.what_to_bring, g.community_access, f.pct, f.is_full, g.community_waitlist, g.community_opens_at
    from public.giras g cross join lateral app.community_fill(g.id) f
   where coalesce(g.status, 'published') = 'published'
     and g.community_access in ('aberta', 'assist')
     and g.community_slots > 0
     and g.starts_at > now() - interval '6 hours'
     and (g.id = p_gira or (p_gira is null and g.community_public))
   order by g.starts_at
$$;

create or replace function app.public_signup(p_gira uuid, p_name text, p_phone text, p_age int)
returns table (token uuid, number int, status text)
language plpgsql security definer set search_path = public, app as $$
declare v_g public.giras; v_phone text := app.community_phone(p_phone); v_name text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
        v_taken int; v_status text; v_num int; v_tok uuid;
begin
  select * into v_g from public.giras where id = p_gira for update;
  if v_g.id is null or v_g.community_access not in ('aberta', 'assist') or coalesce(v_g.status, 'published') <> 'published' or v_g.community_slots <= 0 then
    raise exception 'Esta gira não está aberta para inscrições.';
  end if;
  if v_g.starts_at <= now() then raise exception 'As inscrições para esta gira já encerraram.'; end if;
  if v_g.community_opens_at is not null and v_g.community_opens_at > now() then raise exception 'As inscrições ainda não abriram.'; end if;
  if length(v_name) < 3 or position(' ' in v_name) = 0 then raise exception 'Escreva nome e sobrenome.'; end if;
  if length(v_name) > 120 then raise exception 'Nome muito longo.'; end if;
  if length(v_phone) not between 10 and 11 then raise exception 'Confira o número do WhatsApp, com DDD.'; end if;
  if p_age is null or p_age not between 1 and 120 then raise exception 'Informe sua idade.'; end if;
  if exists (select 1 from public.community_signups s where s.gira_id = p_gira and s.phone = v_phone and s.status not in ('cancel', 'recusado')) then
    raise exception 'Este WhatsApp já está inscrito nesta gira. Use "Já me inscrevi" para ver sua inscrição.';
  end if;
  select count(*) into v_taken from public.community_signups s where s.gira_id = p_gira and s.status in ('ok', 'pend');
  if v_taken < v_g.community_slots then v_status := 'ok';
  elsif v_g.community_waitlist then v_status := 'wait';
  else raise exception 'Esta gira está lotada.'; end if;
  select coalesce(max(s.number), 0) + 1 into v_num from public.community_signups s where s.gira_id = p_gira;
  insert into public.community_signups(gira_id, number, name, phone, age, status)
  values (p_gira, v_num, v_name, v_phone, p_age, v_status)
  returning community_signups.token into v_tok;
  return query select v_tok, v_num, v_status;
end $$;

-- inscrições guardadas no aparelho da pessoa (pelos tokens)
create or replace function app.public_my_signups(p_tokens uuid[])
returns table (token uuid, gira_id uuid, gira_name text, starts_at timestamptz, cover_color text, name text, age int,
               number int, status text, wait_pos int, cancel_until timestamptz)
language sql stable security definer set search_path = public, app as $$
  select s.token, g.id, g.name, g.starts_at, g.cover_color, s.name, s.age, s.number, s.status,
         case when s.status = 'wait' then (select count(*)::int from public.community_signups w
                where w.gira_id = s.gira_id and w.status = 'wait' and w.created_at <= s.created_at) end,
         g.starts_at - interval '48 hours'
    from public.community_signups s join public.giras g on g.id = s.gira_id
   where s.token = any(p_tokens)
   order by g.starts_at
$$;

-- "Já me inscrevi": consulta pelo WhatsApp (não devolve o token)
create or replace function app.public_lookup(p_phone text)
returns table (gira_name text, starts_at timestamptz, first_name text, number int, status text)
language sql stable security definer set search_path = public, app as $$
  select g.name, g.starts_at, split_part(s.name, ' ', 1), s.number, s.status
    from public.community_signups s join public.giras g on g.id = s.gira_id
   where length(app.community_phone(p_phone)) >= 10 and s.phone = app.community_phone(p_phone)
     and g.starts_at > now() - interval '1 day'
   order by g.starts_at
$$;

create or replace function app.public_cancel(p_token uuid) returns text
language plpgsql security definer set search_path = public, app as $$
declare v_s public.community_signups; v_g public.giras; v_next uuid;
begin
  select * into v_s from public.community_signups where token = p_token;
  if v_s.id is null then raise exception 'Inscrição não encontrada.'; end if;
  select * into v_g from public.giras where id = v_s.gira_id for update;
  if v_s.status not in ('ok', 'wait', 'pend') then return 'ja_cancelada'; end if;
  if now() > v_g.starts_at - interval '48 hours' then
    raise exception 'O prazo para cancelar terminou (48 horas antes). Se tiver um imprevisto, fale com a casa pelo WhatsApp.';
  end if;
  update public.community_signups set status = 'cancel', canceled_at = now() where id = v_s.id;
  -- a vaga vai para o primeiro da lista de espera
  if v_s.status in ('ok', 'pend') then
    select id into v_next from public.community_signups
     where gira_id = v_s.gira_id and status = 'wait' order by created_at limit 1;
    if v_next is not null then
      update public.community_signups set status = 'ok', promoted_at = now() where id = v_next;
    end if;
  end if;
  return 'cancelada';
end $$;

-- ---------- gestão ----------
create or replace function app.can_manage_community() returns boolean
language sql stable security definer set search_path = public, app as $$
  select app.is_admin() or app.is_master() or app.has_permission('giras.manage')
$$;

create or replace function app.admin_community_giras()
returns table (id uuid, name text, starts_at timestamptz, access text, slots int, is_public boolean, waitlist boolean,
               opens_at timestamptz, taken int, waiting int, checked int)
language plpgsql stable security definer set search_path = public, app as $$
begin
  if not app.can_manage_community() then raise exception 'Acesso negado'; end if;
  return query
  select g.id, g.name, g.starts_at, g.community_access, g.community_slots, g.community_public, g.community_waitlist, g.community_opens_at,
         (select count(*)::int from public.community_signups s where s.gira_id = g.id and s.status in ('ok', 'pend')),
         (select count(*)::int from public.community_signups s where s.gira_id = g.id and s.status = 'wait'),
         (select count(*)::int from public.community_signups s where s.gira_id = g.id and s.checked_in_at is not null)
    from public.giras g
   where g.community_access <> 'casa' or exists (select 1 from public.community_signups s where s.gira_id = g.id)
   order by g.starts_at desc;
end $$;

create or replace function app.admin_community_signups(p_gira uuid)
returns table (id uuid, number int, name text, phone text, age int, status text, source text,
               checked_in_at timestamptz, promoted_at timestamptz, created_at timestamptz, wait_pos int)
language plpgsql stable security definer set search_path = public, app as $$
begin
  if not app.can_manage_community() then raise exception 'Acesso negado'; end if;
  return query
  select s.id, s.number, s.name, s.phone, s.age, s.status, s.source, s.checked_in_at, s.promoted_at, s.created_at,
         case when s.status = 'wait' then (row_number() over (partition by (s.status = 'wait') order by s.created_at))::int end
    from public.community_signups s
   where s.gira_id = p_gira
   order by (s.status = 'cancel'), (s.status = 'wait'), s.number;
end $$;

create or replace function app.admin_community_checkin(p_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public, app as $$
begin
  if not app.can_manage_community() then raise exception 'Acesso negado'; end if;
  update public.community_signups set checked_in_at = case when p_on then coalesce(checked_in_at, now()) end where id = p_id;
end $$;

create or replace function app.admin_community_set_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public, app as $$
begin
  if not app.can_manage_community() then raise exception 'Acesso negado'; end if;
  if p_status not in ('ok', 'wait', 'cancel', 'pend', 'recusado') then raise exception 'Situação inválida.'; end if;
  update public.community_signups
     set status = p_status,
         promoted_at = case when p_status = 'ok' and status = 'wait' then now() else promoted_at end,
         canceled_at = case when p_status = 'cancel' then now() else canceled_at end
   where id = p_id;
end $$;

-- incluir na mão (na porta, ou vindo de outra lista); não confere vagas
create or replace function app.admin_community_add(p_gira uuid, p_name text, p_phone text, p_age int, p_status text default 'ok', p_source text default 'gestao')
returns uuid language plpgsql security definer set search_path = public, app as $$
declare v_id uuid; v_num int;
begin
  if not app.can_manage_community() then raise exception 'Acesso negado'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Informe o nome.'; end if;
  perform 1 from public.giras where id = p_gira for update;
  select coalesce(max(number), 0) + 1 into v_num from public.community_signups where gira_id = p_gira;
  insert into public.community_signups(gira_id, number, name, phone, age, status, source)
  values (p_gira, v_num, regexp_replace(trim(p_name), '\s+', ' ', 'g'), app.community_phone(p_phone), p_age,
          coalesce(nullif(p_status, ''), 'ok'), coalesce(nullif(p_source, ''), 'gestao'))
  returning id into v_id;
  return v_id;
end $$;

-- cadastro da gira: quem pode se inscrever de fora
create or replace function app.editor_set_gira_community(p_gira uuid, p_access text, p_slots int, p_public boolean, p_waitlist boolean, p_opens_at timestamptz)
returns void language plpgsql security definer set search_path = public, app as $$
begin
  if not app.can_manage_community() then raise exception 'Acesso negado'; end if;
  if p_access not in ('casa', 'aberta', 'assist') then raise exception 'Opção inválida.'; end if;
  update public.giras
     set community_access = p_access,
         community_slots = greatest(0, coalesce(p_slots, 0)),
         community_public = coalesce(p_public, true),
         community_waitlist = coalesce(p_waitlist, true),
         community_opens_at = p_opens_at
   where id = p_gira;
end $$;

-- wrappers públicos
create or replace function public.public_giras(p_gira uuid default null)
returns table (id uuid, name text, starts_at timestamptz, activity_type text, art_path text, cover_color text,
               description text, what_to_bring text, access text, fill_pct int, is_full boolean, waitlist boolean, opens_at timestamptz)
language sql stable security invoker set search_path = public, app as $$ select * from app.public_giras(p_gira) $$;
create or replace function public.public_signup(p_gira uuid, p_name text, p_phone text, p_age int)
returns table (token uuid, number int, status text)
language sql security invoker set search_path = public, app as $$ select * from app.public_signup(p_gira, p_name, p_phone, p_age) $$;
create or replace function public.public_my_signups(p_tokens uuid[])
returns table (token uuid, gira_id uuid, gira_name text, starts_at timestamptz, cover_color text, name text, age int,
               number int, status text, wait_pos int, cancel_until timestamptz)
language sql stable security invoker set search_path = public, app as $$ select * from app.public_my_signups(p_tokens) $$;
create or replace function public.public_lookup(p_phone text)
returns table (gira_name text, starts_at timestamptz, first_name text, number int, status text)
language sql stable security invoker set search_path = public, app as $$ select * from app.public_lookup(p_phone) $$;
create or replace function public.public_cancel(p_token uuid) returns text
language sql security invoker set search_path = public, app as $$ select app.public_cancel(p_token) $$;
create or replace function public.admin_community_giras()
returns table (id uuid, name text, starts_at timestamptz, access text, slots int, is_public boolean, waitlist boolean,
               opens_at timestamptz, taken int, waiting int, checked int)
language sql stable security invoker set search_path = public, app as $$ select * from app.admin_community_giras() $$;
create or replace function public.admin_community_signups(p_gira uuid)
returns table (id uuid, number int, name text, phone text, age int, status text, source text,
               checked_in_at timestamptz, promoted_at timestamptz, created_at timestamptz, wait_pos int)
language sql stable security invoker set search_path = public, app as $$ select * from app.admin_community_signups(p_gira) $$;
create or replace function public.admin_community_checkin(p_id uuid, p_on boolean) returns void
language sql security invoker set search_path = public, app as $$ select app.admin_community_checkin(p_id, p_on) $$;
create or replace function public.admin_community_set_status(p_id uuid, p_status text) returns void
language sql security invoker set search_path = public, app as $$ select app.admin_community_set_status(p_id, p_status) $$;
create or replace function public.admin_community_add(p_gira uuid, p_name text, p_phone text, p_age int, p_status text default 'ok', p_source text default 'gestao')
returns uuid language sql security invoker set search_path = public, app as $$ select app.admin_community_add(p_gira, p_name, p_phone, p_age, p_status, p_source) $$;
create or replace function public.editor_set_gira_community(p_gira uuid, p_access text, p_slots int, p_public boolean, p_waitlist boolean, p_opens_at timestamptz)
returns void language sql security invoker set search_path = public, app as $$ select app.editor_set_gira_community(p_gira, p_access, p_slots, p_public, p_waitlist, p_opens_at) $$;

-- quem pode chamar: o público (sem login) só as funções "public_"
grant execute on function app.community_phone(text), app.community_fill(uuid), app.public_giras(uuid),
  app.public_signup(uuid, text, text, int), app.public_my_signups(uuid[]), app.public_lookup(text), app.public_cancel(uuid)
  to anon, authenticated;
grant execute on function public.public_giras(uuid), public.public_signup(uuid, text, text, int),
  public.public_my_signups(uuid[]), public.public_lookup(text), public.public_cancel(uuid) to anon, authenticated;
grant usage on schema app to anon;
grant execute on function app.can_manage_community(), app.admin_community_giras(), app.admin_community_signups(uuid),
  app.admin_community_checkin(uuid, boolean), app.admin_community_set_status(uuid, text),
  app.admin_community_add(uuid, text, text, int, text, text), app.editor_set_gira_community(uuid, text, int, boolean, boolean, timestamptz)
  to authenticated;
grant execute on function public.admin_community_giras(), public.admin_community_signups(uuid),
  public.admin_community_checkin(uuid, boolean), public.admin_community_set_status(uuid, text),
  public.admin_community_add(uuid, text, text, int, text, text), public.editor_set_gira_community(uuid, text, int, boolean, boolean, timestamptz)
  to authenticated;

notify pgrst, 'reload schema';
