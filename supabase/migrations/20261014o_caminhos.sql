-- =====================================================================
-- 2026-10-14 (o) — Caminhos: avisos que avançam em etapas
--   * Um Caminho (ex.: Gira na Praia 2027) tem etapas: enquete,
--     voluntários ou informação. Cada etapa: futura, aberta ou concluída.
--   * Cada filho da casa responde uma vez por etapa (pode mudar até o prazo).
--   * Todos veem o resultado geral, sem nomes; a gestão vê os nomes e quem falta.
--   * Quando 80% da casa responde, a gestão recebe aviso no celular.
-- Pode rodar mais de uma vez. Nada é apagado.
-- =====================================================================

create table if not exists public.caminhos (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  title      text not null,
  emoji      text not null default '🌿',
  intro      text not null default '',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.caminho_etapas (
  id          uuid primary key default gen_random_uuid(),
  caminho_id  uuid not null references public.caminhos(id),
  ord         int  not null,
  kind        text not null default 'info' check (kind in ('enquete', 'voluntarios', 'info')),
  title       text not null,
  body        text not null default '',
  status      text not null default 'futura' check (status in ('futura', 'aberta', 'concluida')),
  deadline    timestamptz,
  options     jsonb not null default '[]',
  ask_family  boolean not null default false,
  notified_80 boolean not null default false,
  unique (caminho_id, ord)
);
create table if not exists public.caminho_respostas (
  etapa_id     uuid not null references public.caminho_etapas(id),
  profile_id   uuid not null references public.profiles(id),
  option       text not null,
  family_count int  not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (etapa_id, profile_id)
);
alter table public.caminhos enable row level security;
alter table public.caminho_etapas enable row level security;
alter table public.caminho_respostas enable row level security;

-- quem conta como "a casa" para os 80%: filhos ativos (sem os pais de santo)
create or replace function app.caminho_base() returns int
language sql stable security definer set search_path = public, app as $$
  select count(*)::int from public.profiles where is_active and not coalesce(is_pai_de_santo, false)
$$;

create or replace function app.can_manage_caminhos() returns boolean
language sql stable security definer set search_path = public, app as $$
  select app.is_admin() or app.is_master() or app.has_permission('people.manage')
$$;

-- tudo o que o filho da casa vê
create or replace function app.my_caminhos() returns jsonb
language plpgsql stable security definer set search_path = public, app as $$
begin
  if auth.uid() is null or not app.is_active_member() then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'slug', c.slug, 'title', c.title, 'emoji', c.emoji, 'intro', c.intro,
      'etapas', (select jsonb_agg(jsonb_build_object(
          'id', e.id, 'ord', e.ord, 'kind', e.kind, 'title', e.title, 'body', e.body, 'status', e.status,
          'deadline', e.deadline, 'options', e.options, 'ask_family', e.ask_family,
          'mine', (select jsonb_build_object('option', r.option, 'family_count', r.family_count, 'updated_at', r.updated_at)
                     from public.caminho_respostas r where r.etapa_id = e.id and r.profile_id = auth.uid()),
          'answered', (select count(*) from public.caminho_respostas r where r.etapa_id = e.id),
          'base', app.caminho_base(),
          'counts', (select coalesce(jsonb_object_agg(x.option, x.n), '{}') from
                      (select r.option, count(*) as n from public.caminho_respostas r where r.etapa_id = e.id group by r.option) x),
          'people_total', (select coalesce(sum(1 + r.family_count), 0) from public.caminho_respostas r
                            where r.etapa_id = e.id and r.option <> 'nao')
        ) order by e.ord) from public.caminho_etapas e where e.caminho_id = c.id)
    ) order by c.created_at desc)
    from public.caminhos c where c.active), '[]'::jsonb);
end $$;

create or replace function app.caminho_responder(p_etapa uuid, p_option text, p_family int default 0) returns void
language plpgsql security definer set search_path = public, app as $$
declare v_e public.caminho_etapas; v_n int; r record;
begin
  if auth.uid() is null or not app.is_active_member() then raise exception 'Entre no app para responder.'; end if;
  select * into v_e from public.caminho_etapas where id = p_etapa;
  if v_e.id is null or v_e.status <> 'aberta' then raise exception 'Esta etapa não está aberta.'; end if;
  if v_e.deadline is not null and now() > v_e.deadline then raise exception 'O prazo para responder terminou.'; end if;
  if v_e.kind = 'enquete' and not exists (select 1 from jsonb_array_elements(v_e.options) o where o->>'k' = p_option) then
    raise exception 'Opção inválida.';
  end if;
  insert into public.caminho_respostas(etapa_id, profile_id, option, family_count, updated_at)
  values (p_etapa, auth.uid(), p_option, case when v_e.ask_family and p_option <> 'nao' then greatest(0, least(coalesce(p_family, 0), 20)) else 0 end, now())
  on conflict (etapa_id, profile_id) do update set option = excluded.option, family_count = excluded.family_count, updated_at = now();
  -- 80% da casa respondeu: avisa a gestão uma vez
  select count(*) into v_n from public.caminho_respostas where etapa_id = p_etapa;
  if not v_e.notified_80 and v_n >= ceil(0.8 * app.caminho_base()) then
    update public.caminho_etapas set notified_80 = true where id = p_etapa;
    for r in select id from public.profiles where is_active and (role = 'admin' or is_master) loop
      perform app.push_enqueue(r.id, '80% já responderam 🎉', v_e.title || ': dá para abrir a próxima etapa.', '?tela=admin', 'caminho80:' || p_etapa);
    end loop;
  end if;
end $$;

