-- Mãos da Egbé: vitrine de negócios, espetáculos e projetos dos filhos da casa.
-- O filho cadastra pelo app, a gestão aprova; aparece no app, na revista e (se a pessoa quiser) no site aberto.
-- Espetáculos e projetos com data final saem sozinhos depois do último dia.
create table if not exists public.maos_itens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('negocio', 'espetaculo', 'projeto')),
  name text not null,
  about text not null,
  area text,
  whatsapp text,
  instagram text,
  link text,
  place text,
  starts_on date,
  ends_on date,
  offer text,
  image text,
  show_public boolean not null default true,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado', 'removido')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid
);
alter table public.maos_itens enable row level security;

create or replace function app.maos_json(m public.maos_itens, p_full boolean)
returns jsonb language sql stable security definer set search_path = public, app as $$
  select jsonb_build_object('id', m.id, 'kind', m.kind, 'name', m.name, 'about', m.about, 'area', m.area,
    'whatsapp', m.whatsapp, 'instagram', m.instagram, 'link', m.link, 'place', m.place,
    'starts_on', m.starts_on, 'ends_on', m.ends_on, 'offer', m.offer, 'image', m.image,
    'novo', m.approved_at > now() - interval '30 days',
    'quem', (select split_part(pr.name, ' ', 1) from public.profiles pr where pr.id = m.profile_id))
   || case when p_full then jsonb_build_object('status', m.status, 'show_public', m.show_public, 'note', m.note,
        'profile_id', m.profile_id, 'quem_completo', (select pr.name from public.profiles pr where pr.id = m.profile_id),
        'created_at', m.created_at) else '{}'::jsonb end
$$;

-- o que está no ar (aprovado e dentro do prazo)
create or replace function app.maos_no_ar(m public.maos_itens)
returns boolean language sql stable as $$
  select m.status = 'aprovado' and (m.ends_on is null or m.ends_on >= (now() at time zone 'America/Sao_Paulo')::date)
$$;

create or replace function app.maos_list()
returns jsonb language sql stable security definer set search_path = public, app as $$
  select coalesce(jsonb_agg(app.maos_json(m, false) order by m.approved_at desc), '[]'::jsonb)
    from public.maos_itens m where app.maos_no_ar(m) and app.is_active_member()
$$;

create or replace function app.public_maos()
returns jsonb language sql stable security definer set search_path = public, app as $$
  select coalesce(jsonb_agg(app.maos_json(m, false) order by m.approved_at desc), '[]'::jsonb)
    from public.maos_itens m where app.maos_no_ar(m) and m.show_public
$$;

create or replace function app.my_maos()
returns jsonb language sql stable security definer set search_path = public, app as $$
  select coalesce(jsonb_agg(app.maos_json(m, true) order by m.created_at desc), '[]'::jsonb)
    from public.maos_itens m where m.profile_id = auth.uid() and m.status <> 'removido'
$$;

create or replace function app.save_my_maos(p jsonb)
returns uuid language plpgsql security definer set search_path = public, app as $$
declare v_id uuid := nullif(p->>'id', '')::uuid; v_kind text := p->>'kind';
  v_name text := left(trim(coalesce(p->>'name', '')), 80); v_about text := left(trim(coalesce(p->>'about', '')), 120);
  v_img text := nullif(p->>'image', ''); v_ends date := nullif(p->>'ends_on', '')::date; v_novo boolean;
begin
  if auth.uid() is null or not app.is_active_member() then raise exception 'Entre no app.'; end if;
  if v_kind not in ('negocio', 'espetaculo', 'projeto') then raise exception 'Escolha se é negócio, espetáculo ou projeto.'; end if;
  if length(v_name) < 2 then raise exception 'Escreva o nome.'; end if;
  if length(v_about) < 5 then raise exception 'Conte em uma frase o que é.'; end if;
  if v_kind = 'espetaculo' and v_ends is null then raise exception 'Coloque até quando vai o espetáculo.'; end if;
  if v_img is not null and (v_img !~ '^data:image/(jpeg|png|webp);base64,' or length(v_img) > 900000) then raise exception 'Envie uma foto menor (até 600 KB).'; end if;
  if nullif(p->>'whatsapp', '') is null and nullif(p->>'instagram', '') is null and nullif(p->>'link', '') is null then
    raise exception 'Coloque pelo menos um contato: WhatsApp, Instagram ou link.'; end if;
  if v_id is null then
    insert into public.maos_itens(profile_id, kind, name, about, area, whatsapp, instagram, link, place, starts_on, ends_on, offer, image, show_public)
    values (auth.uid(), v_kind, v_name, v_about, nullif(p->>'area', ''), nullif(regexp_replace(coalesce(p->>'whatsapp', ''), '\D', '', 'g'), ''),
      nullif(regexp_replace(trim(coalesce(p->>'instagram', '')), '^@|^https?://(www\.)?instagram\.com/|/$', '', 'g'), ''),
      nullif(trim(coalesce(p->>'link', '')), ''), nullif(left(trim(coalesce(p->>'place', '')), 80), ''),
      nullif(p->>'starts_on', '')::date, v_ends, nullif(left(trim(coalesce(p->>'offer', '')), 80), ''), v_img,
      coalesce((p->>'show_public')::boolean, true))
    returning id into v_id;
    v_novo := true;
  else
    update public.maos_itens set kind = v_kind, name = v_name, about = v_about, area = nullif(p->>'area', ''),
      whatsapp = nullif(regexp_replace(coalesce(p->>'whatsapp', ''), '\D', '', 'g'), ''),
      instagram = nullif(regexp_replace(trim(coalesce(p->>'instagram', '')), '^@|^https?://(www\.)?instagram\.com/|/$', '', 'g'), ''),
      link = nullif(trim(coalesce(p->>'link', '')), ''), place = nullif(left(trim(coalesce(p->>'place', '')), 80), ''),
      starts_on = nullif(p->>'starts_on', '')::date, ends_on = v_ends, offer = nullif(left(trim(coalesce(p->>'offer', '')), 80), ''),
      image = coalesce(v_img, image), show_public = coalesce((p->>'show_public')::boolean, true),
      status = 'pendente', note = null, updated_at = now()
     where id = v_id and profile_id = auth.uid() and status <> 'removido';
    if not found then raise exception 'Cadastro não encontrado.'; end if;
    v_novo := false;
  end if;
  -- avisa a gestão (Pais e administradores)
  perform app.push_enqueue(pr.id, case when v_novo then 'Mãos da Egbé: novo cadastro 🙌🏾' else 'Mãos da Egbé: cadastro alterado' end,
      (select split_part(name, ' ', 1) from public.profiles where id = auth.uid()) || ' · ' || v_name || '. Toque para aprovar.',
      '?tela=admin', 'maos:' || v_id || ':' || to_char(now(), 'YYYYMMDDHH24MI'))
    from public.profiles pr where pr.is_active and (pr.role = 'admin' or pr.is_master);
  return v_id;
