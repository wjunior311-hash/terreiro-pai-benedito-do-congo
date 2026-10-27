-- Contribuição para quem é de fora (convidados/comunidade) em giras com valor.
-- O convidado se inscreve (vaga reservada), paga por Pix e anexa o comprovante na própria página;
-- a gestão confere e confirma. Quem não mandar comprovante até o prazo perde a reserva (vai para a espera o próximo).
alter table public.giras add column if not exists community_fee numeric(10,2);
alter table public.giras add column if not exists community_fee_until timestamptz;
alter table public.community_signups add column if not exists pay_status text;      -- null (gratuita) | aguardando | enviado | pago
alter table public.community_signups add column if not exists proof text;           -- imagem do comprovante (data URL, comprimida no aparelho)
alter table public.community_signups add column if not exists proof_at timestamptz;
alter table public.community_signups add column if not exists paid_at timestamptz;
alter table public.community_signups add column if not exists paid_by uuid;

-- info de contribuição de uma gira (página aberta)
create or replace function app.public_gira_fee(p_gira uuid)
returns jsonb language sql stable security definer set search_path = public, app as $$
  select jsonb_build_object('fee', g.community_fee, 'until', g.community_fee_until,
                            'pix', (select pix_key from public.finance_settings where id = 1))
    from public.giras g where g.id = p_gira and coalesce(g.community_fee, 0) > 0
$$;

-- situação do pagamento das minhas inscrições (por token guardado no aparelho)
create or replace function app.public_signup_pay(p_tokens uuid[])
returns jsonb language sql stable security definer set search_path = public, app as $$
  select coalesce(jsonb_agg(jsonb_build_object('token', s.token, 'pay', s.pay_status, 'fee', g.community_fee,
           'until', g.community_fee_until, 'pix', (select pix_key from public.finance_settings where id = 1))), '[]'::jsonb)
    from public.community_signups s join public.giras g on g.id = s.gira_id
   where s.token = any(p_tokens) and coalesce(g.community_fee, 0) > 0
$$;

create or replace function app.public_send_proof(p_token uuid, p_data text)
returns text language plpgsql security definer set search_path = public, app as $$
declare v_s public.community_signups;
begin
  select * into v_s from public.community_signups where token = p_token for update;
  if v_s.id is null then raise exception 'Inscrição não encontrada.'; end if;
  if v_s.status in ('cancel', 'recusado') then raise exception 'Esta inscrição foi cancelada. Fale com a casa pelo WhatsApp.'; end if;
  if v_s.pay_status is null then raise exception 'Esta gira não tem contribuição.'; end if;
  if v_s.pay_status = 'pago' then return 'pago'; end if;
  if p_data is null or p_data !~ '^data:(image/(jpeg|png|webp)|application/pdf);base64,' then raise exception 'Envie uma foto, print ou PDF do comprovante.'; end if;
  if length(p_data) > 2200000 then raise exception 'O arquivo é grande demais. Envie um print do comprovante.'; end if;
  update public.community_signups set proof = p_data, proof_at = now(), pay_status = 'enviado' where id = v_s.id;
  return 'enviado';
end $$;

-- inscrição: em gira com contribuição, já nasce aguardando pagamento
create or replace function app.trg_community_signup_fee()
returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  if new.pay_status is null and exists (select 1 from public.giras g where g.id = new.gira_id and coalesce(g.community_fee, 0) > 0) then
    new.pay_status := case when new.source = 'gestao' then 'pago' else 'aguardando' end;
  end if;
  return new;
end $$;
create or replace trigger community_signup_fee before insert on public.community_signups for each row execute function app.trg_community_signup_fee();

-- gestão
create or replace function app.admin_community_pay(p_gira uuid)
returns jsonb language plpgsql stable security definer set search_path = public, app as $$
begin
  if not app.can_manage_community() then raise exception 'Acesso negado'; end if;
  return coalesce((select jsonb_object_agg(s.id, jsonb_build_object('pay', s.pay_status, 'proof', s.proof is not null, 'proof_at', s.proof_at, 'paid_at', s.paid_at))
                     from public.community_signups s where s.gira_id = p_gira), '{}'::jsonb);
end $$;

create or replace function app.admin_community_proof(p_id uuid)
returns text language plpgsql stable security definer set search_path = public, app as $$
begin
  if not app.can_manage_community() then raise exception 'Acesso negado'; end if;
  return (select proof from public.community_signups where id = p_id);
