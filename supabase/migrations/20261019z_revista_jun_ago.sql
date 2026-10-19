-- 2026-10-19 (z) — Ẹ̀mí Ìlú de junho e agosto de 2026 publicadas sem notificação (edições antigas).
-- As insígnias emi:2026-06 e emi:2026-08 entram sozinhas na coleção (app.badge_state lê as edições publicadas).
insert into public.newsletter_editions(slug, title, articles, status, published_at)
values ('2026-06', 'Ẹ̀mí Ìlú · Junho 2026', 6, 'published', '2026-06-01 12:00:00-03'),
       ('2026-08', 'Ẹ̀mí Ìlú · Agosto 2026', 6, 'published', '2026-08-01 12:00:00-03')
on conflict (slug) do nothing;
