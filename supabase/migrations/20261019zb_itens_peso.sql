-- Itens que valem por mais de um (torta, bolo, patê = 2) + mudança da lista da Cachoeira
alter table public.gira_bring_items add column if not exists weight int not null default 1;

create or replace function app.gira_bring_list(p_gira uuid)
 returns jsonb language plpgsql stable security definer set search_path to 'public', 'app' as $function$
begin
  if auth.uid() is null or not app.is_active_member() then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', i.id, 'category', i.category, 'name', i.name, 'portion', i.portion, 'slots', i.slots, 'weight', i.weight,
      'taken', (select count(*) from public.gira_bring_claims c where c.item_id = i.id and c.active),
      'mine', exists(select 1 from public.gira_bring_claims c where c.item_id = i.id and c.active and c.profile_id = auth.uid()),
      'who', (select coalesce(jsonb_agg(split_part(trim(p.name), ' ', 1) order by c.updated_at), '[]'::jsonb)
                from public.gira_bring_claims c join public.profiles p on p.id = c.profile_id
               where c.item_id = i.id and c.active and c.profile_id <> auth.uid()))
      order by i.sort_order, i.name)
    from public.gira_bring_items i where i.gira_id = p_gira and i.active), '[]'::jsonb);
end $function$;

create or replace function app.gira_bring_toggle(p_item uuid, p_take boolean)
 returns void language plpgsql security definer set search_path to 'public', 'app' as $function$
declare v_i public.gira_bring_items; v_n int; v_max int; v_meus int;
begin
  if auth.uid() is null or not app.is_active_member() then raise exception 'Entre no app.'; end if;
  select * into v_i from public.gira_bring_items where id = p_item and active;
  if v_i.id is null then raise exception 'Item não encontrado.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_i.gira_id::text, 3));
  if p_take then
    if not exists(select 1 from public.gira_responses where gira_id = v_i.gira_id and profile_id = auth.uid() and status = 'going') then
      raise exception 'Confirme sua presença na gira antes de escolher o que levar.';
    end if;
    select bring_per_person into v_max from public.giras where id = v_i.gira_id;
    select coalesce(sum(x.weight), 0) into v_meus from public.gira_bring_claims c join public.gira_bring_items x on x.id = c.item_id
     where x.gira_id = v_i.gira_id and x.active and c.profile_id = auth.uid() and c.active and c.item_id <> p_item;
    if v_max is not null and v_meus >= v_max then
      raise exception 'Você já escolheu seus % itens. Para trocar, desmarque um deles primeiro.', v_max;
    end if;
    select count(*) into v_n from public.gira_bring_claims where item_id = p_item and active and profile_id <> auth.uid();
    if v_n >= v_i.slots then raise exception 'Esse item já está completo. Escolha outro.'; end if;
    insert into public.gira_bring_claims(item_id, profile_id, active, updated_at) values (p_item, auth.uid(), true, now())
    on conflict (item_id, profile_id) do update set active = true, updated_at = now();
  else
    update public.gira_bring_claims set active = false, updated_at = now() where item_id = p_item and profile_id = auth.uid();
  end if;
end $function$;

create or replace function app.my_gira_pending()
 returns jsonb language sql stable security definer set search_path to 'public', 'app' as $function$
  select coalesce(jsonb_agg(x order by x->>'starts_at'), '[]'::jsonb) from (
    select jsonb_build_object('gira_id', g.id, 'name', g.name, 'starts_at', g.starts_at,
      'needs_read', g.info_ack_at is not null and not exists(select 1 from public.gira_info_reads r where r.gira_id = g.id and r.profile_id = auth.uid() and r.read_at >= g.info_ack_at),
      'max', g.bring_per_person,
      'mine', (select coalesce(sum(i.weight), 0) from public.gira_bring_claims c join public.gira_bring_items i on i.id = c.item_id where i.gira_id = g.id and i.active and c.profile_id = auth.uid() and c.active),
      'has_items', exists(select 1 from public.gira_bring_items i where i.gira_id = g.id and i.active)) as x
    from public.giras g
    join public.gira_responses resp on resp.gira_id = g.id and resp.profile_id = auth.uid() and resp.status = 'going'
    where coalesce(g.status, 'published') = 'published' and g.starts_at > now()
  ) t
  where (x->>'needs_read')::boolean or ((x->>'has_items')::boolean and coalesce((x->>'max')::int, 1) > (x->>'mine')::int)
