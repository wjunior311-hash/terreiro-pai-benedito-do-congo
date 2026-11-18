-- Falar com os Pais: aviso quando os Pais respondem.
alter table public.house_questions add column if not exists answer_seen_at timestamptz;
create or replace function app.aviso_resposta_pais() returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  if new.answer is not null and new.answer is distinct from old.answer and new.author_id is not null then
    new.answer_seen_at := null;
    perform app.push_enqueue(new.author_id, 'Os Pais responderam sua mensagem 💬',
      left(new.answer, 120), '?tela=contact', 'resposta-pais:' || new.id || ':' || to_char(now(), 'YYYYMMDDHH24MI'));
  end if;
  return new;
end $$;
create or replace trigger house_questions_aviso_resposta before update of answer on public.house_questions
  for each row execute function app.aviso_resposta_pais();
create or replace function app.my_unseen_answers() returns integer language sql stable security definer set search_path = public, app as $$
  select count(*)::int from public.house_questions where author_id = auth.uid() and answer is not null and answer_seen_at is null
$$;
create or replace function app.mark_my_answers_seen() returns void language sql security definer set search_path = public, app as $$
  update public.house_questions set answer_seen_at = now() where author_id = auth.uid() and answer is not null and answer_seen_at is null
$$;
create or replace function public.my_unseen_answers() returns integer language sql stable security invoker set search_path = public, app as $$ select app.my_unseen_answers() $$;
create or replace function public.mark_my_answers_seen() returns void language sql security invoker set search_path = public, app as $$ select app.mark_my_answers_seen() $$;
grant execute on function app.my_unseen_answers(), app.mark_my_answers_seen(), public.my_unseen_answers(), public.mark_my_answers_seen() to authenticated;
-- respostas dos últimos 14 dias (até 18/11) ficaram como "não vistas" para aparecer o aviso no Início.
notify pgrst, 'reload schema';
