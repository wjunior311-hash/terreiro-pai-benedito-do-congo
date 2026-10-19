-- Resumo administrativo por gira (Gestão → Giras → Resumo)
create or replace function app.admin_resumo_giras()
returns jsonb language plpgsql stable security definer set search_path = public, app as $$
begin
  if not (app.is_admin() or app.is_master() or app.has_permission('giras.manage')) then raise exception 'Acesso negado'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'starts_at', g.starts_at, 'status', g.status) order by g.starts_at)
    from public.giras g where g.starts_at > now() - interval '2 days' and g.status::text <> 'draft'), '[]'::jsonb);
end $$;

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
        'items', (select count(*) from public.gira_bring_claims bc join public.gira_bring_items bi on bi.id = bc.item_id where bi.gira_id = p_gira and bi.active and bc.profile_id = p.id and bc.active),
        'turns', coalesce((select jsonb_agg(t.label order by t.sort_order) from public.gira_turn_availability a join public.gira_turns t on t.id = a.gira_turn_id where t.gira_id = p_gira and t.enabled and a.profile_id = p.id), '[]'::jsonb),
        'leu', exists(select 1 from public.gira_info_reads ir where ir.gira_id = p_gira and ir.profile_id = p.id and ir.read_at >= coalesce(v_g.info_ack_at, ir.read_at))
      ) x
      from public.profiles p
      left join public.gira_responses r on r.gira_id = p_gira and r.profile_id = p.id
      where p.is_active) s), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'category', i.category, 'name', i.name, 'portion', i.portion, 'slots', i.slots,
        'who', coalesce((select jsonb_agg(p.name order by p.name) from public.gira_bring_claims bc join public.profiles p on p.id = bc.profile_id where bc.item_id = i.id and bc.active), '[]'::jsonb))
        order by i.sort_order, i.name) from public.gira_bring_items i where i.gira_id = p_gira and i.active), '[]'::jsonb),
    'turns', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'label', t.label, 'shift_date', t.shift_date, 'starts_at', t.starts_at, 'ends_at', t.ends_at,
        'group_name', t.group_name, 'capacity', t.capacity,
        'who', coalesce((select jsonb_agg(jsonb_build_object('name', p.name, 'is_pai', coalesce(p.is_pai_de_santo, false)) order by p.name) from public.gira_turn_availability a join public.profiles p on p.id = a.profile_id where a.gira_turn_id = t.id), '[]'::jsonb))
        order by t.sort_order) from public.gira_turns t where t.gira_id = p_gira and t.enabled), '[]'::jsonb)
  ) into v_out;
  return v_out;
end $$;

create or replace function public.admin_resumo_giras() returns jsonb language sql security invoker set search_path = public, app as $$ select app.admin_resumo_giras() $$;
create or replace function public.admin_gira_resumo(p_gira uuid) returns jsonb language sql security invoker set search_path = public, app as $$ select app.admin_gira_resumo(p_gira) $$;
grant execute on function app.admin_resumo_giras() to authenticated;
grant execute on function app.admin_gira_resumo(uuid) to authenticated;
grant execute on function public.admin_resumo_giras() to authenticated;
grant execute on function public.admin_gira_resumo(uuid) to authenticated;
notify pgrst, 'reload schema';
