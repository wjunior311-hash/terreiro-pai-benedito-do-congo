-- =====================================================================
-- 2026-10-07 (g) — Limpeza de restos antigos do banco (SEGURA)
--
-- O que faz:
--   * Remove da "porta de entrada" do app (schema public) 40 funções de versões
--     antigas que o app atual NÃO usa mais (listas de tarefas antigas, sorteio de
--     tarefas, criação de gira antiga etc.).
--   * NÃO apaga nenhuma tabela e NÃO apaga nenhum dado.
--   * NÃO mexe nas funções internas (schema app): só tira o acesso direto antigo.
--   * Se alguma função ainda for chamada por outra parte do banco, ela é MANTIDA.
--   * No fim mostra uma tabela com o que foi removido, o que foi mantido e
--     quantas linhas têm as tabelas antigas (só para conferência).
--
-- Rode DEPOIS de publicar o app novo. Pode rodar mais de uma vez.
-- =====================================================================

create temp table if not exists _limpeza (acao text, item text, detalhe text);
truncate _limpeza;

do $$
declare r record; v_refs int;
begin
  for r in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = any (array[
    'admin_assign_task',
    'admin_create_house_content',
    'admin_delete_task',
    'admin_remove_task_assignment',
    'admin_set_profile',
    'admin_update_profile',
    'create_gira',
    'draw_gira_tasks',
    'editor_add_task_list_item',
    'editor_apply_task_list',
    'editor_assign_task',
    'editor_clone_template_to_gira',
    'editor_create_house_content',
    'editor_create_task',
    'editor_create_task_library',
    'editor_create_task_list',
    'editor_delete_task_library',
    'editor_delete_task_list_period',
    'editor_get_task_list',
    'editor_get_task_list_full',
    'editor_get_task_list_periods',
    'editor_list_task_library',
    'editor_list_task_library_full',
    'editor_list_task_templates',
    'editor_remove_task_list_item',
    'editor_save_gira_agenda_v2',
    'editor_save_task_library',
    'editor_save_task_list_as_template',
    'editor_set_gira_task_usage',
    'editor_update_house_content',
    'editor_update_task_library',
    'editor_update_task_list_item',
    'editor_update_task_list_period',
    'editor_upsert_task_list_period',
    'gira_availability_summary',
    'leader_choose_gira_task',
    'set_gira_availability',
    'set_task_status',
    'update_gira',
    'update_task'
     ])
  loop
    -- alguma outra função do banco chama esta pelo nome "public.x(" ? então mantém
    select count(*) into v_refs
      from pg_proc q join pg_namespace qn on qn.oid = q.pronamespace
     where qn.nspname in ('public', 'app') and q.oid <> r.oid and q.proname <> r.proname
       and q.prosrc ~* ('public\.' || r.proname || '\s*\(');
    -- algum gatilho usa esta função? então mantém
    if v_refs = 0 and not exists (select 1 from pg_trigger t where t.tgfoid = r.oid) then
      begin
        execute format('drop function public.%I(%s)', r.proname, r.args);
        insert into _limpeza values ('removida', 'public.' || r.proname || '(' || r.args || ')', 'versão antiga, sem uso');
      exception when others then
        insert into _limpeza values ('mantida', 'public.' || r.proname || '(' || r.args || ')', sqlerrm);
      end;
    else
      insert into _limpeza values ('mantida', 'public.' || r.proname || '(' || r.args || ')', 'ainda referenciada no banco');
    end if;
  end loop;
end $$;

-- tamanho das tabelas antigas (só informativo — nada é apagado)
do $$
declare t text; v bigint;
begin
  foreach t in array array['gira_availability','task_assignments','task_categories','task_library',
                           'task_library_subtasks','task_list_items','task_list_periods','task_lists','admin_functions']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('select count(*) from public.%I', t) into v;
      insert into _limpeza values ('tabela antiga (mantida)', 'public.' || t, v || ' linha(s)');
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';

select acao, item, detalhe from _limpeza order by acao desc, item;
