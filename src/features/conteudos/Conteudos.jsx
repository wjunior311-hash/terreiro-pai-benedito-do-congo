// Conteúdos em formato de blog (membros).
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, ChevronLeft, ArrowLeft, Bell } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { dateTime, err } from "../../lib/helpers.js";
import { CONTENT_TAGS, contentSummary, coverStyle, isDraft, readingMinutes, sanitizeContentHtml, splitContentTabs } from "./conteudo.js";

// Corpo em abas: cada Título vira um botão; Anterior / Próxima no fim.
function ContentTabs({ body }) {
  const { intro, tabs } = useMemo(() => splitContentTabs(body), [body]);
  const [i, setI] = useState(0);
  const topRef = useRef(null);
  useEffect(() => { if (i >= tabs.length) setI(0); }, [tabs.length]);
  if (!tabs.length) return <div className="bl-body" dangerouslySetInnerHTML={{ __html: sanitizeContentHtml(body) || "<p>…</p>" }} />;
  const cur = tabs[Math.min(i, tabs.length - 1)];
  const go = (n) => {
    setI(n);
    const el = topRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return <>
  {intro && <div className="bl-body" dangerouslySetInnerHTML={{ __html: intro }} />}
  <div className="bl-tabs" ref={topRef} role="tablist">{tabs.map((t, n) => <button type="button" role="tab" key={n} aria-selected={n === i} className={n === i ? "is-on" : ""} onClick={() => go(n)}>{t.title}</button>)}</div>
  <section className="bl-tab-panel" key={i}>
   <h2 className="bl-tab-title">{cur.title}</h2>
   <div className="bl-body" dangerouslySetInnerHTML={{ __html: cur.html || "<p>…</p>" }} />
  </section>
  {tabs.length > 1 && <div className="bl-tab-nav">
   {i > 0 ? <button type="button" className="btn" onClick={() => go(i - 1)}><small><ChevronLeft size={12} /> Anterior</small>{tabs[i - 1].title}</button> : <span />}
   {i < tabs.length - 1 ? <button type="button" className="btn primary" onClick={() => go(i + 1)}><small>Próxima <ChevronRight size={12} /></small>{tabs[i + 1].title}</button> : <span />}
  </div>}
  </>;
}

export function ContentArticle({ x, authorName, read, onBack, onConfirm, confirming, preview = false }) {
  return <article className="bl-article">
  {!preview && <button type="button" className="btn bl-back" onClick={onBack}><ArrowLeft size={15} /> Voltar</button>}
  <div className={"bl-cover" + (x.cover_url ? " has-image" : "")} style={coverStyle(x)}>{isDraft(x) ? <span className="bl-badge is-draft">Rascunho · só a gestão vê</span> : x.is_required && <span className="bl-badge">Leitura obrigatória</span>}</div>
  <div className="bl-article-inner">
   {x.tags?.length > 0 && <div className="bl-tags">{x.tags.map((t) => <span key={t}>{t}</span>)}</div>}
   <h1>{x.title || "Título do conteúdo"}</h1>
   <p className="bl-meta">{authorName ? authorName + " · " : ""}{readingMinutes(x.body)} min de leitura{x.created_at ? " · " + new Date(x.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }) : ""}</p>
   {x.summary && <p className="bl-lead">{x.summary}</p>}
   {x.layout === "abas" ? <ContentTabs body={x.body} /> : <div className="bl-body" dangerouslySetInnerHTML={{ __html: sanitizeContentHtml(x.body) || "<p>…</p>" }} />}
   {x.is_required && !isDraft(x) && <div className="bl-confirm">{read?.confirmed_at ? <p className="bl-confirmed">
     <Check size={17} /> Você confirmou a leitura em {new Date(read.confirmed_at).toLocaleDateString("pt-BR")}.</p> : <>
     <p>Este conteúdo é de leitura obrigatória.</p>
     <button type="button" className="btn primary" disabled={confirming || preview} onClick={onConfirm}>
     <Check size={16} /> {confirming ? "Confirmando…" : "Li e entendi"}</button>
     </>}</div>}
  </div>
 </article>;
}

