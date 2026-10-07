-- =====================================================================
-- 2026-10-07 (f) — Avisos no celular (push) e telefone para WhatsApp
--
-- O que este arquivo faz:
--   1. Telefone (WhatsApp) no cadastro: a pessoa edita o próprio; a gestão edita de todos.
--   2. Guarda os celulares que ativaram avisos (push_subscriptions).
--   3. Fila de avisos (push_queue): tudo que vira aviso no app também vira aviso no celular.
--   4. Lembretes diários automáticos (mensalidade, gira amanhã) às 9h de Brasília.
--   5. Chama a função "enviar-avisos" do Supabase sempre que entra aviso na fila.
--
-- Pode rodar mais de uma vez sem problema. No fim aparece o SEGREDO que vai
-- nas configurações da função "enviar-avisos" (passo a passo no LEIA-ME).
-- =====================================================================

-- extensões do Supabase (se alguma não ativar aqui, ative em Database → Extensions e rode de novo)
do $$ begin create extension if not exists pg_net with schema extensions; exception when others then raise warning 'pg_net: %', sqlerrm; end $$;
do $$ begin create extension if not exists pg_cron; exception when others then raise warning 'pg_cron: %', sqlerrm; end $$;
do $$ begin create extension if not exists pgcrypto with schema extensions; exception when others then raise warning 'pgcrypto: %', sqlerrm; end $$;

-- ---------- 1. Telefone ----------
alter table public.profiles add column if not exists phone text;

create or replace function app.normalize_phone(p text)
returns text language sql immutable as $$
  select case
    when p is null or regexp_replace(p, '\D', '', 'g') = '' then null
    when length(regexp_replace(p, '\D', '', 'g')) in (10, 11) then '55' || regexp_replace(p, '\D', '', 'g')
    else regexp_replace(p, '\D', '', 'g')
  end
$$;

create or replace function app.update_my_phone(p_phone text)
returns text language plpgsql security definer set search_path = public, app as $$
declare v text := app.normalize_phone(p_phone);
begin
  if v is not null and length(v) not between 12 and 13 then
    raise exception 'Telefone inválido. Use DDD + número, ex.: (11) 98765-4321.';
  end if;
  update public.profiles set phone = v, updated_at = now() where id = auth.uid();
  return v;
end $$;
create or replace function public.update_my_phone(p_phone text)
returns text language sql security invoker set search_path = public, app as $$ select app.update_my_phone(p_phone) $$;

-- admin_save_person agora também aceita "phone"
create or replace function app.admin_save_person(p_profile_id uuid, p jsonb)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'app'
as $function$
declare v_target public.profiles; v_phone text;
begin
  if not (app.is_admin() or app.has_permission('people.manage')) then raise exception 'Acesso negado'; end if;
  select * into v_target from public.profiles where id = p_profile_id;
  if v_target.id is null then raise exception 'Pessoa não encontrada.'; end if;
  if v_target.is_master and not app.is_master() then raise exception 'Somente o master pode editar este cadastro.'; end if;
  if p ? 'name' and coalesce(trim(p->>'name'),'') = '' then raise exception 'O nome não pode ficar vazio.'; end if;
  if p ? 'phone' then
    v_phone := app.normalize_phone(p->>'phone');
    if v_phone is not null and length(v_phone) not between 12 and 13 then
      raise exception 'Telefone inválido. Use DDD + número, ex.: (11) 98765-4321.';
    end if;
  end if;
  update public.profiles set
    name            = case when p ? 'name' then trim(p->>'name') else name end,
    date_of_birth   = case when p ? 'date_of_birth' then nullif(p->>'date_of_birth','')::date else date_of_birth end,
    orixa_symbol    = case when p ? 'orixa_symbol' then nullif(p->>'orixa_symbol','') else orixa_symbol end,
    group_id        = case when p ? 'group_id' then nullif(p->>'group_id','')::uuid else group_id end,
    leadership_seal = case when p ? 'leadership_seal' then nullif(trim(p->>'leadership_seal'),'') else leadership_seal end,
    is_iniciado     = case when p ? 'is_iniciado' then (p->>'is_iniciado')::boolean else is_iniciado end,
    is_active       = case when p ? 'is_active' then (p->>'is_active')::boolean else is_active end,
    is_pai_de_santo = case when p ? 'is_pai_de_santo' then (p->>'is_pai_de_santo')::boolean else is_pai_de_santo end,
    phone           = case when p ? 'phone' then v_phone else phone end,
    updated_at = now()
  where id = p_profile_id;
