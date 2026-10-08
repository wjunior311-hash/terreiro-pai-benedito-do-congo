// Revista Ẹ̀mí Ìlú: leitura no app (capa, sumário, matérias) e registro de quem leu.
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Share2 } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { OrixaIcon } from "../../orixaSymbols.jsx";
import { money } from "../../lib/helpers.js";
import { can } from "../acesso.js";
import { useMemberFinance } from "../financeiro/regras.js";
import { PayModal } from "../financeiro/ComoPagar.jsx";
import * as ed202610 from "./edicoes/2026-10.js";

// todas as edições que existem no app (a mais nova primeiro)
export const EDICOES = [ed202610];
export const edicaoPorSlug = (slug) => EDICOES.find((e) => e.slug === slug);

const firstName = (n) => {
  const w = String(n || "").trim().split(/\s+/)[0] || "";
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
};

// edições publicadas (ou todas, para quem cuida da revista)
export function useEdicoes(p) {
  const [rows, setRows] = useState(null);
  const load = async () => {
    const [{ data, error }, { data: reads }] = await Promise.all([
      supabase.from("newsletter_editions").select("id,slug,title,articles,status,published_at").order("slug", { ascending: false }),
      supabase.from("newsletter_reads").select("edition_id,articles,finished_at").eq("profile_id", p.id)
    ]);
    if (error) return setRows([]);
    const rm = Object.fromEntries((reads || []).map((r) => [r.edition_id, r]));
    setRows((data || []).filter((e) => edicaoPorSlug(e.slug)).map((e) => ({ ...e, read: rm[e.id] || null })));
  };
  useEffect(() => {
    load();
  }, [p?.id]);
  return [rows, load];
}

// Cartão no Início: edição nova
export function RevistaHomeCard({ p, go }) {
  const [rows] = useEdicoes(p);
  const latest = (rows || []).find((e) => e.status === "published");
  if (!latest) return null;
  const ed = edicaoPorSlug(latest.slug), done = !!latest.read?.finished_at, started = !!latest.read;
  return <button type="button" className="rv-home" onClick={() => go("revista")} style={{ backgroundImage: `url("${ed.capa.img}")` }}>
    <span className="rv-home-shade" />
    <span className="rv-home-text">
      <span className="rv-home-logo">Ẹ̀mí Ìlú</span>
      <b>{ed.mes}</b>
      <small>{done ? "✓ Você leu esta edição" : started ? "Continue de onde parou" : "Nova edição · " + ed.capa.minutos + " min de leitura"}</small>
    </span>
    <ArrowRight size={20} className="rv-home-go" />
  </button>;
}

// Tela "Revista": última edição + edições anteriores
export function RevistaTela({ p, go }) {
  const [rows, reload] = useEdicoes(p), [open, setOpen] = useState(null);
  const manager = can(p, "newsletter.manage");
  if (open) return <Revista p={p} slug={open} go={go} back={() => {
    setOpen(null);
    reload();
  }} />;
  if (rows === null) return <span className="skeleton skeleton-card" />;
  const list = rows.filter((e) => e.status === "published" || manager);
  if (!list.length) return <div className="empty">A próxima edição da Ẹ̀mí Ìlú ainda não saiu.</div>;
  return <div className="rv-shelf">
    {list.map((e) => {
      const ed = edicaoPorSlug(e.slug), lidas = e.read?.articles?.length || 0;
      return <button key={e.slug} className="rv-shelf-item" onClick={() => setOpen(e.slug)}>
        <span className="rv-shelf-cover" style={{ backgroundImage: `url("${ed.capa.img}")` }}><span>Ẹ̀mí Ìlú</span></span>
        <span className="rv-shelf-text">
          <b>{ed.mes}</b>
          {e.status !== "published" && <span className="rv-tag">Rascunho · só a gestão vê</span>}
          <small>{e.read?.finished_at ? "✓ Lida" : lidas ? lidas + " de " + ed.materias.length + " matérias lidas" : ed.capa.chamadas.map((c) => c.titulo).slice(0, 2).join(" · ")}</small>
        </span>
        <ArrowRight size={18} />
      </button>;
    })}
  </div>;
}

