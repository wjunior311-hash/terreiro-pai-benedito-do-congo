-- =====================================================================
-- 2026-10-09 (i) — Conteúdos: rascunho (só a gestão vê) e formato em abas
-- =====================================================================
alter table public.house_contents add column if not exists is_draft boolean not null default false;
alter table public.house_contents add column if not exists layout text not null default 'normal';
do $$ begin
  alter table public.house_contents add constraint house_contents_layout_chk check (layout in ('normal', 'abas'));
exception when duplicate_object then null; end $$;

-- membros não veem rascunho
alter policy house_contents_select_active on public.house_contents
  using (app.is_active_member() and (not is_draft or app.can_manage_house_content()));

-- salvar conteúdo: agora também rascunho e formato
create or replace function app.editor_save_house_content(p_id uuid, p_data jsonb)
 returns uuid language plpgsql security definer set search_path to 'public', 'app'
as $function$
declare
  v_id uuid := p_id;
  v_type text := coalesce(nullif(p_data->>'content_type',''), 'content');
  v_title text := trim(coalesce(p_data->>'title',''));
  v_layout text := coalesce(nullif(p_data->>'layout',''), 'normal');
  v_tags text[] := case when jsonb_typeof(p_data->'tags')='array'
                        then array(select jsonb_array_elements_text(p_data->'tags')) else '{}'::text[] end;
begin
  if not app.can_manage_house_content() then raise exception 'Acesso negado'; end if;
  if v_title = '' then raise exception 'Informe o título.'; end if;
  if v_type not in ('content','rule') then raise exception 'Tipo de conteúdo inválido.'; end if;
  if v_layout not in ('normal','abas') then v_layout := 'normal'; end if;
  if v_id is null then
    insert into public.house_contents(title, body, content_type, tags, featured, sort_order,
           summary, cover_url, cover_color, is_required, is_draft, layout, created_by, updated_by)
    values (v_title, coalesce(p_data->>'body',''), v_type, v_tags,
            coalesce((p_data->>'featured')::boolean,false), coalesce((p_data->>'sort_order')::int,0),
            nullif(trim(coalesce(p_data->>'summary','')),''), nullif(p_data->>'cover_url',''),
            nullif(p_data->>'cover_color',''), coalesce((p_data->>'is_required')::boolean,false),
            coalesce((p_data->>'is_draft')::boolean,false), v_layout,
            auth.uid(), auth.uid())
    returning id into v_id;
  else
    update public.house_contents
       set title = v_title,
           body = coalesce(p_data->>'body',''),
           content_type = v_type,
           tags = v_tags,
           featured = coalesce((p_data->>'featured')::boolean,false),
           summary = nullif(trim(coalesce(p_data->>'summary','')),''),
           cover_url = nullif(p_data->>'cover_url',''),
           cover_color = nullif(p_data->>'cover_color',''),
           is_required = coalesce((p_data->>'is_required')::boolean,false),
           is_draft = case when p_data ? 'is_draft' then (p_data->>'is_draft')::boolean else is_draft end,
           layout = case when p_data ? 'layout' then v_layout else layout end,
           updated_by = auth.uid(),
           updated_at = now()
     where id = v_id;
    if not found then raise exception 'Conteúdo não encontrado.'; end if;
  end if;
  return v_id;
end;
$function$;

-- aviso de leitura obrigatória: não dispara em rascunho; dispara quando o rascunho é publicado
create or replace function app.push_from_required_content() returns trigger
language plpgsql security definer set search_path = public, app as $$
declare r record;
begin
  if coalesce(new.is_required, false) and not coalesce(new.is_draft, false)
     and (tg_op = 'INSERT' or not coalesce(old.is_required, false) or coalesce(old.is_draft, false)
          or new.reminded_at is distinct from old.reminded_at) then
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

-- conteúdo "Quem passou pela nossa gira" entra como RASCUNHO, em abas
-- (só a gestão vê até alguém desmarcar "Rascunho" e salvar)
insert into public.house_contents(title, summary, body, content_type, tags, featured, sort_order,
       cover_color, is_required, is_draft, layout, created_by, updated_by)
