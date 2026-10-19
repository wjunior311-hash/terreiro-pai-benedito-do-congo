-- =====================================================================
-- 2026-10-19 (v) — "O que vou levar": lista de itens de uma gira (ex.: café coletivo)
--   * Cada item tem uma porção ("10 pães") e um número de vagas (quantas pessoas levam essa porção).
--   * Quem confirmou presença toca em "Eu levo"; todo mundo vê o que falta e quem leva o quê.
--   * Desmarcar não apaga: a linha fica com active = false.
-- =====================================================================
create table if not exists public.gira_bring_items (
  id         uuid primary key default gen_random_uuid(),
  gira_id    uuid not null references public.giras(id),
  category   text not null default '',
  name       text not null,
  portion    text not null default '',
  slots      int  not null default 1 check (slots > 0),
  sort_order int  not null default 0,
  active     boolean not null default true
);
create table if not exists public.gira_bring_claims (
  item_id    uuid not null references public.gira_bring_items(id),
  profile_id uuid not null references public.profiles(id),
  active     boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (item_id, profile_id)
);
alter table public.gira_bring_items enable row level security;
alter table public.gira_bring_claims enable row level security;

create or replace function app.gira_bring_list(p_gira uuid) returns jsonb
language plpgsql stable security definer set search_path = public, app as $$
begin
  if auth.uid() is null or not app.is_active_member() then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', i.id, 'category', i.category, 'name', i.name, 'portion', i.portion, 'slots', i.slots,
      'taken', (select count(*) from public.gira_bring_claims c where c.item_id = i.id and c.active),
      'mine', exists(select 1 from public.gira_bring_claims c where c.item_id = i.id and c.active and c.profile_id = auth.uid()),
      'who', (select coalesce(jsonb_agg(split_part(trim(p.name), ' ', 1) order by c.updated_at), '[]'::jsonb)
                from public.gira_bring_claims c join public.profiles p on p.id = c.profile_id where c.item_id = i.id and c.active))
      order by i.sort_order, i.name)
    from public.gira_bring_items i where i.gira_id = p_gira and i.active), '[]'::jsonb);
end $$;

create or replace function app.gira_bring_toggle(p_item uuid, p_take boolean) returns void
language plpgsql security definer set search_path = public, app as $$
declare v_i public.gira_bring_items; v_n int;
begin
  if auth.uid() is null or not app.is_active_member() then raise exception 'Entre no app.'; end if;
  select * into v_i from public.gira_bring_items where id = p_item and active;
  if v_i.id is null then raise exception 'Item não encontrado.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_item::text, 3));
  if p_take then
    if not exists(select 1 from public.gira_responses where gira_id = v_i.gira_id and profile_id = auth.uid() and status = 'going') then
      raise exception 'Confirme sua presença na gira antes de escolher o que levar.';
    end if;
    select count(*) into v_n from public.gira_bring_claims where item_id = p_item and active and profile_id <> auth.uid();
    if v_n >= v_i.slots then raise exception 'Esse item já está completo. Escolha outro.'; end if;
    insert into public.gira_bring_claims(item_id, profile_id, active, updated_at) values (p_item, auth.uid(), true, now())
    on conflict (item_id, profile_id) do update set active = true, updated_at = now();
  else
    update public.gira_bring_claims set active = false, updated_at = now() where item_id = p_item and profile_id = auth.uid();
  end if;
end $$;

create or replace function public.gira_bring_list(p_gira uuid) returns jsonb language sql stable security invoker set search_path = public, app as $$ select app.gira_bring_list(p_gira) $$;
create or replace function public.gira_bring_toggle(p_item uuid, p_take boolean) returns void language sql security invoker set search_path = public, app as $$ select app.gira_bring_toggle(p_item, p_take) $$;
grant execute on function app.gira_bring_list(uuid), app.gira_bring_toggle(uuid, boolean), public.gira_bring_list(uuid), public.gira_bring_toggle(uuid, boolean) to authenticated;

-- Café coletivo da Gira na Cachoeira (~30 pessoas)
insert into public.gira_bring_items(gira_id, category, name, portion, slots, sort_order)
select '3f784d1c-64f2-47ef-bd21-ae1830eaa125', c, n, p, s, o from (values
 ('☕ Café coletivo', 'Pão francês', '10 pães', 6, 1),
 ('☕ Café coletivo', 'Pão de forma', '1 pacote', 2, 2),
 ('☕ Café coletivo', 'Bolo (qualquer sabor)', '1 bolo', 4, 3),
 ('☕ Café coletivo', 'Frutas (banana, maçã, mamão…)', '1 kg ou 1 cacho', 4, 4),
 ('☕ Café coletivo', 'Queijo fatiado', '300 g', 3, 5),
 ('☕ Café coletivo', 'Presunto ou peito de peru fatiado', '300 g', 2, 6),
 ('☕ Café coletivo', 'Manteiga ou margarina', '1 pote (500 g)', 2, 7),
 ('☕ Café coletivo', 'Requeijão', '1 copo', 2, 8),
 ('☕ Café coletivo', 'Biscoito ou bolacha', '2 pacotes', 3, 9),
 ('🥤 Bebidas', 'Café pronto na garrafa térmica', '1 garrafa (1 litro)', 4, 10),
 ('🥤 Bebidas', 'Leite', '1 litro', 3, 11),
 ('🥤 Bebidas', 'Suco', '2 caixas de 1 litro', 3, 12),
 ('🥤 Bebidas', 'Açúcar e adoçante', '1 kg de açúcar + 1 adoçante', 1, 13),
 ('🥤 Bebidas', 'Água mineral', '1 galão de 5 litros', 2, 14),
 ('🧻 Descartáveis', 'Copinhos de café (50 ml)', '1 pacote com 100', 1, 15),
 ('🧻 Descartáveis', 'Copos (200 ml)', '1 pacote com 100', 1, 16),
 ('🧻 Descartáveis', 'Pratinhos', '1 pacote com 50', 1, 17),
 ('🧻 Descartáveis', 'Guardanapos', '2 pacotes', 1, 18),
 ('🧻 Descartáveis', 'Talheres (facas e colheres)', '1 pacote de cada', 1, 19),
 ('🧻 Descartáveis', 'Sacos de lixo (100 litros)', '1 rolo', 1, 20)
) v(c, n, p, s, o)
where not exists (select 1 from public.gira_bring_items x where x.gira_id = '3f784d1c-64f2-47ef-bd21-ae1830eaa125');
notify pgrst, 'reload schema';
