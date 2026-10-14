// Caminhos: avisos que avançam em etapas (ex.: Gira na Praia 2027).
// Filho da casa: vê a linha do tempo, responde a enquete e vê o resultado geral (sem nomes).
// Gestão: vê nomes, quem falta (com WhatsApp), total de pessoas e abre/encerra etapas.
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Check, Lock, Users } from "lucide-react";
import { supabase, APP_URL } from "../../lib/supabase.js";
import { err, whatsappLink } from "../../lib/helpers.js";
import { OrixaIcon } from "../../orixaSymbols.jsx";

const META = 0.8;
const pct = (a, b) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0);
const prazo = (d) => d ? new Date(d).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }) : "";
const encerrou = (e) => e.deadline && new Date() > new Date(e.deadline);
const KIND = { enquete: "Enquete", voluntarios: "Voluntários", info: "Informações" };

export function useCaminhos() {
  const [data, setData] = useState(null);
  const load = async () => {
    const { data: d } = await supabase.rpc("my_caminhos");
    setData(Array.isArray(d) ? d : []);
  };
  useEffect(() => { load(); }, []);
  return [data, load];
}

// etapa aberta em que a pessoa ainda não respondeu
export function pendenciaCaminho(caminhos) {
  for (const c of caminhos || []) for (const e of c.etapas || []) {
    if (e.status === "aberta" && e.kind === "enquete" && !e.mine && !encerrou(e)) return { c, e };
  }
  return null;
}

function Resultado({ e }) {
  const total = Object.values(e.counts || {}).reduce((a, b) => a + b, 0);
  return <div className="cw-res">
    {(e.options || []).map((o) => {
      const n = e.counts?.[o.k] || 0;
      return <div className={"cw-res-row" + (e.mine?.option === o.k ? " is-mine" : "")} key={o.k}>
        <span>{o.e} {o.t}</span><b>{n}</b>
        <i className="in-bar"><i style={{ width: pct(n, total) + "%" }} /></i>
      </div>;
    })}
    <small className="muted">{e.answered} de {e.base} filhos da casa já responderam{e.people_total ? " · " + e.people_total + " pessoas contando a família" : ""}</small>
  </div>;
}

function Enquete({ e, onDone }) {
  const [opt, setOpt] = useState(e.mine?.option || ""), [fam, setFam] = useState(e.mine ? (e.mine.family_count > 0 ? "sim" : "nao") : ""),
    [qtd, setQtd] = useState(e.mine?.family_count || 1), [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), [editando, setEditando] = useState(!e.mine);
  const fechada = encerrou(e) || e.status !== "aberta";
  const vai = opt && opt !== "nao";
  const pronto = opt && (!e.ask_family || !vai || fam === "nao" || (fam === "sim" && qtd > 0));
  const enviar = async () => {
    setBusy(true); setMsg("");
    const { error } = await supabase.rpc("caminho_responder", { p_etapa: e.id, p_option: opt, p_family: vai && fam === "sim" ? Number(qtd) : 0 });
    setBusy(false);
    if (error) return setMsg(err(error));
    setEditando(false);
    onDone();
  };
  if (!editando || fechada) {
    const o = (e.options || []).find((x) => x.k === e.mine?.option);
    return <div className="cw-mine">
      {o ? <p><Check size={16} /> Sua resposta: <b>{o.e} {o.t}</b>{e.mine.family_count > 0 ? <> · + {e.mine.family_count} da família</> : null}</p> : <p className="muted">Você não respondeu esta etapa.</p>}
      {!fechada && <button type="button" className="btn" onClick={() => setEditando(true)}>Mudar minha resposta</button>}
    </div>;
  }
  return <div className="cw-form">
    <div className="cw-opts" role="radiogroup">{(e.options || []).map((o) => <button type="button" role="radio" aria-checked={opt === o.k} key={o.k} className={"cw-opt" + (opt === o.k ? " is-on" : "")} onClick={() => setOpt(o.k)}>
      <span className="cw-opt-e">{o.e}</span><span><b>{o.t}</b>{o.d && <small>{o.d}</small>}</span>
    </button>)}</div>
    {e.ask_family && vai && <div className="cw-fam">
      <b>Vai levar alguém da sua família?</b>
      <small>Só família mesmo: marido, esposa, companheiro(a), filhos, pais. Amigos e convidados não entram.</small>
      <div className="cw-fam-btns">
        <button type="button" className={"btn" + (fam === "nao" ? " primary" : "")} onClick={() => setFam("nao")}>Não</button>
        <button type="button" className={"btn" + (fam === "sim" ? " primary" : "")} onClick={() => setFam("sim")}>Sim</button>
      </div>
      {fam === "sim" && <label className="cw-qtd">Quantas pessoas da família?
        <span><button type="button" className="btn" onClick={() => setQtd(Math.max(1, qtd - 1))}>−</button><b>{qtd}</b><button type="button" className="btn" onClick={() => setQtd(Math.min(20, qtd + 1))}>+</button></span>
      </label>}
    </div>}
    {msg && <div className="gw-warning">{msg}</div>}
    <div className="cw-send">
      {e.mine && <button type="button" className="btn" onClick={() => setEditando(false)}>Cancelar</button>}
      <button type="button" className="btn primary" disabled={!pronto || busy} onClick={enviar}>{busy ? "Enviando…" : "Enviar resposta"}</button>
    </div>
  </div>;
}