end $$;

create or replace function app.remove_my_maos(p_id uuid)
returns void language sql security definer set search_path = public, app as $$
  update public.maos_itens set status = 'removido', updated_at = now() where id = p_id and profile_id = auth.uid()
$$;

create or replace function app.admin_maos_list()
returns jsonb language plpgsql stable security definer set search_path = public, app as $$
begin
  if not (app.is_admin() or app.is_master() or app.has_permission('content.manage')) then raise exception 'Acesso negado'; end if;
  return coalesce((select jsonb_agg(app.maos_json(m, true) order by (m.status = 'pendente') desc, m.created_at desc)
                     from public.maos_itens m where m.status <> 'removido'), '[]'::jsonb);
end $$;

create or replace function app.admin_maos_set(p_id uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public, app as $$
declare v public.maos_itens;
begin
  if not (app.is_admin() or app.is_master() or app.has_permission('content.manage')) then raise exception 'Acesso negado'; end if;
  if p_status not in ('aprovado', 'recusado', 'pendente') then raise exception 'Situação inválida.'; end if;
  update public.maos_itens set status = p_status, note = nullif(trim(coalesce(p_note, '')), ''),
         approved_at = case when p_status = 'aprovado' then coalesce(approved_at, now()) end,
         approved_by = case when p_status = 'aprovado' then auth.uid() end, updated_at = now()
   where id = p_id returning * into v;
  if v.id is null then raise exception 'Cadastro não encontrado.'; end if;
  if p_status = 'aprovado' then
    perform app.push_enqueue(v.profile_id, 'Seu trabalho está na Mãos da Egbé 🙌🏾', v.name || ' já aparece para a casa.', '?tela=maos', 'maos-ok:' || v.id);
  elsif p_status = 'recusado' then
    perform app.push_enqueue(v.profile_id, 'Mãos da Egbé: precisa de um ajuste', coalesce(v.note, 'A gestão pediu uma mudança no seu cadastro.'), '?tela=maos', 'maos-ajuste:' || v.id || ':' || to_char(now(), 'YYYYMMDDHH24MI'));
  end if;
end $$;

create or replace function public.maos_list() returns jsonb language sql stable security invoker set search_path = public, app as $$ select app.maos_list() $$;
create or replace function public.public_maos() returns jsonb language sql stable security invoker set search_path = public, app as $$ select app.public_maos() $$;
create or replace function public.my_maos() returns jsonb language sql stable security invoker set search_path = public, app as $$ select app.my_maos() $$;
create or replace function public.save_my_maos(p jsonb) returns uuid language sql security invoker set search_path = public, app as $$ select app.save_my_maos(p) $$;
create or replace function public.remove_my_maos(p_id uuid) returns void language sql security invoker set search_path = public, app as $$ select app.remove_my_maos(p_id) $$;
create or replace function public.admin_maos_list() returns jsonb language sql stable security invoker set search_path = public, app as $$ select app.admin_maos_list() $$;
create or replace function public.admin_maos_set(p_id uuid, p_status text, p_note text default null) returns void language sql security invoker set search_path = public, app as $$ select app.admin_maos_set(p_id, p_status, p_note) $$;
grant execute on function app.maos_json(public.maos_itens, boolean), app.maos_no_ar(public.maos_itens), app.public_maos(), public.public_maos() to anon, authenticated;
grant execute on function app.maos_list(), app.my_maos(), app.save_my_maos(jsonb), app.remove_my_maos(uuid), app.admin_maos_list(), app.admin_maos_set(uuid, text, text),
  public.maos_list(), public.my_maos(), public.save_my_maos(jsonb), public.remove_my_maos(uuid), public.admin_maos_list(), public.admin_maos_set(uuid, text, text) to authenticated;
notify pgrst, 'reload schema';