// O leitor
export function Revista({ p, slug, back, go = null, preview = false }) {
  const ed = edicaoPorSlug(slug);
  const [tela, setTela] = useState("capa"), [idx, setIdx] = useState(0), [lidas, setLidas] = useState({}), [chip, setChip] = useState({});
  const manager = can(p, "newsletter.manage");
  const track = (article) => {
    if (!preview) supabase.rpc("newsletter_mark_read", { p_slug: slug, p_article: article ?? null }).then(() => {});
  };
  useEffect(() => {
    track(null);
    supabase.from("newsletter_editions").select("id").eq("slug", slug).maybeSingle().then(({ data: e }) => {
      if (!e) return;
      supabase.from("newsletter_reads").select("articles").eq("edition_id", e.id).eq("profile_id", p.id).maybeSingle().then(({ data }) => {
        if (data?.articles) setLidas(Object.fromEntries(data.articles.map((a) => [a, true])));
      });
    });
  }, [slug]);
  const abrir = (i) => {
    const n = ed.materias[i].n;
    setLidas((v) => ({ ...v, [n]: true }));
    setIdx(i);
    setTela("materia");
    track(n);
    document.querySelector(".rv-scroll")?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  };
  if (!ed) return <div className="empty">Edição não encontrada.</div>;
  const total = ed.materias.length, nLidas = Object.keys(lidas).length;

  if (tela === "capa") return <div className="rv rv-capa">
    <img className="rv-capa-img" src={ed.capa.img} alt="" />
    <div className="rv-capa-shade" />
    <button className="rv-x" aria-label="Fechar a revista" onClick={back}><ArrowLeft size={20} /></button>
    <div className="rv-capa-top">
      <div className="rv-logo rv-in1">Ẹ̀mí Ìlú</div>
      <div className="rv-mes rv-in2">{ed.mes}</div>
    </div>
    <div className="rv-capa-box">
      {ed.capa.chamadas.map((c, i) => <div key={i} className={"rv-chamada rv-in" + Math.min(5, i + 3) + (c.grande ? " big" : "")}>
        <span className="rv-bar" style={{ background: c.cor }} />
        <span><b>{c.titulo}</b>{c.sub && <small>{c.sub}</small>}</span>
      </div>)}
      <button className="rv-abrir rv-in5" onClick={() => setTela("sumario")}>Abrir a edição · {ed.capa.minutos} min <ArrowRight size={18} /></button>
    </div>
  </div>;

  if (tela === "sumario") return <div className="rv rv-paper rv-sumario">
    <div className="rv-top">
      <button className="rv-round" aria-label="Voltar à capa" onClick={() => setTela("capa")}><ArrowLeft size={20} /></button>
      <span className="rv-logo-sm">Ẹ̀mí Ìlú</span>
      <span className="rv-count">{nLidas}/{total} lidas</span>
    </div>
    <h2 className="rv-h-big rv-in1">NESTA EDIÇÃO</h2>
    <div className="rv-rule rv-in1" />
    <div className="rv-toc">{ed.materias.map((m, i) => <button key={m.n} className={"rv-toc-item rv-in" + Math.min(5, i + 1)} onClick={() => abrir(i)}>
      <span className="rv-toc-bar" style={{ background: m.cor }} />
      <span className="rv-toc-n" style={{ color: m.corTxt }}>{m.n}</span>
      <span className="rv-toc-t"><b>{m.titulo}</b><small>{m.sub}</small></span>
      {lidas[m.n] && <span className="rv-done" aria-label="lida"><Check size={15} /></span>}
    </button>)}</div>
  </div>;

  const m = ed.materias[idx], chipSel = chip[idx] || 0;
  return <div className="rv rv-paper rv-materia" style={{ "--rv-cor": m.cor, "--rv-cor-txt": m.corTxt, "--rv-cor-soft": m.corSoft, "--rv-chip-txt": m.corChip || "#fff" }}>
    <div className="rv-progress"><i style={{ width: Math.round((idx + 1) / total * 100) + "%" }} /></div>
    <div className="rv-floating">
      <button className="rv-round dark" aria-label="Voltar ao sumário" onClick={() => setTela("sumario")}><ArrowLeft size={20} /></button>
      <span className="rv-pill">{m.n} de {String(total).padStart(2, "0")}</span>
    </div>
    <div className="rv-hero" style={{ background: m.foto }}>
      {m.img && <img src={m.img} alt="" style={{ objectPosition: m.pos || "center" }} />}
      <div className="rv-hero-shade" />
      <div className="rv-hero-text">
        <span className="rv-secao rv-in1">{m.secao}</span>
        <h2 className="rv-in2">{m.titulo}</h2>
      </div>
    </div>
    <div className="rv-body" key={idx}>
      <div className="rv-sub rv-in3">{m.sub}</div>
      {m.blocos.map((b, i) => <Bloco key={i} b={b} m={m} ed={ed} p={p} go={go} manager={manager || preview} chipSel={chipSel} setChip={(v) => setChip((x) => ({ ...x, [idx]: v }))} />)}
    </div>
    <div className="rv-foot">
      <button className="rv-next" onClick={() => idx < total - 1 ? abrir(idx + 1) : setTela("sumario")}>{idx < total - 1 ? "Próxima matéria" : "Fim da edição"} <ArrowRight size={18} /></button>
    </div>
  </div>;
}