select 'Quem passou pela nossa gira',
       'Boiadeiros, Caboclos e Malandros: quem são, como trabalham e o que podem despertar em quem está se desenvolvendo.',
       $corpo$<p>Na nossa última gira de desenvolvimento, três linhas abriram caminho no salão: <b>Boiadeiros, Caboclos e Malandros</b>. Para quem está começando, é natural sair com perguntas: <i>quem eram? Por que senti aquilo? Era comigo?</i></p><p>Este texto não é manual nem regra. É um ponto de partida para você entender quem chegou e reconhecer, com calma, o que aconteceu em você. Toque nos botões abaixo para passar de uma linha para outra.</p><h2>Caboclos e Caboclas</h2><h3>A força da mata</h3><p>Os Caboclos são a nossa ancestralidade indígena. São os donos da terra antes de tudo, conhecedores das folhas, da caça, do rio e do silêncio da mata. Chegam para <b>curar, orientar e firmar</b>.</p><p>A energia costuma ser de altivez e firmeza: corpo ereto, peito aberto, um olhar que parece enxergar longe. Trabalham muito com as ervas, com o sopro e com a palavra direta. Caboclo não enrola: fala o que precisa ser dito.</p><blockquote><b>No desenvolvimento</b>, é comum sentir o corpo "crescer", a respiração ficar mais funda, uma vontade de se aprumar. Alguns médiuns sentem calor no peito, outros um chamado para a mata. Tudo isso é jeito de se aproximar.</blockquote><h2>Boiadeiros e Boiadeiras</h2><h3>Os que conduzem</h3><p>Os Boiadeiros vêm das beiras de rio e das estradas de terra. São <b>ribeirinhos</b>, gente que conhece as águas, as margens e a travessia, que sabe reunir o que está espalhado e conduzir para o caminho certo.</p><p>São trabalhadores, de muita força e pouca cerimônia. Chegam para <b>limpar, cortar demandas e organizar</b> o que está bagunçado na vida da gente.</p><blockquote><b>No desenvolvimento</b>, a energia costuma vir em movimento: vontade de girar, de bater os pés no chão, de laçar. O corpo pode ficar mais pesado e mais firme ao mesmo tempo. Às vezes vem um aperto que se solta de uma vez.</blockquote><h2>Malandros e Malandras</h2><h3>A sabedoria da rua</h3><p>Os Malandros carregam a sabedoria de quem aprendeu a viver na rua, a se virar com pouco e a enxergar o que os outros não veem. Malandragem, aqui, <b>não é malícia nem vício</b>. É jogo de cintura, inteligência e a ginga de quem sobrevive sem perder a elegância.</p><p>Chegam para <b>abrir caminhos, desatar nós e proteger</b>, principalmente nas questões do dia a dia: trabalho, dinheiro, relações. São alegres e falantes, mas nada bobos. Por trás do sorriso tem muita leitura de gente.</p><blockquote><b>No desenvolvimento</b>, a energia costuma vir leve e solta: o corpo ginga, os ombros relaxam, aparece um sorriso. Pode parecer "fácil demais", mas leveza também é fundamento.</blockquote><h2>E se eu não senti nada?</h2><p>Tudo bem. Nem toda linha vai se aproximar de você do mesmo jeito, nem no mesmo dia. Talvez você tenha mais afinidade com uma e quase nenhuma percepção com outra. É justamente para isso que existe a gira de desenvolvimento: <b>para experimentar, observar e descobrir</b>.</p><blockquote><b>Você não precisa provar nada. Precisa estar presente.</b></blockquote><p>Se alguma coisa ficou na sua cabeça (uma sensação, um gesto, uma vontade), anote e converse com os pais da casa. É assim que a relação vai se construindo.</p>$corpo$,
       'content', array['Ensinamentos'], false, 0, '#7B5B45', false, true, 'abas',
       '1873bc13-30e4-4214-b71a-98970c179a51', '1873bc13-30e4-4214-b71a-98970c179a51'
 where not exists (select 1 from public.house_contents where title = 'Quem passou pela nossa gira');

notify pgrst, 'reload schema';

-- confira: deve aparecer com rascunho = true e formato = abas
select title as "Conteúdo", is_draft as "Rascunho", layout as "Formato" from public.house_contents
 where title = 'Quem passou pela nossa gira';
