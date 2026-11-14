-- Distribuição automática das tarefas de uma gira com turnos.
-- Regras: "Firmeza da casa" vai para os Pais de santo; padês/quartinhas só para quem está na casa há 2+ anos;
-- tarefas da categoria Cozinha vão primeiro para o grupo Cozinha (sem ninguém do grupo, vai para outra pessoa);
-- o resto é dividido por igual (quem tem menos tarefas pega a próxima; grupo igual à categoria tem preferência);
-- todo mundo do turno fica com pelo menos uma tarefa. Atribuições já feitas são mantidas (rodar de novo só completa).
create or replace function app.distribuir_tarefas_turnos(p_gira uuid)
returns jsonb language plpgsql security definer set search_path = public, app as $$
declare v_turn record; v_task record; v_p uuid; v_tid uuid; v_total int := 0; v_sem text[] := '{}'; v_ano int := extract(year from now())::int;
begin
  if auth.uid() is not null and not app.is_gira_manager() then raise exception 'Acesso negado'; end if;

  -- Firmeza da casa: Pais de santo
  insert into public.task_assignments(task_id, profile_id, assignment_mode)
  select t.id, p.id, 'auto' from public.tasks t cross join public.profiles p
   where t.gira_id = p_gira and t.name ilike '%firmeza%' and p.is_active and p.is_pai_de_santo
  on conflict do nothing;

  create temp table if not exists _carga(profile_id uuid primary key, n int, grupo text, desde int) on commit drop;
  for v_turn in select id, label from public.gira_turns where gira_id = p_gira and enabled order by sort_order loop
    truncate _carga;
    insert into _carga
    select p.id, (select count(*) from public.task_assignments a join public.tasks t on t.id = a.task_id where a.profile_id = p.id and t.gira_turn_id = v_turn.id),
           g.name, p.na_casa_desde
      from public.gira_turn_availability av join public.profiles p on p.id = av.profile_id left join public.groups g on g.id = p.group_id
     where av.gira_turn_id = v_turn.id and p.is_active and not coalesce(p.is_pai_de_santo, false);

    -- 1ª volta: cada tarefa sem ninguém ganha uma pessoa (restritas primeiro, depois cozinha, depois o resto)
    for v_task in
      select t.id, t.name, c.name cat,
             (t.name ilike '%padê%' or t.name ilike '%pade%' or t.name ilike '%quartinha%') restrita
        from public.tasks t left join public.task_categories c on c.id = t.category_id
       where t.gira_turn_id = v_turn.id and t.name not ilike '%firmeza%'
         and not exists (select 1 from public.task_assignments a where a.task_id = t.id)
       order by (t.name ilike '%padê%' or t.name ilike '%pade%' or t.name ilike '%quartinha%') desc, (c.name = 'Cozinha') desc nulls last, t.sort_order
    loop
      v_p := null;
      select k.profile_id into v_p from _carga k
       where (not v_task.restrita or k.desde <= v_ano - 2)
       order by k.n, (k.grupo is not distinct from v_task.cat) desc, (k.grupo = 'Cozinha' and v_task.cat is distinct from 'Cozinha') asc nulls first, random() limit 1;
      if v_p is null then v_sem := v_sem || (v_task.name || ' (' || v_turn.label || ')'); continue; end if;
      insert into public.task_assignments(task_id, profile_id, assignment_mode) values (v_task.id, v_p, 'auto') on conflict do nothing;
      update _carga set n = n + 1 where profile_id = v_p; v_total := v_total + 1; v_p := null;
    end loop;

    -- 2ª volta: quem ficou sem tarefa reforça a tarefa com menos gente (cozinha → tarefas de cozinha)
    for v_p in select profile_id from _carga where n = 0 order by random() loop
      v_tid := null;
      select t.id into v_tid from public.tasks t left join public.task_categories c on c.id = t.category_id
        join _carga k on k.profile_id = v_p
       where t.gira_turn_id = v_turn.id and t.name not ilike '%firmeza%'
         and (not (t.name ilike '%padê%' or t.name ilike '%pade%' or t.name ilike '%quartinha%') or k.desde <= v_ano - 2)
       order by (select count(*) from public.task_assignments a where a.task_id = t.id), (c.name is not distinct from k.grupo and c.name is not null) desc, random() limit 1;
      if v_tid is null then continue; end if;
      insert into public.task_assignments(task_id, profile_id, assignment_mode) values (v_tid, v_p, 'auto') on conflict do nothing;
      update _carga set n = n + 1 where profile_id = v_p; v_total := v_total + 1;
    end loop;
  end loop;
  return jsonb_build_object('atribuicoes', v_total, 'sem_responsavel', to_jsonb(v_sem));
end $$;
create or replace function public.distribuir_tarefas_turnos(p_gira uuid) returns jsonb language sql security invoker set search_path = public, app as $$ select app.distribuir_tarefas_turnos(p_gira) $$;
grant execute on function app.distribuir_tarefas_turnos(uuid), public.distribuir_tarefas_turnos(uuid) to authenticated;
notify pgrst, 'reload schema';

-- Festa de Baianos (14/11): tarefas novas (lavanderia; almoço e preparos gerais na cozinha; Firmeza da casa),
-- "Colocar café e água" virou "Preparo de café, chá e encher galão de água", categoria Cozinha nos preparos,
-- e subtarefas em todas as tarefas (feito direto no banco).

-- Ajustes (10/11 15h):
-- gira_turns.tarefas_gerais: turno sem responsável nominal (tarefas para todos do turno); a distribuição pula esses turnos.
alter table public.gira_turns add column if not exists tarefas_gerais boolean not null default false;
-- distribuir_tarefas_turnos: padês/quartinhas sem ninguém com 2+ anos no turno vão para os Pais de santo.
-- Festa de Baianos: sexta 18h com tarefas gerais; novas tarefas (13h: Apoio na chegada e porta, Conferir descartáveis,
-- papel higiênico e lixeiras, Apoio durante a gira; 20h30: Retirar decoração, Lavar alguidares) com subtarefas;
-- cron único 'baianos-distribuir-1211' em 12/11 22h05 (01h05 UTC de 13/11): distribui e avisa por push, depois se desliga.

-- 13/11: gira_turn_task_status passa a comparar o dia pelo horário de Brasília (antes usava current_date em UTC,
-- e depois das 21h travava as tarefas do dia) e libera também o dia seguinte. Ajuste aplicado sobre a definição atual.