-- gestão: respostas com nomes e quem falta
create or replace function app.admin_caminho_respostas(p_etapa uuid)
returns table (profile_id uuid, name text, orixa_symbol text, phone text, option text, family_count int, updated_at timestamptz)
language plpgsql stable security definer set search_path = public, app as $$
begin
  if not app.can_manage_caminhos() then raise exception 'Acesso negado'; end if;
  return query
  select p.id, p.name, p.orixa_symbol, p.phone, r.option, coalesce(r.family_count, 0), r.updated_at
    from public.profiles p
    left join public.caminho_respostas r on r.etapa_id = p_etapa and r.profile_id = p.id
   where p.is_active and (not coalesce(p.is_pai_de_santo, false) or r.option is not null)
   order by (r.option is null) desc, p.name;
end $$;

-- gestão: abrir, encerrar ou reabrir uma etapa (abrir avisa todo mundo)
create or replace function app.admin_caminho_etapa(p_etapa uuid, p_status text, p_deadline timestamptz default null, p_body text default null)
returns void language plpgsql security definer set search_path = public, app as $$
declare v_e public.caminho_etapas; v_c public.caminhos; r record;
begin
  if not app.can_manage_caminhos() then raise exception 'Acesso negado'; end if;
  if p_status not in ('futura', 'aberta', 'concluida') then raise exception 'Situação inválida.'; end if;
  select * into v_e from public.caminho_etapas where id = p_etapa;
  select * into v_c from public.caminhos where id = v_e.caminho_id;
  update public.caminho_etapas
     set status = p_status,
         deadline = coalesce(p_deadline, deadline),
         body = coalesce(p_body, body)
   where id = p_etapa;
  if p_status = 'aberta' and v_e.status <> 'aberta' then
    for r in select id from public.profiles where is_active loop
      perform app.push_enqueue(r.id, v_c.emoji || ' ' || v_c.title, 'Nova etapa: ' || v_e.title || '. Toque para ver.', '?tela=caminho', 'caminho:' || p_etapa);
    end loop;
  end if;
end $$;

create or replace function public.my_caminhos() returns jsonb
language sql stable security invoker set search_path = public, app as $$ select app.my_caminhos() $$;
create or replace function public.caminho_responder(p_etapa uuid, p_option text, p_family int default 0) returns void
language sql security invoker set search_path = public, app as $$ select app.caminho_responder(p_etapa, p_option, p_family) $$;
create or replace function public.admin_caminho_respostas(p_etapa uuid)
returns table (profile_id uuid, name text, orixa_symbol text, phone text, option text, family_count int, updated_at timestamptz)
language sql stable security invoker set search_path = public, app as $$ select * from app.admin_caminho_respostas(p_etapa) $$;
create or replace function public.admin_caminho_etapa(p_etapa uuid, p_status text, p_deadline timestamptz default null, p_body text default null)
returns void language sql security invoker set search_path = public, app as $$ select app.admin_caminho_etapa(p_etapa, p_status, p_deadline, p_body) $$;

grant execute on function app.caminho_base(), app.can_manage_caminhos(), app.my_caminhos(), app.caminho_responder(uuid, text, int),
  app.admin_caminho_respostas(uuid), app.admin_caminho_etapa(uuid, text, timestamptz, text) to authenticated;
grant execute on function public.my_caminhos(), public.caminho_responder(uuid, text, int),
  public.admin_caminho_respostas(uuid), public.admin_caminho_etapa(uuid, text, timestamptz, text) to authenticated;

-- ---------- Gira na Praia 2027 ----------
insert into public.caminhos(slug, title, emoji, intro)
values ('praia-2027', 'Gira na Praia 2027', '🌊',
'A primeira gira do ano é na praia, em Itanhaém, em fevereiro de 2027. O trabalho acontece no sábado à noite, na praia.

Para organizar tudo com calma, vamos por etapas. A gira acontece de qualquer jeito: esta pesquisa serve para sabermos quantos vão e se a casa precisa alugar uma casa compartilhada.')
on conflict (slug) do nothing;

insert into public.caminho_etapas(caminho_id, ord, kind, title, body, status, deadline, options, ask_family)
select c.id, 1, 'enquete', 'Quem vai?', 'Responda até domingo, 18/10. Você pode mudar sua resposta até o prazo.', 'aberta',
       '2026-10-18 23:59:00-03',
       '[{"k":"casa","e":"🏠","t":"Vou com a casa","d":"Casa compartilhada com todo mundo"},
         {"k":"conta","e":"🧳","t":"Vou por conta própria","d":"Fico em outra casa ou pousada"},
         {"k":"sabado","e":"🌙","t":"Vou só para o trabalho de sábado","d":"Desço só para a gira"},
         {"k":"nao","e":"🙏🏾","t":"Não vou desta vez","d":""}]'::jsonb, true
  from public.caminhos c where c.slug = 'praia-2027'
on conflict (caminho_id, ord) do nothing;
insert into public.caminho_etapas(caminho_id, ord, kind, title, body)
select c.id, x.ord, x.kind, x.title, x.body from public.caminhos c,
 (values (2, 'voluntarios', 'Hospedagem',
          'Depende da etapa 1. Se muita gente quiser casa compartilhada, abre um chamado de quem pode ajudar a procurar casas em Itanhaém. Se a maioria for por conta, cada um organiza a sua hospedagem.'),
         (3, 'info', 'Informações do dia e caronas', 'Praia, horário, o que levar e caronas (quem tem lugar no carro e quem precisa).'),
         (4, 'info', 'Inscrição na gira', 'A gira é criada no app, com valor e pagamento, igual às outras giras.')) x(ord, kind, title, body)
 where c.slug = 'praia-2027'
on conflict (caminho_id, ord) do nothing;

notify pgrst, 'reload schema';