export function CaminhoTela() {
  const [data, load] = useCaminhos();
  if (!data) return <div className="hm-skeleton" style={{ marginTop: 14 }} />;
  if (!data.length) return <div className="mu-empty">Nenhum caminho aberto agora.</div>;
  return <div className="cw">{data.map((c) => <section key={c.id} className="cw-cam">
    <div className="cw-hero"><span className="cw-hero-e">{c.emoji}</span><div><span className="eyebrow">CAMINHO</span><h1>{c.title}</h1></div></div>
    <div className="cw-intro">{c.intro.split(/\n\s*\n/).map((t, i) => <p key={i}>{t}</p>)}</div>
    <ol className="cw-tl">{(c.etapas || []).map((e) => <li key={e.id} className={"cw-step is-" + e.status}>
      <span className="cw-dot">{e.status === "concluida" ? <Check size={14} /> : e.status === "futura" ? <Lock size={12} /> : e.ord}</span>
      <div className="cw-step-body">
        <small className="cw-step-k">Etapa {e.ord} · {KIND[e.kind] || ""}{e.status === "futura" ? " · em breve" : e.status === "concluida" ? " · concluída" : ""}</small>
        <h2>{e.title}</h2>
        {e.body && <p className="cw-step-txt">{e.body}</p>}
        {e.status === "aberta" && e.deadline && <p className={"cw-prazo" + (encerrou(e) ? " is-off" : "")}>{encerrou(e) ? "Prazo encerrado" : "Responda até " + prazo(e.deadline)}</p>}
        {e.kind === "enquete" && e.status === "aberta" && <Enquete e={e} onDone={load} />}
        {e.kind === "enquete" && e.status !== "futura" && (e.mine || e.status === "concluida" || encerrou(e)) && <Resultado e={e} />}
      </div>
    </li>)}</ol>
  </section>)}</div>;
}

// cartão para a aba Avisos (Conteúdos)
export function CaminhoAvisoCard({ go }) {
  const [data] = useCaminhos();
  if (!data?.length) return null;
  return <>{data.map((c) => {
    const ab = (c.etapas || []).find((e) => e.status === "aberta");
    const falta = ab && ab.kind === "enquete" && !ab.mine && !encerrou(ab);
    return <button type="button" key={c.id} className={"cw-card" + (falta ? " is-falta" : "")} onClick={() => go("caminho")}>
      <span className="cw-card-e">{c.emoji}</span>
      <span className="cw-card-t"><b>{c.title}</b><small>{ab ? "Etapa " + ab.ord + ": " + ab.title : "Acompanhe as etapas"}{falta ? " · falta sua resposta" : ab?.mine ? " · você já respondeu ✓" : ""}</small></span>
      <ChevronRight size={16} />
    </button>;
  })}</>;
}