end $$;

create or replace function app.admin_community_set_paid(p_id uuid, p_paid boolean)
returns void language plpgsql security definer set search_path = public, app as $$
begin
  if not app.can_manage_community() then raise exception 'Acesso negado'; end if;
  update public.community_signups
     set pay_status = case when p_paid then 'pago' when proof is not null then 'enviado' else 'aguardando' end,
         paid_at = case when p_paid then now() end, paid_by = case when p_paid then auth.uid() end
   where id = p_id and pay_status is not null;
end $$;

create or replace function app.editor_set_gira_community_fee(p_gira uuid, p_fee numeric, p_until timestamptz)
returns void language plpgsql security definer set search_path = public, app as $$
begin
  if not app.can_manage_community() then raise exception 'Acesso negado'; end if;
  if p_fee is not null and (p_fee < 0 or p_fee > 10000) then raise exception 'Valor inválido.'; end if;
  update public.giras set community_fee = nullif(p_fee, 0), community_fee_until = case when coalesce(p_fee, 0) > 0 then p_until end where id = p_gira;
  -- quem já estava inscrito passa a aguardar pagamento (ou volta a ser gratuito)
  if coalesce(p_fee, 0) > 0 then
    update public.community_signups set pay_status = 'aguardando' where gira_id = p_gira and pay_status is null;
  else
    update public.community_signups set pay_status = null where gira_id = p_gira and pay_status <> 'pago';
  end if;
end $$;

-- passou o prazo sem comprovante: libera a vaga e chama o próximo da espera
create or replace function app.community_fee_expire()
returns integer language plpgsql security definer set search_path = public, app as $$
declare r record; v_next uuid; v_n int := 0;
begin
  for r in select s.id, s.gira_id from public.community_signups s join public.giras g on g.id = s.gira_id
            where s.pay_status = 'aguardando' and s.status in ('ok', 'pend')
              and g.community_fee_until is not null and now() > g.community_fee_until and g.starts_at > now() loop
    update public.community_signups set status = 'cancel', canceled_at = now() where id = r.id;
    select id into v_next from public.community_signups where gira_id = r.gira_id and status = 'wait' order by created_at limit 1;
    if v_next is not null then update public.community_signups set status = 'ok', promoted_at = now() where id = v_next; end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

create or replace function public.public_gira_fee(p_gira uuid) returns jsonb language sql stable security invoker set search_path = public, app as $$ select app.public_gira_fee(p_gira) $$;
create or replace function public.public_signup_pay(p_tokens uuid[]) returns jsonb language sql stable security invoker set search_path = public, app as $$ select app.public_signup_pay(p_tokens) $$;
create or replace function public.public_send_proof(p_token uuid, p_data text) returns text language sql security invoker set search_path = public, app as $$ select app.public_send_proof(p_token, p_data) $$;
create or replace function public.admin_community_pay(p_gira uuid) returns jsonb language sql stable security invoker set search_path = public, app as $$ select app.admin_community_pay(p_gira) $$;
create or replace function public.admin_community_proof(p_id uuid) returns text language sql stable security invoker set search_path = public, app as $$ select app.admin_community_proof(p_id) $$;
create or replace function public.admin_community_set_paid(p_id uuid, p_paid boolean) returns void language sql security invoker set search_path = public, app as $$ select app.admin_community_set_paid(p_id, p_paid) $$;
create or replace function public.editor_set_gira_community_fee(p_gira uuid, p_fee numeric, p_until timestamptz) returns void language sql security invoker set search_path = public, app as $$ select app.editor_set_gira_community_fee(p_gira, p_fee, p_until) $$;
grant execute on function app.public_gira_fee(uuid), app.public_signup_pay(uuid[]), app.public_send_proof(uuid, text) to anon, authenticated;
grant execute on function public.public_gira_fee(uuid), public.public_signup_pay(uuid[]), public.public_send_proof(uuid, text) to anon, authenticated;
grant execute on function app.admin_community_pay(uuid), app.admin_community_proof(uuid), app.admin_community_set_paid(uuid, boolean), app.editor_set_gira_community_fee(uuid, numeric, timestamptz) to authenticated;
grant execute on function public.admin_community_pay(uuid), public.admin_community_proof(uuid), public.admin_community_set_paid(uuid, boolean), public.editor_set_gira_community_fee(uuid, numeric, timestamptz) to authenticated;
select cron.schedule('tpbc-comunidade-prazo-pagamento', '15 * * * *', 'select app.community_fee_expire()');
notify pgrst, 'reload schema';