function Bloco({ b, m, ed, p, go, manager, chipSel, setChip }) {
  switch (b.k) {
    case "p": return <p>{b.texto}</p>;
    case "forte": return <p><b>{b.texto}</b></p>;
    case "h": return <h3 className="rv-h">{b.texto}</h3>;
    case "quote": return <Frase texto={b.texto} />;
    case "confirma": return manager ? <div className="rv-confirma"><b>Só a gestão vê:</b> {b.texto}</div> : null;
    case "chips": {
      const c = m.chips[chipSel] || m.chips[0];
      return <div className="rv-chips">
        <small>{b.texto}</small>
        <div className="rv-chip-row">{m.chips.map((x, i) => <button key={x.nome} className={i === chipSel ? "on" : ""} onClick={() => setChip(i)}>{x.nome}</button>)}</div>
        <div className="rv-chip-card" key={c.nome}><b>{c.nome}</b><p>{c.texto}</p></div>
      </div>;
    }
    case "veste": return <div className="rv-veste">{ed.vestimenta.map((v) => <div key={v.t} className="rv-veste-item">
      <span style={{ background: v.bg }}>{v.ic}</span><span><b>{v.t}</b><small>{v.d}</small></span>
    </div>)}</div>;
    case "agenda": return <Agenda ed={ed} p={p} go={go} />;
    case "banho": return <Banho banho={ed.banho} />;
    case "pagar": return <Pagar p={p} />;
    case "niver": return <Niver ed={ed} />;
    case "livros": return <div className="rv-livros">{ed.livros.map((l) => <div key={l.titulo} className="rv-livro">
      <span className="rv-livro-capa" style={{ background: l.cor }}>{l.titulo.split(":")[0]}{l.capa && <img src={l.capa} alt={"Capa de " + l.titulo} loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = "none"; }} />}</span>
      <span><b>{l.titulo}</b><small>{l.autor}</small><p>{l.texto}</p></span>
    </div>)}</div>;
    case "pergunta": return <div className="rv-pergunta"><small>PARA PENSAR</small><b>{b.texto}</b></div>;
    default: return null;
  }
}

function Banho({ banho }) {
  const [tem, setTem] = useState({}), [modo, setModo] = useState("frescas");
  return <div className="rv-banho">
    <small>Marque o que você já tem em casa:</small>
    {banho.ingredientes.map((x, i) => <button key={x} className={"rv-ing" + (tem[i] ? " on" : "")} aria-pressed={!!tem[i]} onClick={() => setTem((v) => ({ ...v, [i]: !v[i] }))}>
      <span className="rv-ing-box">{tem[i] && <Check size={15} />}</span><span>{x}</span>
    </button>)}
    <div className="rv-modo" role="group" aria-label="Tipo de folha">
      <button className={modo === "frescas" ? "on" : ""} onClick={() => setModo("frescas")}>Folhas frescas</button>
      <button className={modo === "secas" ? "on" : ""} onClick={() => setModo("secas")}>Folhas de saquinho</button>
    </div>
    <p className="rv-modo-txt" key={modo}>{banho[modo]}</p>
  </div>;
}

function Frase({ texto }) {
  const [msg, setMsg] = useState("");
  const share = async () => {
    const text = texto.charAt(0) + texto.slice(1).toLowerCase() + "\n\n— Ẹ̀mí Ìlú · Terreiro Pai Benedito do Congo";
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setMsg("Frase copiada.");
      }
    } catch (e) { /* cancelado */ }
  };
  return <div className="rv-quote">
    <div className="rv-quote-text">{texto}</div>
    <button className="rv-share" onClick={share}><Share2 size={15} /> {msg || "Compartilhar frase"}</button>
  </div>;
}