end;
$function$;

-- ---------- 2. Celulares com avisos ativados ----------
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_ok_at   timestamptz
);
create index if not exists push_subscriptions_profile_idx on public.push_subscriptions(profile_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push: vejo os meus" on public.push_subscriptions;
create policy "push: vejo os meus" on public.push_subscriptions for select to authenticated using (profile_id = auth.uid());
drop policy if exists "push: apago os meus" on public.push_subscriptions;
create policy "push: apago os meus" on public.push_subscriptions for delete to authenticated using (profile_id = auth.uid());
grant select, delete on public.push_subscriptions to authenticated;

-- salvar/atualizar o celular (o mesmo aparelho pode trocar de pessoa ao sair e entrar com outra conta)
create or replace function app.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void language plpgsql security definer set search_path = public, app as $$
begin
  if auth.uid() is null then raise exception 'Entre no app primeiro.'; end if;
  insert into public.push_subscriptions(profile_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update set profile_id = excluded.profile_id, p256dh = excluded.p256dh,
    auth = excluded.auth, user_agent = excluded.user_agent, created_at = now();
end $$;
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void language sql security invoker set search_path = public, app as $$
  select app.save_push_subscription(p_endpoint, p_p256dh, p_auth, p_user_agent) $$;

-- ---------- 3. Fila de avisos ----------
create table if not exists public.push_queue (
  id          bigserial primary key,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  body        text,
  url         text,
  tag         text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz,
  devices     int,
  last_error  text
);
create unique index if not exists push_queue_tag_uniq on public.push_queue(profile_id, tag) where tag is not null;
create index if not exists push_queue_pending_idx on public.push_queue(created_at) where sent_at is null;
alter table public.push_queue enable row level security;  -- sem políticas: só o servidor mexe

-- configuração privada (endereço da função e segredo)
create table if not exists app.push_config (key text primary key, value text not null);
insert into app.push_config(key, value) values
  ('function_url', 'https://fjkgryfkeyqqcgpemvic.supabase.co/functions/v1/enviar-avisos'),
  ('secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;
revoke all on app.push_config from public, anon, authenticated;

-- colocar um aviso na fila (não quebra nada se der erro)
create or replace function app.push_enqueue(p_profile_id uuid, p_title text, p_body text, p_url text default null, p_tag text default null)
returns void language plpgsql security definer set search_path = public, app as $$
begin
  if p_profile_id is null then return; end if;
  insert into public.push_queue(profile_id, title, body, url, tag)
  values (p_profile_id, left(p_title, 120), left(p_body, 400), p_url, p_tag)
  on conflict do nothing;
exception when others then
  raise warning 'push_enqueue: %', sqlerrm;
end $$;

-- quando entram avisos na fila, chama a função que envia (uma chamada por lote)
create or replace function app.push_kick() returns trigger
language plpgsql security definer set search_path = public, app, extensions as $$
declare v_url text; v_secret text;
begin
  select value into v_url from app.push_config where key = 'function_url';
  select value into v_secret from app.push_config where key = 'secret';
  perform net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    timeout_milliseconds := 10000
  );
  return null;
exception when others then
  raise warning 'push_kick: %', sqlerrm;
  return null;
end $$;
drop trigger if exists push_queue_kick on public.push_queue;
create trigger push_queue_kick after insert on public.push_queue
  for each statement execute function app.push_kick();

-- a função "enviar-avisos" pega o lote pendente por aqui (só o servidor pode chamar)
create or replace function public.push_claim_batch(p_limit int default 300)
returns table (id bigint, profile_id uuid, title text, body text, url text, tag text)
language sql security definer set search_path = public, app as $$
  update public.push_queue q set sent_at = now()
   where q.id in (select x.id from public.push_queue x
                   where x.sent_at is null and x.created_at > now() - interval '2 days'
                   order by x.id limit p_limit for update skip locked)
  returning q.id, q.profile_id, q.title, q.body, q.url, q.tag;
$$;
create or replace function public.push_report(p_id bigint, p_devices int, p_error text)
returns void language sql security definer set search_path = public, app as $$
  update public.push_queue set devices = p_devices, last_error = p_error where id = p_id;
$$;
revoke all on function public.push_claim_batch(int) from public, anon, authenticated;
revoke all on function public.push_report(bigint, int, text) from public, anon, authenticated;
grant execute on function public.push_claim_batch(int) to service_role;
grant execute on function public.push_report(bigint, int, text) to service_role;

-- ---------- 4. O que vira aviso no celular ----------
-- avisos de gira que já existem no app
create or replace function app.push_from_gira_notice() returns trigger
language plpgsql security definer set search_path = public, app as $$
begin
  perform app.push_enqueue(new.profile_id,
    case when tg_table_name = 'gira_turn_change_notifications' then 'Seu turno foi alterado' else 'Aviso da gira' end,
    new.message, '?tela=giras', tg_table_name || ':' || new.id);
  return new;
end $$;
drop trigger if exists push_gira_turn_availability on public.gira_turn_availability_notifications;
create trigger push_gira_turn_availability after insert on public.gira_turn_availability_notifications
  for each row execute function app.push_from_gira_notice();
drop trigger if exists push_gira_turn_change on public.gira_turn_change_notifications;
create trigger push_gira_turn_change after insert on public.gira_turn_change_notifications
  for each row execute function app.push_from_gira_notice();

-- pedido de troca de turno
create or replace function app.push_from_exchange() returns trigger
language plpgsql security definer set search_path = public, app as $$
begin
  perform app.push_enqueue(new.recipient_id, 'Pedido de troca de turno',
    'Uma pessoa gostaria de trocar de horário com você. Toque para ver.', '?tela=giras', 'troca:' || new.id);
  return new;
end $$;
drop trigger if exists push_exchange on public.task_exchange_notifications;
create trigger push_exchange after insert on public.task_exchange_notifications
  for each row execute function app.push_from_exchange();

-- comprovante aprovado ou recusado
create or replace function app.push_from_proof() returns trigger
language plpgsql security definer set search_path = public, app as $$
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    perform app.push_enqueue(new.profile_id,
      case when new.status = 'approved' then 'Pagamento confirmado 🙏' else 'Comprovante não aprovado' end,
      case when new.status = 'approved' then coalesce(new.description, 'Seu pagamento') || ' foi confirmado. Obrigado!'
           else coalesce('Motivo: ' || new.reject_reason, 'Toque para ver o motivo e enviar de novo.') end,
      '?tela=me', 'comprovante:' || new.id || ':' || new.status);
  end if;
  return new;
end $$;
drop trigger if exists push_proof on public.payment_proofs;
create trigger push_proof after update on public.payment_proofs
  for each row execute function app.push_from_proof();

-- leitura obrigatória publicada ou lembrada
create or replace function app.push_from_required_content() returns trigger
language plpgsql security definer set search_path = public, app as $$
declare r record;
begin
  if coalesce(new.is_required, false)
     and (tg_op = 'INSERT' or not coalesce(old.is_required, false) or new.reminded_at is distinct from old.reminded_at) then
    for r in select p.id from public.profiles p
              where p.is_active
                and not exists (select 1 from public.house_content_reads x
                                 where x.content_id = new.id and x.profile_id = p.id and x.confirmed_at is not null)
    loop
      perform app.push_enqueue(r.id, 'Leitura obrigatória', new.title, '?tela=content',
        'leitura:' || new.id || ':' || coalesce(extract(epoch from new.reminded_at)::bigint::text, '0'));
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists push_required_content on public.house_contents;
create trigger push_required_content after insert or update on public.house_contents
  for each row execute function app.push_from_required_content();

-- comentário no Mural: avisa quem publicou
create or replace function app.push_from_comment() returns trigger
language plpgsql security definer set search_path = public, app as $$
declare v_author uuid; v_name text;
begin
  select author_id into v_author from public.community_posts where id = new.post_id;
  if v_author is null or v_author = new.author_id then return new; end if;
  select split_part(coalesce(name, 'Alguém'), ' ', 1) into v_name from public.profiles where id = new.author_id;
  perform app.push_enqueue(v_author, v_name || ' comentou sua publicação', new.body, '?tela=community', 'comentario:' || new.id);
  return new;
end $$;
do $$ begin
  if to_regclass('public.community_post_comments') is not null then
    execute 'drop trigger if exists push_comment on public.community_post_comments';
    execute 'create trigger push_comment after insert on public.community_post_comments for each row execute function app.push_from_comment()';
  end if;
end $$;

-- ---------- 5. Lembretes diários (9h de Brasília) ----------
create or replace function app.push_daily_reminders()
returns int language plpgsql security definer set search_path = public, app as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_month date := date_trunc('month', v_today)::date;
  v_due_day int; v_rem int; v_amount numeric; v_n int := 0; r record;
begin
  select coalesce(due_day, 20), coalesce(reminder_days, 5), coalesce(monthly_amount, 40)
    into v_due_day, v_rem, v_amount from public.finance_settings order by id limit 1;
  v_due_day := coalesce(v_due_day, 20); v_rem := coalesce(v_rem, 5); v_amount := coalesce(v_amount, 40);

  -- mensalidade: lembrete X dias antes e aviso no dia do vencimento
  if extract(day from v_today)::int in (v_due_day - v_rem, v_due_day) then
    for r in select p.id from public.profiles p
              where p.is_active and app.is_financially_eligible(p.id, v_month)
                and not exists (select 1 from public.monthly_dues d
                                 where d.profile_id = p.id and d.reference_month = v_month
                                   and d.status::text in ('paid', 'not_applicable'))
                and not exists (select 1 from public.payment_proofs pp
                                 where pp.profile_id = p.id and pp.kind = 'monthly'
                                   and pp.reference_month = v_month and pp.status = 'pending')
    loop
      perform app.push_enqueue(r.id,
        case when extract(day from v_today)::int = v_due_day then 'A mensalidade vence hoje'
             else 'Mensalidade vence dia ' || v_due_day end,
        'R$ ' || replace(to_char(v_amount, 'FM999990.00'), '.', ',') || ' pelo Pix. Toque para ver como pagar.',
        '?tela=me', 'mensalidade:' || to_char(v_month, 'YYYY-MM') || ':' || extract(day from v_today)::int);
      v_n := v_n + 1;
    end loop;
  end if;

  -- gira amanhã: para quem confirmou presença
  for r in select g.id, g.name, g.starts_at, x.profile_id
             from public.giras g
             join public.gira_responses x on x.gira_id = g.id and x.status = 'going'
             join public.profiles p on p.id = x.profile_id and p.is_active
            where coalesce(g.status, 'published') = 'published'
              and (g.starts_at at time zone 'America/Sao_Paulo')::date = v_today + 1
  loop
    perform app.push_enqueue(r.profile_id, 'Amanhã tem gira 🌿',
      r.name || ' às ' || to_char(r.starts_at at time zone 'America/Sao_Paulo', 'HH24:MI') || '. Veja o que levar.',
      '?tela=giras', 'gira-amanha:' || r.id);
    v_n := v_n + 1;
  end loop;

  -- limpeza: fila com mais de 60 dias
  delete from public.push_queue where created_at < now() - interval '60 days';
  return v_n;
end $$;

do $$ begin
  perform cron.unschedule('tpbc-lembretes-diarios') where exists (select 1 from cron.job where jobname = 'tpbc-lembretes-diarios');
  perform cron.schedule('tpbc-lembretes-diarios', '0 12 * * *', 'select app.push_daily_reminders()');
exception when others then
  raise warning 'Não consegui agendar os lembretes diários (%). Ative a extensão pg_cron em Database → Extensions e rode este arquivo de novo.', sqlerrm;
end $$;

-- ---------- permissões ----------
grant execute on function public.update_my_phone(text) to authenticated;
grant execute on function app.update_my_phone(text) to authenticated;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
grant execute on function app.save_push_subscription(text, text, text, text) to authenticated;
grant execute on function app.normalize_phone(text) to authenticated;

notify pgrst, 'reload schema';

-- Copie o valor abaixo: ele vai em PUSH_SECRET na função "enviar-avisos".
select value as "PUSH_SECRET (copie)" from app.push_config where key = 'secret';