-- Resumo da gira (giras.description): visível para todos (filhos, site e link de inscrição).
-- "O que levar"/guia continuam só para os filhos: deixam de sair na página aberta.
create or replace function app.public_giras(p_gira uuid default null::uuid)
 returns table(id uuid, name text, starts_at timestamp with time zone, activity_type text, art_path text, cover_color text, description text, what_to_bring text, access text, fill_pct integer, is_full boolean, waitlist boolean, opens_at timestamp with time zone)
 language sql stable security definer set search_path to 'public', 'app'
as $function$
  select g.id, g.name, g.starts_at, g.activity_type, nullif(g.art_path, ''), g.cover_color,
         g.description, null::text, g.community_access, f.pct, f.is_full, g.community_waitlist, g.community_opens_at
    from public.giras g cross join lateral app.community_fill(g.id) f
   where coalesce(g.status, 'published') = 'published'
     and g.community_access in ('aberta', 'assist')
     and g.community_slots > 0
     and g.starts_at > now() - interval '6 hours'
     and (g.id = p_gira or (p_gira is null and g.community_public))
   order by g.starts_at
$function$;

create or replace function app.editor_save_gira_info(p_gira_id uuid, p_info jsonb)
 returns uuid language plpgsql security definer set search_path to 'public', 'app'
as $function$
declare
  v_id uuid := p_gira_id;
  v_name text := trim(coalesce(p_info->>'name',''));
  v_starts timestamptz := nullif(p_info->>'starts_at','')::timestamptz;
  v_type text := coalesce(nullif(p_info->>'activity_type',''),'gira');
  v_has_contribution boolean := coalesce((p_info->>'has_contribution')::boolean,false);
  v_amount numeric := case when v_has_contribution then coalesce(nullif(p_info->>'contribution_amount','')::numeric,0) else 0 end;
  v_due date := case when v_has_contribution then nullif(p_info->>'contribution_due_date','')::date else null end;
  v_lines text[] := case when jsonb_typeof(p_info->'entity_lines')='array'
                         then array(select jsonb_array_elements_text(p_info->'entity_lines'))
                         else '{}'::text[] end;
  v_desc text := left(nullif(trim(coalesce(p_info->>'description','')),''), 400);
begin
  if not app.is_gira_manager() then raise exception 'Acesso negado'; end if;
  if v_name = '' then raise exception 'Informe o nome da gira.'; end if;
  if v_starts is null then raise exception 'Informe o dia e o horário da gira.'; end if;
  if v_type not in ('gira','desenvolvimento','interna','festa','evento','quintal','reuniao','outra') then
    raise exception 'Tipo de gira inválido.';
  end if;
  if v_has_contribution and v_amount <= 0 then raise exception 'Informe o valor da contribuição.'; end if;

  if v_id is null then
    insert into public.giras(
      name, starts_at, activity_type, entity_lines, contribution_amount, contribution_due_date,
      what_to_bring, description, notes, art_path, cover_color,
      status, has_activity_shifts, use_task_list, created_by, updated_by)
    values(
      v_name, v_starts, v_type, v_lines, v_amount, v_due,
      nullif(p_info->>'what_to_bring',''), v_desc, nullif(p_info->>'notes',''),
      nullif(p_info->>'art_path',''), nullif(p_info->>'cover_color',''),
      'draft', false, false, auth.uid(), auth.uid())
    returning id into v_id;
  else
    update public.giras
       set name = v_name,
           starts_at = v_starts,
           activity_type = v_type,
           entity_lines = v_lines,
           contribution_amount = v_amount,
           contribution_due_date = v_due,
           what_to_bring = nullif(p_info->>'what_to_bring',''),
           description = case when p_info ? 'description' then v_desc else description end,
           notes = nullif(p_info->>'notes',''),
           art_path = nullif(p_info->>'art_path',''),
           cover_color = nullif(p_info->>'cover_color',''),
           updated_by = auth.uid(),
           updated_at = now()
     where id = v_id;
    if not found then raise exception 'Gira não encontrada.'; end if;
  end if;
  return v_id;
end;
$function$;
notify pgrst, 'reload schema';