$function$;

create or replace function app.admin_gira_resumo(p_gira uuid)
returns jsonb language plpgsql stable security definer set search_path = public, app as $$
declare v_g public.giras; v_money boolean; v_docs boolean; v_out jsonb;
begin
  if not (app.is_admin() or app.is_master() or app.has_permission('giras.manage')) then raise exception 'Acesso negado'; end if;
  select * into v_g from public.giras where id = p_gira;
  if v_g.id is null then raise exception 'Gira não encontrada'; end if;
  v_money := app.is_admin() or app.is_master() or app.has_permission('finance.view');
  v_docs := app.is_admin() or app.is_master();
  select jsonb_build_object(
    'gira', jsonb_build_object('id', v_g.id, 'name', v_g.name, 'starts_at', v_g.starts_at, 'responses_until', v_g.responses_until,
       'contribution_amount', case when v_money then v_g.contribution_amount end, 'has_charge', coalesce(v_g.contribution_amount, 0) > 0,
       'collect_docs', coalesce(v_g.collect_docs, false), 'bring_per_person', coalesce(v_g.bring_per_person, 0), 'needs_ack', v_g.info_ack_at is not null),
    'can_money', v_money, 'can_docs', v_docs,
    'people', coalesce((select jsonb_agg(x order by x->>'name') from (
      select jsonb_build_object(
        'id', p.id, 'name', p.name, 'phone', p.phone, 'orixa_symbol', p.orixa_symbol, 'is_pai', coalesce(p.is_pai_de_santo, false),
        'status', r.status,
        'pay', (select case when c.status = 'paid' then 'paid'
                            when c.status = 'unpaid' and exists(select 1 from public.payment_proofs pp where pp.extra_charge_id = c.id and pp.status = 'pending') then 'review'
                            when c.status = 'unpaid' then 'open' end
                  from public.extra_charges c where c.gira_id = p_gira and c.profile_id = p.id and c.status <> 'not_applicable' order by c.created_at desc limit 1),
        'amount', case when v_money then (select c.amount from public.extra_charges c where c.gira_id = p_gira and c.profile_id = p.id and c.status <> 'not_applicable' order by c.created_at desc limit 1) end,
        'doc', exists(select 1 from public.gira_access_docs d where d.gira_id = p_gira and d.profile_id = p.id and d.full_name is not null),
        'items', (select coalesce(sum(bi.weight),0) from public.gira_bring_claims bc join public.gira_bring_items bi on bi.id = bc.item_id where bi.gira_id = p_gira and bi.active and bc.profile_id = p.id and bc.active),
        'turns', coalesce((select jsonb_agg(t.label order by t.sort_order) from public.gira_turn_availability a join public.gira_turns t on t.id = a.gira_turn_id where t.gira_id = p_gira and t.enabled and a.profile_id = p.id), '[]'::jsonb),
        'leu', exists(select 1 from public.gira_info_reads ir where ir.gira_id = p_gira and ir.profile_id = p.id and ir.read_at >= coalesce(v_g.info_ack_at, ir.read_at))
      ) x
      from public.profiles p
      left join public.gira_responses r on r.gira_id = p_gira and r.profile_id = p.id
      where p.is_active) s), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'category', i.category, 'name', i.name, 'portion', i.portion, 'slots', i.slots, 'weight', i.weight,
        'who', coalesce((select jsonb_agg(p.name order by p.name) from public.gira_bring_claims bc join public.profiles p on p.id = bc.profile_id where bc.item_id = i.id and bc.active), '[]'::jsonb))
        order by i.sort_order, i.name) from public.gira_bring_items i where i.gira_id = p_gira and i.active), '[]'::jsonb),
    'turns', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'label', t.label, 'shift_date', t.shift_date, 'starts_at', t.starts_at, 'ends_at', t.ends_at,
        'group_name', t.group_name, 'capacity', t.capacity,
        'who', coalesce((select jsonb_agg(jsonb_build_object('name', p.name, 'is_pai', coalesce(p.is_pai_de_santo, false)) order by p.name) from public.gira_turn_availability a join public.profiles p on p.id = a.profile_id where a.gira_turn_id = t.id), '[]'::jsonb))
        order by t.sort_order) from public.gira_turns t where t.gira_id = p_gira and t.enabled), '[]'::jsonb)
  ) into v_out;
  return v_out;
end $$;

notify pgrst, 'reload schema';
