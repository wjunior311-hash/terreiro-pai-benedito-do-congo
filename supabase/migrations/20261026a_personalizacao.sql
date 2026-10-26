-- Meu espaço personalizado: avatar, capa, cor, frase, vitrine de insígnias e "na casa desde"
alter table public.profiles add column if not exists avatar_mode text not null default 'orixa';
alter table public.profiles add column if not exists avatar jsonb;
alter table public.profiles add column if not exists capa text not null default 'casa';
alter table public.profiles add column if not exists cor text;
alter table public.profiles add column if not exists frase text;
alter table public.profiles add column if not exists vitrine text[] not null default '{}';
alter table public.profiles add column if not exists na_casa_desde int;

-- quantos selos (insígnias distintas) a pessoa tem e se já pode usar os itens da Festa da Abundância
create or replace function app.my_customization_state()
returns jsonb language sql stable security definer set search_path = public, app as $$
  select jsonb_build_object(
    'selos', (select count(distinct b.badge) from public.badge_awards b where b.profile_id = auth.uid()),
    'festa', exists (select 1 from public.gira_responses r join public.giras g on g.id = r.gira_id
                      where r.profile_id = auth.uid() and r.status = 'going' and g.name ilike '%abund%'),
    'badges', coalesce((select jsonb_agg(distinct b.badge) from public.badge_awards b where b.profile_id = auth.uid()), '[]'::jsonb))
$$;

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
end $$;

create or replace function public.my_customization_state() returns jsonb language sql stable security invoker set search_path = public, app as $$ select app.my_customization_state() $$;
create or replace function public.save_my_customization(p jsonb) returns void language sql security invoker set search_path = public, app as $$ select app.save_my_customization(p) $$;
grant execute on function app.my_customization_state() to authenticated;
grant execute on function app.save_my_customization(jsonb) to authenticated;
grant execute on function public.my_customization_state() to authenticated;
grant execute on function public.save_my_customization(jsonb) to authenticated;
notify pgrst, 'reload schema';
