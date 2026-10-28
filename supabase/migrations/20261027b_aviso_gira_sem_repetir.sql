-- "Nova gira publicada" não repete: se a gira já foi avisada (ex.: mudou o horário e publicou de novo),
-- só atualiza o texto de quem ainda não leu; e não avisa quem já respondeu.
-- Aplicado em 27/10/2026, junto com a limpeza do segundo aviso do Festival dos Orixás (marcado como lido;
-- o primeiro aviso ficou com o horário novo, 12h00, para quem ainda não respondeu).
create or replace function app.notify_gira_published(p_gira_id uuid)
returns integer language plpgsql security definer set search_path to 'public', 'app' as $function$
declare v_gira public.giras; v_msg text; v_count integer;
begin
  if not app.is_gira_manager() then raise exception 'Acesso negado'; end if;
  select * into v_gira from public.giras where id = p_gira_id;
  if v_gira.id is null then raise exception 'Gira não encontrada.'; end if;
  if coalesce(v_gira.status, 'published') <> 'published' then raise exception 'Publique a gira antes de notificar.'; end if;
  v_msg := 'Nova gira publicada: "' || v_gira.name || '" — ' ||
           to_char(v_gira.starts_at at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24"h"MI') ||
           '. Abra a agenda para conferir e confirmar sua presença.';
  update public.gira_turn_availability_notifications set message = v_msg
   where gira_id = p_gira_id and read_at is null and message like 'Nova gira publicada:%';
  insert into public.gira_turn_availability_notifications(gira_id, profile_id, message)
  select p_gira_id, p.id, v_msg
    from public.profiles p
   where p.is_active = true
     and not exists (select 1 from public.gira_turn_availability_notifications n
                      where n.gira_id = p_gira_id and n.profile_id = p.id and n.message like 'Nova gira publicada:%')
     and not exists (select 1 from public.gira_responses r where r.gira_id = p_gira_id and r.profile_id = p.id and r.status is not null);
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;
