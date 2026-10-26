-- Insígnia "Autorretrato" (🎨): quem criar e salvar o avatar no ateliê do Meu espaço.
-- Aparece para todos a partir de 28/10/2026 0h (estreia do Meu espaço novo); antes disso só para quem já salvou na prévia.
create or replace function app.badge_state(p uuid)
 returns table(badge text, kind text, value integer, goal integer, thresholds integer[], title text)
 language sql stable security definer set search_path to 'public', 'app'
as $function$
  select 'antena', 'unico',
         (select least(count(*), 1) from public.push_subscriptions s where s.profile_id = p)::int, 1, null::int[], null::text
  union all
  select 'regras', 'unico',
         (select count(*) from public.house_contents c
           where c.content_type = 'rule' and not c.is_draft
             and exists (select 1 from public.house_content_reads r where r.content_id = c.id and r.profile_id = p
                          and (not c.is_required or r.confirmed_at is not null)))::int,
         (select count(*) from public.house_contents c where c.content_type = 'rule' and not c.is_draft)::int, null, null
  union all
  select 'cadastro', 'unico',
         (select (case when nullif(trim(coalesce(orixa_symbol, '')), '') is not null then 1 else 0 end)
               + (case when nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '') is not null then 1 else 0 end)
               + (case when date_of_birth is not null then 1 else 0 end)
            from public.profiles where id = p)::int, 3, null, null
  union all
  select 'avatar', 'unico', (case when pr.avatar is not null then 1 else 0 end), 1, null, null
    from public.profiles pr where pr.id = p and (pr.avatar is not null or now() >= timestamptz '2026-10-28 00:00-03')
  union all
  select 'palavra', 'niveis',
         (select count(*) from public.house_content_reads r join public.house_contents c on c.id = r.content_id
           where r.profile_id = p and r.confirmed_at is not null and c.is_required and not c.is_draft)::int,
         (select count(*) from public.house_contents c where c.is_required and not c.is_draft)::int, array[1, 3, 5, 8, 12, 20], null
  union all
  select 'sabedoria', 'niveis',
         (select count(distinct r.content_id) from public.house_content_reads r
            join public.house_contents c on c.id = r.content_id
           where r.profile_id = p and c.content_type = 'content' and not c.is_draft)::int,
         (select count(*) from public.house_contents c where c.content_type = 'content' and not c.is_draft)::int, array[1, 3, 6, 10, 15, 25], null
  union all
  select 'responde', 'niveis',
         (select count(*) from public.gira_responses x join public.giras g on g.id = x.gira_id
           where x.profile_id = p and x.status is not null and coalesce(g.status, 'published') = 'published')::int,
         null, array[1, 3, 6, 10, 20, 35], null
  union all
  select 'mao', 'niveis',
         ((select count(distinct t.gira_id) from public.gira_turn_availability a join public.gira_turns t on t.id = a.gira_turn_id
            where a.profile_id = p)
        + (select count(*) from public.task_status s where s.completed_by = p and s.done))::int,
         null, array[1, 3, 6, 10, 20, 35], null
  union all
  select 'axe', 'niveis',
         (select count(*) from public.community_post_reactions r join public.community_posts po on po.id = r.post_id
           where r.profile_id = p and po.author_id <> p)::int,
         null, array[1, 5, 15, 30, 60, 100], null
  union all
  select 'voz', 'niveis',
         ((select count(*) from public.community_posts po where po.author_id = p)
        + (select count(*) from public.community_post_comments c where c.author_id = p))::int,
         null, array[1, 3, 8, 15, 30, 50], null
  union all
  select 'emi:' || e.slug, 'colecao',
         (case when exists (select 1 from public.newsletter_reads r where r.edition_id = e.id and r.profile_id = p and r.finished_at is not null) then 1 else 0 end),
         1, null, e.title
    from public.newsletter_editions e where e.status = 'published'
  union all
  select 'evento:' || g.id, 'evento',
         (case when g.starts_at <= now() and exists (select 1 from public.gira_responses x
                where x.gira_id = g.id and x.profile_id = p and x.status = 'going') then 1 else 0 end),
         1, null, g.name
    from public.giras g where g.exclusive_badge and coalesce(g.status, 'published') = 'published'
  union all
  -- selo comemorativo: todos os filhos cadastrados até a festa (eleições 2026)
  select 'democracia', 'especial', 1, 1, null, 'Democracia'
   where exists (select 1 from public.profiles pr where pr.id = p and pr.created_at < timestamptz '2026-10-28 00:00-03')
$function$;

create or replace function app.badge_label(p_badge text)
 returns text language sql stable set search_path to 'public', 'app'