export function HouseContent({ back, p }) {
  const [items, setItems] = useState([]),
    [notices, setNotices] = useState([]),
    [authors, setAuthors] = useState({}),
    [section, setSection] = useState("content"),
    [tag, setTag] = useState("Todos"),
    [reads, setReads] = useState({}),
    [selected, setSelected] = useState(null),
    [confirming, setConfirming] = useState(false),
    [msg, setMsg] = useState(""),
    [loading, setLoading] = useState(true);
  const load = async () => {
    const [{ data: c }, { data: n }, { data: r }] = await Promise.all([supabase.from("house_contents").select("*").order("sort_order").order("created_at", { ascending: false }), supabase.from("notices").select("*").order("created_at", { ascending: false }), supabase.from("house_content_reads").select("*").eq("profile_id", p.id)]);
    setItems(c || []);
    setNotices(n || []);
    setReads(Object.fromEntries((r || []).map((x) => [x.content_id, x])));
    const ids = [...new Set((c || []).map((x) => x.created_by).filter(Boolean))];
    if (ids.length) {
      const { data: pr } = await supabase.from("profiles").select("id,name").in("id", ids);
      setAuthors(Object.fromEntries((pr || []).map((x) => [x.id, x.name])));
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
    supabase.rpc("touch_my_last_seen");
  }, []);
  const open = async (x) => {
    setSelected(x);
    setMsg("");
    window.scrollTo({ top: 0 });
    if (!reads[x.id] && !isDraft(x)) {
      const { error } = await supabase.rpc("mark_house_content_read", { p_content_id: x.id });
      if (!error) setReads((v) => ({ ...v, [x.id]: { ...v[x.id] || {}, content_id: x.id, first_read_at: (/* @__PURE__ */ new Date()).toISOString() } }));
    }
  };
  const confirm2 = async () => {
    if (!selected || confirming) return;
    setConfirming(true);
    const { error } = await supabase.rpc("confirm_house_content_read", { p_content_id: selected.id });
    setConfirming(false);
    if (error) {
      setMsg("Não foi possível confirmar agora: " + err(error));
      return;
    }
    setReads((v) => ({ ...v, [selected.id]: { ...v[selected.id] || {}, confirmed_at: (/* @__PURE__ */ new Date()).toISOString() } }));
  };
  if (selected) return <div className="bl">{msg && <div className="gw-warning">{msg}</div>}<ContentArticle x={selected} authorName={authors[selected.created_by]} read={reads[selected.id]} confirming={confirming} onConfirm={confirm2} onBack={() => setSelected(null)} />
    </div>;
  const contents = items.filter((x) => x.content_type === "content"), rules = items.filter((x) => x.content_type === "rule");
  const pendingRequired = contents.filter((x) => x.is_required && !isDraft(x) && !reads[x.id]?.confirmed_at);
  const shown = tag === "Todos" ? contents : contents.filter((x) => Array.isArray(x.tags) && x.tags.includes(tag));
  const hero = tag === "Todos" ? pendingRequired[0] || shown.find((x) => x.featured && !isDraft(x)) : null;
  const list = shown.filter((x) => x !== hero);
  const status = (x) => isDraft(x) ? <span className="bl-st is-draft">Rascunho</span> : x.is_required && !reads[x.id]?.confirmed_at ? <span className="bl-st is-req">Obrigatória</span> : reads[x.id] ? <span className="bl-st is-read">
    <Check size={12} /> Lido</span> : <span className="bl-st is-new">Novo</span>;
  return <div className="bl">
  <div className="bl-head">
    <span className="eyebrow">NOSSA CASA</span>
    <h1>Conteúdos</h1>
    <p className="muted">Ensinamentos, avisos e regras da casa</p>
    </div>
  <div className="bl-seg" role="tablist">{[["content", "Conteúdos"], ["notice", "Avisos"], ["rule", "Regras"]].map(([k, l]) => <button key={k} role="tab" aria-selected={section === k} className={section === k ? "is-on" : ""} onClick={() => {
    setSection(k);
    setTag("Todos");
  }}>{l}{k === "content" && pendingRequired.length > 0 && <i className="bl-dot-count">{pendingRequired.length}</i>}</button>)}</div>
  {loading ? <div className="hm-skeleton" style={{ marginTop: 14 }} /> : <>
  {section === "content" && <>
   <div className="mu-chips bl-chips">{["Todos", ...CONTENT_TAGS].map((t) => <button type="button" key={t} className={"mu-chip" + (tag === t ? " is-on" : "")} onClick={() => setTag(t)}>{t === "Recados dos Pais da Casa" ? "Recados dos Pais" : t}</button>)}</div>
   {hero && <button type="button" className={"bl-hero" + (hero.cover_url ? " has-image" : "")} style={coverStyle(hero)} onClick={() => open(hero)}>
     <span className="bl-hero-shade" />
     <span className="bl-hero-text">{hero.is_required && !reads[hero.id]?.confirmed_at ? <span className="bl-badge">Leitura obrigatória</span> : <span className="bl-badge">Em destaque</span>}<b>{hero.title}</b>
     <small>{authors[hero.created_by] ? authors[hero.created_by] + " · " : ""}{readingMinutes(hero.body)} min de leitura</small>
     </span>
     </button>}
   <div className="bl-list">{list.map((x) => <button type="button" className="bl-item" key={x.id} onClick={() => open(x)}>
     <span className={"bl-thumb" + (x.cover_url ? " has-image" : "")} style={coverStyle(x)} />
     <span className="bl-item-text">
     <span className="bl-item-top">{x.tags?.[0] && <small>{x.tags[0]}</small>}{status(x)}</span>
     <b>{x.title}</b>
     <small className="bl-item-sum">{contentSummary(x)}</small>
     <small className="bl-item-time">{readingMinutes(x.body)} min de leitura</small>
     </span>
     </button>)}
    {!list.length && !hero && <div className="mu-empty">Nenhum conteúdo por aqui ainda.</div>}</div>
  </>}
  {section === "notice" && <div className="bl-list">{notices.length ? notices.map((x) => <div className="bl-notice" key={x.id}>
    <span className="bl-notice-icon">
    <Bell size={17} />
    </span>
    <div>
    <b>{x.title}</b>
    <div className="bl-body bl-body-sm" dangerouslySetInnerHTML={{ __html: sanitizeContentHtml(x.body) }} />{x.ends_at && <small className="muted">Válido até {dateTime(x.ends_at)}</small>}</div>
    </div>) : <div className="mu-empty">Nenhum aviso ativo.</div>}</div>}
  {section === "rule" && <div className="bl-list">{rules.length ? rules.map((x, i) => <button type="button" className="bl-rule" key={x.id} onClick={() => open(x)}>
    <span className="bl-rule-n">{String(i + 1).padStart(2, "0")}</span>
    <span>
    <b>{x.title}</b>
    <small>{contentSummary(x)}</small>
    </span>
    <ChevronRight size={16} />
    </button>) : <div className="mu-empty">Nenhuma regra publicada.</div>}</div>}
  </>}
 </div>;
}
