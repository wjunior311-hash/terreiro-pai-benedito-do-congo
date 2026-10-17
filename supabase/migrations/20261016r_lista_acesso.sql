-- =====================================================================
-- 2026-10-16 (r) — Lista de acesso de eventos (nome completo + RG)
--   * giras.collect_docs: a gira pede os dados de quem pagou a contribuição.
--   * O filho da casa que pagou vê um cartão no Início e envia nome completo + RG.
--   * Só admins/masters veem os RGs e baixam a planilha.
--   * Pedido automático por notificação quando o pagamento é aprovado.
--   * Os RGs são apagados sozinhos 1 dia depois do evento.
-- =====================================================================

alter table public.giras add column if not exists collect_docs boolean not null default false;

create table if not exists public.gira_access_docs (
  gira_id    uuid not null references public.giras(id),
  profile_id uuid not null references public.profiles(id),
  full_name  text not null,
  rg         text,
  updated_at timestamptz not null default now(),
  primary key (gira_id, profile_id)
);
alter table public.gira_access_docs enable row level security;

create or replace function app.paid_event(p_gira uuid, p_profile uuid) returns boolean
language sql stable security definer set search_path = public, app as $$
  select exists(select 1 from public.extra_charges c where c.gira_id = p_gira and c.profile_id = p_profile and c.status = 'paid')
$$;

-- o que falta eu enviar
create or replace function app.my_access_docs() returns jsonb
language sql stable security definer set search_path = public, app as $$
  select coalesce(jsonb_agg(jsonb_build_object('gira_id', g.id, 'gira', g.name, 'starts_at', g.starts_at,
           'sent', d.profile_id is not null, 'full_name', coalesce(d.full_name, p.name), 'has_rg', d.rg is not null)
           order by g.starts_at), '[]'::jsonb)
  from public.giras g
  join public.profiles p on p.id = auth.uid()
  left join public.gira_access_docs d on d.gira_id = g.id and d.profile_id = p.id
  where g.collect_docs and g.starts_at > now() - interval '12 hours' and app.paid_event(g.id, p.id)
$$;

create or replace function app.save_access_doc(p_gira uuid, p_full_name text, p_rg text) returns void
language plpgsql security definer set search_path = public, app as $$
declare v_rg text := upper(regexp_replace(coalesce(p_rg, ''), '[^0-9A-Za-z]', '', 'g'));
begin
  if auth.uid() is null then raise exception 'Entre no app para enviar.'; end if;
  if not exists(select 1 from public.giras where id = p_gira and collect_docs) then raise exception 'Este evento não pede dados.'; end if;
  if not app.paid_event(p_gira, auth.uid()) then raise exception 'Os dados são pedidos depois que o pagamento é confirmado.'; end if;
  if length(trim(coalesce(p_full_name, ''))) < 5 or position(' ' in trim(p_full_name)) = 0 then raise exception 'Escreva seu nome completo.'; end if;
  if length(v_rg) < 5 then raise exception 'Confira o número do RG.'; end if;
  insert into public.gira_access_docs(gira_id, profile_id, full_name, rg, updated_at)
  values (p_gira, auth.uid(), trim(regexp_replace(p_full_name, '\s+', ' ', 'g')), v_rg, now())
  on conflict (gira_id, profile_id) do update set full_name = excluded.full_name, rg = excluded.rg, updated_at = now();
end $$;

-- gestão: quem pagou, quem enviou (só admin/master vê RG)
create or replace function app.admin_access_docs(p_gira uuid)
returns table (profile_id uuid, name text, phone text, orixa_symbol text, full_name text, rg text, sent_at timestamptz)
language plpgsql stable security definer set search_path = public, app as $$
begin
  if not (app.is_admin() or app.is_master()) then raise exception 'Acesso negado'; end if;
  return query
  select p.id, p.name, p.phone, p.orixa_symbol, d.full_name, d.rg, d.updated_at
    from public.profiles p
    left join public.gira_access_docs d on d.gira_id = p_gira and d.profile_id = p.id
   where app.paid_event(p_gira, p.id) or d.profile_id is not null
   order by (d.profile_id is null) desc, coalesce(d.full_name, p.name);
end $$;

create or replace function app.admin_access_doc_giras() returns jsonb
language plpgsql stable security definer set search_path = public, app as $$
begin
  if not (app.is_admin() or app.is_master()) then raise exception 'Acesso negado'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'starts_at', g.starts_at) order by g.starts_at)
    from public.giras g where g.collect_docs and g.starts_at > now() - interval '3 days'), '[]'::jsonb);
end $$;

-- pagamento aprovado -> pede os dados
create or replace function app.trg_charge_paid_docs() returns trigger
language plpgsql security definer set search_path = public, app as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' and new.gira_id is not null
     and exists(select 1 from public.giras g where g.id = new.gira_id and g.collect_docs and g.starts_at > now())
     and not exists(select 1 from public.gira_access_docs d where d.gira_id = new.gira_id and d.profile_id = new.profile_id) then
    perform app.push_enqueue(new.profile_id, 'Pagamento confirmado ✅ Falta um passo',
      'Envie seu nome completo e RG para a lista de acesso do evento. Toque para enviar.', '?tela=home', 'docs:' || new.gira_id);
  end if;
  return new;
end $$;
create or replace trigger extra_charges_paid_docs after update of status on public.extra_charges
  for each row execute function app.trg_charge_paid_docs();

-- RGs apagados 1 dia depois do evento
create or replace function app.purge_access_docs() returns integer
language sql security definer set search_path = public, app as $$
  with u as (update public.gira_access_docs d set rg = null
              from public.giras g where g.id = d.gira_id and d.rg is not null and g.starts_at < now() - interval '1 day'
             returning 1)
  select count(*)::int from u
$$;
select cron.schedule('tpbc-apaga-rg', '30 6 * * *', 'select app.purge_access_docs()');

create or replace function public.my_access_docs() returns jsonb language sql stable security invoker set search_path = public, app as $$ select app.my_access_docs() $$;
create or replace function public.save_access_doc(p_gira uuid, p_full_name text, p_rg text) returns void language sql security invoker set search_path = public, app as $$ select app.save_access_doc(p_gira, p_full_name, p_rg) $$;
create or replace function public.admin_access_docs(p_gira uuid)
returns table (profile_id uuid, name text, phone text, orixa_symbol text, full_name text, rg text, sent_at timestamptz)
language sql stable security invoker set search_path = public, app as $$ select * from app.admin_access_docs(p_gira) $$;
create or replace function public.admin_access_doc_giras() returns jsonb language sql stable security invoker set search_path = public, app as $$ select app.admin_access_doc_giras() $$;
grant execute on function app.paid_event(uuid, uuid), app.my_access_docs(), app.save_access_doc(uuid, text, text), app.admin_access_docs(uuid), app.admin_access_doc_giras() to authenticated;
grant execute on function public.my_access_docs(), public.save_access_doc(uuid, text, text), public.admin_access_docs(uuid), public.admin_access_doc_giras() to authenticated;

update public.giras set collect_docs = true where id = '3f784d1c-64f2-47ef-bd21-ae1830eaa125';
notify pgrst, 'reload schema';