function Agenda({ ed, p, go }) {
  const [giras, setGiras] = useState(null), [resp, setResp] = useState({});
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("giras").select("id,name,starts_at,status").eq("status", "published").gte("starts_at", ed.agendaDe + "T00:00:00").lte("starts_at", ed.agendaAte + "T23:59:59").order("starts_at");
      setGiras(data || []);
      const ids = (data || []).map((g) => g.id);
      if (ids.length) {
        const { data: r } = await supabase.from("gira_responses").select("gira_id,status").eq("profile_id", p.id).in("gira_id", ids);
        setResp(Object.fromEntries((r || []).map((x) => [x.gira_id, x.status])));
      }
    })();
  }, []);
  const now = new Date();
  return <div className="rv-agenda">
    <b className="rv-agenda-t">NA CASA</b>
    <small>Direto da Agenda do app</small>
    {giras === null ? <span className="skeleton skeleton-line" /> : !giras.length ? <p>Nenhuma gira publicada nesse período ainda.</p> : giras.map((g) => {
      const d = new Date(g.starts_at), past = d < now, going = resp[g.id] === "going";
      return <div key={g.id} className={"rv-agenda-row" + (past ? " past" : "")}>
        <span className="rv-agenda-d">{d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}<small>{d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small></span>
        <span className="rv-agenda-n">{g.name}</span>
        {past ? <small className="rv-agenda-past">já foi</small> : going ? <small className="rv-agenda-ok">✓ você confirmou</small> : null}
      </div>;
    })}
    {go && <button className="rv-agenda-go" onClick={() => go("giras")}>Ver a agenda completa e confirmar presença <ArrowRight size={17} /></button>}
    {!go && <small className="rv-agenda-hint">Para confirmar presença, a pessoa vai para a Agenda do app.</small>}
  </div>;
}

function Pagar({ p }) {
  const fin = useMemberFinance(p), [open, setOpen] = useState(false);
  const items = fin.items || [];
  return <div className="rv-pagar">
    <div className="rv-pagar-card">
      <small>MENSALIDADE</small>
      <div className="rv-pagar-row"><b>{money(fin.settings?.monthly_amount || 40)}</b><span>vence dia {fin.settings?.due_day || 20}</span></div>
      <span>Pix: {fin.settings?.pix_key || "pixtpbc@gmail.com"}</span>
      {!fin.loaded ? null : items.length ? <>
        <ul>{items.map((x) => <li key={x.key}><span>{x.description}{x.proof ? " · comprovante em análise" : x.overdue ? " · em atraso" : ""}</span><b>{money(x.amount)}</b></li>)}</ul>
        <button onClick={() => setOpen(true)}>Como pagar · Pix e comprovante</button>
      </> : <div className="rv-emdia">✓ Você está em dia. Obrigado!</div>}
    </div>
    {open && <PayModal p={p} settings={fin.settings} items={items} onClose={() => setOpen(false)} onSent={fin.reload} />}
  </div>;
}

function Niver({ ed }) {
  const [list, setList] = useState(null);
  useEffect(() => {
    supabase.from("profiles").select("id,name,date_of_birth,orixa_symbol").eq("is_active", true).then(({ data }) => {
      setList((data || []).filter((x) => /^\d{4}-\d{2}-\d{2}/.test(x.date_of_birth || "") && Number(x.date_of_birth.slice(5, 7)) === ed.mesAniversario).sort((a, b) => a.date_of_birth.slice(8, 10).localeCompare(b.date_of_birth.slice(8, 10))));
    });
  }, []);
  if (list === null) return <span className="skeleton skeleton-line" />;
  if (!list.length) return <p>Nenhum aniversariante neste mês.</p>;
  return <div className="rv-niver">{list.map((x) => <div key={x.id} className="rv-niver-p">
    <span><OrixaIcon name={x.orixa_symbol} size={38} /></span>
    <b>{firstName(x.name)}</b>
    <small>{x.date_of_birth.slice(8, 10)}/{x.date_of_birth.slice(5, 7)}</small>
  </div>)}</div>;
}
