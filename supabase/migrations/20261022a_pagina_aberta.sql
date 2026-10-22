-- Página aberta do site: conteúdos abertos ao público + lista "Quero ser avisado"
alter table public.house_contents add column if not exists is_public boolean not null default false;

-- conteúdos abertos (sem login)
create or replace function app.public_contents()
returns table(id uuid, title text, summary text, body text, cover_url text, cover_color text, layout text, created_at timestamptz)
language sql stable security definer set search_path = public, app as $$
  select c.id, c.title, c.summary, c.body, c.cover_url, c.cover_color, c.layout, c.created_at
    from public.house_contents c
   where c.is_public and not coalesce(c.is_draft, false) and c.content_type = 'content'
   order by c.featured desc, c.created_at desc
   limit 12
$$;
create or replace function public.public_contents()
returns table(id uuid, title text, summary text, body text, cover_url text, cover_color text, layout text, created_at timestamptz)
language sql stable security invoker set search_path = public, app as $$ select * from app.public_contents() $$;
grant execute on function app.public_contents() to anon, authenticated;
grant execute on function public.public_contents() to anon, authenticated;

-- lista de interessados ("Quer saber das próximas giras?")
create table if not exists public.public_interest (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_interest_phone_uniq unique (phone)
);
alter table public.public_interest enable row level security;

create or replace function app.public_interest_signup(p_name text, p_phone text)
returns text language plpgsql security definer set search_path = public, app as $$
declare v_nome text := left(trim(coalesce(p_name, '')), 80); v_tel text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if length(v_nome) < 2 then raise exception 'Digite seu nome.'; end if;
  if v_tel like '55%' and length(v_tel) > 11 then v_tel := substr(v_tel, 3); end if;
  if length(v_tel) not between 10 and 11 then raise exception 'Digite um WhatsApp válido, com DDD.'; end if;
  insert into public.public_interest(name, phone) values (v_nome, v_tel)
  on conflict (phone) do update set name = excluded.name, updated_at = now();
  return 'ok';
end $$;
create or replace function public.public_interest_signup(p_name text, p_phone text)
returns text language sql security invoker set search_path = public, app as $$ select app.public_interest_signup(p_name, p_phone) $$;
grant execute on function app.public_interest_signup(text, text) to anon, authenticated;
grant execute on function public.public_interest_signup(text, text) to anon, authenticated;

create or replace function app.admin_public_interest()
returns table(id uuid, name text, phone text, created_at timestamptz)
language plpgsql stable security definer set search_path = public, app as $$
begin
  if not (app.is_admin() or app.is_master() or app.has_permission('content.manage')) then raise exception 'Acesso negado'; end if;
  return query select i.id, i.name, i.phone, i.created_at from public.public_interest i order by i.created_at desc;
end $$;
create or replace function public.admin_public_interest()
returns table(id uuid, name text, phone text, created_at timestamptz)
language sql stable security invoker set search_path = public, app as $$ select * from app.admin_public_interest() $$;
grant execute on function app.admin_public_interest() to authenticated;
grant execute on function public.admin_public_interest() to authenticated;

-- editor salva o "aberto ao público"
create or replace function app.editor_save_house_content(p_id uuid, p_data jsonb)
 returns uuid language plpgsql security definer set search_path to 'public', 'app' as $function$
declare
  v_id uuid := p_id;
  v_type text := coalesce(nullif(p_data->>'content_type',''), 'content');
  v_title text := trim(coalesce(p_data->>'title',''));
  v_layout text := coalesce(nullif(p_data->>'layout',''), 'normal');
  v_tags text[] := case when jsonb_typeof(p_data->'tags')='array'
                        then array(select jsonb_array_elements_text(p_data->'tags')) else '{}'::text[] end;
begin
  if not app.can_manage_house_content() then raise exception 'Acesso negado'; end if;
  if v_title = '' then raise exception 'Informe o título.'; end if;
  if v_type not in ('content','rule') then raise exception 'Tipo de conteúdo inválido.'; end if;
  if v_layout not in ('normal','abas') then v_layout := 'normal'; end if;
  if v_id is null then
    insert into public.house_contents(title, body, content_type, tags, featured, sort_order,
           summary, cover_url, cover_color, is_required, is_draft, layout, is_public, created_by, updated_by)
    values (v_title, coalesce(p_data->>'body',''), v_type, v_tags,
            coalesce((p_data->>'featured')::boolean,false), coalesce((p_data->>'sort_order')::int,0),
            nullif(trim(coalesce(p_data->>'summary','')),''), nullif(p_data->>'cover_url',''),
            nullif(p_data->>'cover_color',''), coalesce((p_data->>'is_required')::boolean,false),
            coalesce((p_data->>'is_draft')::boolean,false), v_layout,
            coalesce((p_data->>'is_public')::boolean,false),
            auth.uid(), auth.uid())
    returning id into v_id;
  else
    update public.house_contents
       set title = v_title,
           body = coalesce(p_data->>'body',''),
           content_type = v_type,
           tags = v_tags,
           featured = coalesce((p_data->>'featured')::boolean,false),
           summary = nullif(trim(coalesce(p_data->>'summary','')),''),
           cover_url = nullif(p_data->>'cover_url',''),
           cover_color = nullif(p_data->>'cover_color',''),
           is_required = coalesce((p_data->>'is_required')::boolean,false),
           is_draft = case when p_data ? 'is_draft' then (p_data->>'is_draft')::boolean else is_draft end,
           layout = case when p_data ? 'layout' then v_layout else layout end,
           is_public = case when p_data ? 'is_public' then (p_data->>'is_public')::boolean else is_public end,
           updated_by = auth.uid(),
           updated_at = now()
     where id = v_id;
    if not found then raise exception 'Conteúdo não encontrado.'; end if;
  end if;
  return v_id;
end;
$function$;

notify pgrst, 'reload schema';