// ---------------- Gestão ----------------
export function GestaoCaminhos() {
  const [data, load] = useCaminhos(), [sel, setSel] = useState(null), [rows, setRows] = useState(null), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const etapas = useMemo(() => (data || []).flatMap((c) => (c.etapas || []).map((e) => ({ ...e, c }))), [data]);
  const atual = etapas.find((e) => e.id === sel) || etapas.find((e) => e.status === "aberta") || etapas[0];
  useEffect(() => {
    if (!atual || atual.kind !== "enquete") { setRows(null); return; }
    setRows(null);
    supabase.rpc("admin_caminho_respostas", { p_etapa: atual.id }).then(({ data: d, error }) => { if (error) setMsg(err(error)); setRows(d || []); });
  }, [atual?.id, data]);
  if (!data) return <div className="hm-skeleton" style={{ marginTop: 14 }} />;
  if (!etapas.length) return <div className="mu-empty">Nenhum caminho criado.</div>;
  const mudar = async (e, status) => {
    const txt = status === "aberta" ? "Abrir a etapa “" + e.title + "”? Todo mundo vai receber uma notificação no celular." : status === "concluida" ? "Encerrar a etapa “" + e.title + "”?" : "Voltar a etapa para “em breve”?";
    if (!window.confirm(txt)) return;
    setBusy(true); setMsg("");
    const { error } = await supabase.rpc("admin_caminho_etapa", { p_etapa: e.id, p_status: status, p_deadline: null, p_body: null });
    setBusy(false);
    if (error) return setMsg(err(error));
    setSel(e.id);
    load();
  };
  const meta = atual ? Math.ceil(META * (atual.base || 0)) : 0;
  const faltam = (rows || []).filter((r) => !r.option);
  const porOpt = (k) => (rows || []).filter((r) => r.option === k);
  const familia = (rows || []).reduce((a, r) => a + (r.option && r.option !== "nao" ? r.family_count : 0), 0);
  const vao = (rows || []).filter((r) => r.option && r.option !== "nao").length;
  return <div className="cw-adm">
    {data.map((c) => <div key={c.id}>
      <h3 className="cw-adm-h">{c.emoji} {c.title}</h3>
      <div className="cw-adm-etapas">{(c.etapas || []).map((e) => <button type="button" key={e.id} className={"cw-adm-et is-" + e.status + (atual?.id === e.id ? " is-sel" : "")} onClick={() => setSel(e.id)}>
        <small>Etapa {e.ord}</small><b>{e.title}</b><i>{e.status === "aberta" ? "Aberta" : e.status === "concluida" ? "Concluída" : "Em breve"}</i>
      </button>)}</div>
    </div>)}
    {msg && <div className="gw-warning">{msg}</div>}
    {atual && <div className="cw-adm-box">
      <div className="cw-adm-acts">
        {atual.status !== "aberta" && <button className="btn primary" disabled={busy} onClick={() => mudar(atual, "aberta")}>Abrir etapa e avisar todos</button>}
        {atual.status === "aberta" && <button className="btn" disabled={busy} onClick={() => mudar(atual, "concluida")}>Encerrar etapa</button>}
        {atual.status === "concluida" && <button className="btn" disabled={busy} onClick={() => mudar(atual, "futura")}>Voltar para “em breve”</button>}
      </div>
      {atual.kind !== "enquete" ? <p className="muted">{atual.body}<br /><br />Esta etapa ainda não tem formulário no app. Quando chegar a hora, me peça para montar o conteúdo dela.</p> : <>
        <div className="cw-meta">
          <div><b>{atual.answered}</b> de {atual.base} responderam <span className="muted">({pct(atual.answered, atual.base)}%)</span></div>
          <i className="in-bar"><i style={{ width: pct(atual.answered, meta) + "%" }} /></i>
          <small>{atual.answered >= meta ? "Chegou em 80%! Já dá para abrir a próxima etapa." : "Faltam " + (meta - atual.answered) + " respostas para chegar em 80% (" + meta + ")."}</small>
        </div>
        <div className="in-resumo">
          <div><b>{vao}</b><small>filhos vão</small></div>
          <div><b>{familia}</b><small>da família</small></div>
          <div><b>{vao + familia}</b><small>pessoas no total</small></div>
        </div>
        {!rows ? <div className="hm-skeleton" /> : <>
          {(atual.options || []).map((o) => {
            const l = porOpt(o.k);
            return <details key={o.k} className="cw-adm-opt" open={l.length > 0 && l.length <= 12}>
              <summary>{o.e} {o.t} <b>{l.length}</b></summary>
              {l.length ? <ul>{l.map((r) => <li key={r.profile_id}><OrixaIcon name={r.orixa_symbol} size={20} /> {r.name}{r.family_count > 0 && <small> + {r.family_count} da família</small>}</li>)}</ul> : <p className="muted">Ninguém ainda.</p>}
            </details>;
          })}
          <details className="cw-adm-opt is-falta" open>
            <summary><Users size={15} /> Ainda não responderam <b>{faltam.length}</b></summary>
            {faltam.length ? <ul>{faltam.map((r) => {
              const nome = (r.name || "").split(" ")[0];
              const wa = r.phone && whatsappLink(r.phone, "Axé, " + nome + "! 🌊 A casa está organizando a " + atual.c.title + ". Responde no app se você vai? É rapidinho" + (atual.deadline ? ", até " + prazo(atual.deadline) : "") + ": " + APP_URL + "?tela=caminho 🙏🏾");
              return <li key={r.profile_id}><OrixaIcon name={r.orixa_symbol} size={20} /> {r.name}{wa && <a className="cw-wa" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}</li>;
            })}</ul> : <p className="muted">Todo mundo respondeu! 🎉</p>}
          </details>
        </>}
      </>}
    </div>}
  </div>;
}