as $function$
  select case
    when p_badge = 'antena'    then 'Antena ligada'
    when p_badge = 'regras'    then 'Guardião das regras'
    when p_badge = 'palavra'   then 'Palavra dada'
    when p_badge = 'cadastro'  then 'Cadastro completo'
    when p_badge = 'avatar'    then 'Autorretrato 🎨'
    when p_badge = 'sabedoria' then 'Sabedoria da casa'
    when p_badge = 'responde'  then 'Responde presente'
    when p_badge = 'mao'       then 'Mão na massa'
    when p_badge = 'axe'       then 'Axé que circula'
    when p_badge = 'voz'       then 'Voz da comunidade'
    when p_badge = 'democracia' then 'Democracia ⭐'
    when p_badge like 'emi:%'  then 'Ẹ̀mí Ìlú ' || substr(p_badge, 5)
    when p_badge like 'evento:%' then coalesce((select 'Selo ' || g.name from public.giras g where g.id::text = substr(p_badge, 8)), 'Selo de evento')
    else p_badge end
$function$;

-- ganha a insígnia na hora em que salva o avatar
create or replace function app.save_my_customization(p jsonb)
returns void language plpgsql security definer set search_path = public, app as $$
declare v_selos int; v_festa boolean; v_av jsonb := p->'avatar'; v_capa text := coalesce(nullif(p->>'capa',''),'casa');
  v_rosto text; v_frase text := nullif(trim(coalesce(p->>'frase','')),''); v_vit text[]; v_ano int := nullif(p->>'na_casa_desde','')::int;
  v_mode text := coalesce(nullif(p->>'avatar_mode',''),'orixa'); v_cor text := nullif(p->>'cor','');
begin
  if auth.uid() is null then raise exception 'Entre no app.'; end if;
  select (x->>'selos')::int, (x->>'festa')::boolean into v_selos, v_festa from app.my_customization_state() x;
  if v_mode not in ('orixa','avatar') then raise exception 'Opção de imagem inválida.'; end if;
  if v_av is not null and length(v_av::text) > 2000 then raise exception 'Avatar inválido.'; end if;
  v_rosto := coalesce(v_av->>'rosto','sorriso');
  if (v_rosto = 'gargalhada' and v_selos < 10) or (v_rosto = 'sereno' and v_selos < 15)
     or (v_rosto = 'piscada' and v_selos < 20) or (v_rosto = 'pensativo' and v_selos < 25) then
    raise exception 'Essa expressão ainda não foi liberada para você.'; end if;
  if v_av->>'oculos' = 'sol' and not v_festa then raise exception 'Os óculos de sol liberam para quem confirmar presença na Festa da Abundância.'; end if;
  if v_capa not in ('casa','ouro','mar','mata','tecido','barro') then raise exception 'Capa inválida.'; end if;
  if (v_capa = 'ouro' and v_selos < 5) or (v_capa = 'mar' and v_selos < 10) or (v_capa = 'mata' and v_selos < 15)
     or (v_capa = 'tecido' and v_selos < 20) or (v_capa = 'barro' and v_selos < 25) then
    raise exception 'Essa capa ainda não foi liberada para você.'; end if;
  if v_cor is not null and v_cor !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Cor inválida.'; end if;
  if v_frase is not null and char_length(v_frase) > 90 then raise exception 'A frase pode ter até 90 letras.'; end if;
  select coalesce(array_agg(x), '{}') into v_vit from (select jsonb_array_elements_text(coalesce(p->'vitrine','[]'::jsonb)) x limit 3) t
   where exists (select 1 from public.badge_awards b where b.profile_id = auth.uid() and b.badge = t.x);
  if v_ano is not null and (v_ano < 1950 or v_ano > extract(year from now())::int) then raise exception 'Ano inválido.'; end if;
  update public.profiles set avatar_mode = v_mode, avatar = coalesce(v_av, avatar), capa = v_capa, cor = v_cor,
         frase = v_frase, vitrine = v_vit, na_casa_desde = v_ano, updated_at = now()
   where id = auth.uid();
  perform app.sync_badges(auth.uid(), false);
end $$;
notify pgrst, 'reload schema';

-- aviso de estreia para todos os filhos ativos: quarta 28/10/2026 às 9h (12h UTC)
create or replace function app.push_meu_espaco_2810()
returns integer language plpgsql security definer set search_path to 'public','app' as $function$
declare v_n int := 0; r record;
begin
  if (now() at time zone 'America/Sao_Paulo')::date <> date '2026-10-28' then return 0; end if;
  for r in select id from public.profiles where is_active loop
    perform app.push_enqueue(r.id, 'Personalize do seu jeito ✨',
      'Crie seu avatar, escolha capa, cor e frase, e mostre suas insígnias. Quem criar o avatar ganha a insígnia Autorretrato 🎨',
      '?tela=me', 'meu-espaco:2026-10-28');
    v_n := v_n + 1;
  end loop;
  return v_n;
end $function$;
select cron.schedule('tpbc-meu-espaco-2810', '0 12 28 10 *', 'select app.push_meu_espaco_2810()');
