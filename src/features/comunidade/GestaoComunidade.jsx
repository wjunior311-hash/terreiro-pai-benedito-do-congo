// Gestão da Comunidade: abrir giras para inscrição, lista de inscritos,
// check-in na porta, lista de espera, WhatsApp e download da lista.
import { useEffect, useMemo, useState } from "react";
import { supabase, APP_URL } from "../../lib/supabase.js";
import { err, whatsappLink } from "../../lib/helpers.js";
import { maskTel } from "./Comunidade.jsx";

const ACESSO = { casa: "🏠 Só filhos da casa", aberta: "🌍 Aberta à comunidade", assist: "🤝 Fechada, com vagas de assistência" };
const dm = (q) => new Date(q).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const hora = (q) => new Date(q).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const primeiro = (n) => String(n || "").trim().split(/\s+/)[0];
const telBonito = (t) => t ? maskTel(t) : "";
const linkGira = (g) => APP_URL + (g.access === "assist" && !g.is_public ? "?comunidade=" + g.id : "?comunidade");

function msg(tipo, s, g) {
  const q = new Date(g.starts_at).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }) + " às " + hora(g.starts_at);
  if (tipo === "vaga") return `Axé, ${primeiro(s.name)}! 🙏🏾\nAbriu uma vaga na ${g.name} (${q}) e ela é sua! Sua inscrição está confirmada.\nVenha com roupa clara e discreta e chegue no horário. Se não puder vir, cancele no app para liberar a vaga.\nTerreiro Pai Benedito do Congo`;
  return `Axé, ${primeiro(s.name)}! 🙏🏾\nPassando para lembrar da ${g.name}: ${q}.\nVenha com roupa clara e discreta (evite decote, roupa curta ou justa) e chegue no horário para não perder o atendimento. Se não puder vir, cancele no app para liberar sua vaga.\nTerreiro Pai Benedito do Congo`;
}

export function GestaoComunidade() {
  const [giras, setGiras] = useState(null), [sel, setSel] = useState(null), [lista, setLista] = useState([]), [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState(""), [filtro, setFiltro] = useState("todos"), [aviso, setAviso] = useState(""), [msgPara, setMsgPara] = useState(null);
  const [config, setConfig] = useState(false), [novo, setNovo] = useState(false);

  const carregarGiras = async (manter) => {
    const { data, error } = await supabase.rpc("admin_community_giras");
    if (error) { setAviso(err(error)); setGiras([]); return; }
    setGiras(data || []);
    if (!manter) {
      const prox = (data || []).filter((g) => new Date(g.starts_at) > new Date(Date.now() - 12 * 3600e3)).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0];
      setSel((prox || (data || [])[0])?.id || null);
    }
  };
  const carregarLista = async (id) => {
    if (!id) { setLista([]); return; }
    setCarregando(true);
    const { data, error } = await supabase.rpc("admin_community_signups", { p_gira: id });
    setCarregando(false);
    if (error) setAviso(err(error)); else setLista(data || []);
  };
  useEffect(() => { carregarGiras(); }, []);
  useEffect(() => { carregarLista(sel); setMsgPara(null); }, [sel]);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(""), 3000); return () => clearTimeout(t); }, [aviso]);

  const g = (giras || []).find((x) => x.id === sel);
  const ativos = lista.filter((s) => s.status !== "cancel" && s.status !== "recusado");
  const mostrados = useMemo(() => {
    const b = busca.trim().toLowerCase(), bd = busca.replace(/\D/g, "");
    return lista.filter((s) => (filtro === "todos" ? s.status !== "cancel" && s.status !== "recusado" : filtro === "chegou" ? !!s.checked_in_at : filtro === "cancel" ? s.status === "cancel" : s.status === filtro)
      && (!b || s.name.toLowerCase().includes(b) || (bd.length >= 3 && s.phone.includes(bd))));
  }, [lista, busca, filtro]);
  const subiram = lista.filter((s) => s.status === "ok" && s.promoted_at);

  const checkin = async (s) => {
    const on = !s.checked_in_at;
    setLista((l) => l.map((x) => x.id === s.id ? { ...x, checked_in_at: on ? new Date().toISOString() : null } : x));
    const { error } = await supabase.rpc("admin_community_checkin", { p_id: s.id, p_on: on });
    if (error) { setAviso(err(error)); carregarLista(sel); }
  };
  const setStatus = async (s, st, texto) => {
    const { error } = await supabase.rpc("admin_community_set_status", { p_id: s.id, p_status: st });
    if (error) return setAviso(err(error));
    setAviso(texto); await carregarLista(sel); carregarGiras(true);
    if (st === "ok" && s.status === "wait") setMsgPara({ id: s.id, tipo: "vaga" });
  };
  const baixar = () => {
    const linhas = [["Nº", "Nome", "WhatsApp", "Idade", "Situação", "Chegou", "Origem"]];
    const nomeSt = { ok: "Confirmado", wait: "Lista de espera", pend: "Aguardando", cancel: "Cancelado", recusado: "Recusado" };
    lista.filter((s) => s.status !== "cancel").forEach((s) => linhas.push([s.number, s.name, telBonito(s.phone), s.age ?? "", nomeSt[s.status] + (s.wait_pos ? " nº " + s.wait_pos : ""), s.checked_in_at ? "Sim" : "", s.source === "forms" ? "Forms" : s.source === "gestao" ? "Gestão" : "App"]));
    const csv = "﻿" + linhas.map((l) => l.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "inscritos-" + (g?.name || "gira").toLowerCase().replace(/[^a-z0-9]+/gi, "-") + "-" + dm(g?.starts_at || Date.now()).replace("/", "-") + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
  };
  const copiarLink = async () => { try { await navigator.clipboard.writeText(linkGira(g)); setAviso("Link copiado!"); } catch (e) { setAviso(linkGira(g)); } };

  if (giras === null) return <div className="hm-skeleton" style={{ marginTop: 14 }} />;
  return <div className="gc">
    <div className="row between gira-admin-header">
      <div><span className="eyebrow">COMUNIDADE</span><h2>Inscrições</h2><p className="muted">Giras abertas a quem é de fora, lista da porta e lista de espera.</p></div>
      <button className="btn primary" onClick={() => setConfig(true)}>Abrir uma gira</button>
    </div>
    {aviso && <div className="toast">{aviso}</div>}
    {config && <ConfigGira giraAtual={g} onClose={() => setConfig(false)} onSaved={async (id) => { setConfig(false); await carregarGiras(true); setSel(id); setAviso("Gira atualizada."); }} />}
    {!giras.length ? <div className="card"><b>Nenhuma gira aberta para a comunidade ainda.</b><p className="muted small">Toque em "Abrir uma gira", escolha a gira e diga quantas vagas são para quem é de fora.</p></div> : <>
      <div className="field"><label htmlFor="gc-gira">Gira</label>
        <select className="select" id="gc-gira" value={sel || ""} onChange={(e) => setSel(e.target.value)}>{giras.map((x) => <option key={x.id} value={x.id}>{dm(x.starts_at)} · {x.name}</option>)}</select></div>
      {g && <>
        <div className="gc-info">
          <span className="gc-acesso">{ACESSO[g.access]}{g.access === "assist" && !g.is_public ? " · só por link" : ""}</span>
          <button type="button" className="btn" onClick={() => setConfig(true)}>Ajustar</button>
        </div>
        <div className="gc-stats">
          <div><b>{g.taken}<small>/{g.slots}</small></b><span>inscritos</span></div>
          <div><b>{Math.max(0, g.slots - g.taken)}</b><span>vagas livres</span></div>
          <div><b>{g.waiting}</b><span>em espera</span></div>
          <div><b>{lista.filter((s) => s.checked_in_at).length}</b><span>chegaram</span></div>
        </div>
        {g.access !== "casa" && <div className="gc-link"><span>{linkGira(g)}</span><button type="button" className="btn" onClick={copiarLink}>Copiar link</button></div>}
        {subiram.length > 0 && <div className="gc-subiu"><b>🔔 {subiram.length === 1 ? "1 pessoa subiu" : subiram.length + " pessoas subiram"} da lista de espera</b><span>Avise pelo WhatsApp que a vaga é dela: {subiram.map((s) => primeiro(s.name)).join(", ")}.</span></div>}
        <div className="field"><label htmlFor="gc-busca">Buscar na porta</label><input id="gc-busca" className="input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou WhatsApp" autoComplete="off" /></div>
        <div className="gc-filtros">{[["todos", "Todos"], ["ok", "Confirmados"], ["wait", "Lista de espera"], ["chegou", "Chegaram"], ["cancel", "Cancelados"]].map(([k, l]) => <button type="button" key={k} aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{l}</button>)}</div>
        <div className="gc-lista">{carregando && !lista.length ? <div className="gc-p muted">Carregando…</div> : !mostrados.length ? <div className="gc-p muted">Ninguém por aqui com esse filtro.</div> : mostrados.map((s) => {
          const tipo = (msgPara?.id === s.id && msgPara.tipo) || (s.promoted_at && s.status === "ok" ? "vaga" : "lembrete");
          const wa = s.phone && whatsappLink(s.phone, msg(tipo, s, g));
          return <div className={"gc-p" + (s.checked_in_at ? " chegou" : "")} key={s.id}>
            <div className="gc-p-txt">
              <b>{s.name}</b>
              <small>#{String(s.number).padStart(3, "0")}{s.phone ? " · " + telBonito(s.phone) : ""}{s.age ? " · " + s.age + " anos" : ""}{s.source === "forms" ? " · Forms" : s.source === "gestao" ? " · incluído na gestão" : ""}</small>
              <div className="gc-p-acoes">
                {s.status === "ok" && <span className={"gc-chip ok"}>{s.promoted_at ? "Subiu da espera" : "Confirmado"}</span>}
                {s.status === "wait" && <span className="gc-chip wait">Espera nº {s.wait_pos}</span>}
                {s.status === "cancel" && <span className="gc-chip cancel">Cancelado</span>}
                {s.status === "wait" && <button type="button" className="btn sm" onClick={() => setStatus(s, "ok", "Vaga dada para " + primeiro(s.name) + ". Avise no WhatsApp.")}>Dar a vaga</button>}
                {wa && s.status !== "cancel" && <a className="btn sm gc-wa" href={wa} target="_blank" rel="noopener" onClick={() => setMsgPara(null)}>{tipo === "vaga" ? "Avisar da vaga" : "WhatsApp"}</a>}
                {s.status !== "cancel" && <button type="button" className="btn sm ghost-x" onClick={() => setStatus(s, "cancel", "Inscrição cancelada.")}>Cancelar</button>}
                {s.status === "cancel" && <button type="button" className="btn sm" onClick={() => setStatus(s, "ok", "Inscrição reativada.")}>Reativar</button>}
              </div>
            </div>
            {s.status !== "wait" && s.status !== "cancel" && <button type="button" className="gc-chegou" aria-pressed={!!s.checked_in_at} onClick={() => checkin(s)}>{s.checked_in_at ? "✓ Chegou" : "Chegou?"}</button>}
          </div>;
        })}</div>
        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          <button type="button" className="btn" onClick={() => setNovo(!novo)}>+ Incluir pessoa</button>
          <button type="button" className="btn" onClick={baixar}>⬇ Baixar lista (Excel)</button>
        </div>
        {novo && <IncluirPessoa gira={g} onDone={async (nome) => { setNovo(false); setAviso(nome + " incluído(a)."); await carregarLista(sel); carregarGiras(true); }} />}
        <p className="muted small" style={{ marginTop: 10 }}>Na porta: busque o nome e toque em "Chegou?". Quem incluir aqui entra como confirmado, mesmo com a gira lotada.</p>
      </>}
    </>}
  </div>;
}

function IncluirPessoa({ gira, onDone }) {
  const [f, setF] = useState({ nome: "", tel: "", idade: "" }), [e, setE] = useState("");
  const salvar = async (ev) => {
    ev.preventDefault();
    if (f.nome.trim().length < 3) return setE("Informe o nome.");
    const { error } = await supabase.rpc("admin_community_add", { p_gira: gira.id, p_name: f.nome, p_phone: f.tel, p_age: Number(f.idade) || null, p_status: "ok", p_source: "gestao" });
    if (error) return setE(err(error));
    onDone(f.nome.trim().split(" ")[0]);
  };
  return <form className="card" onSubmit={salvar} style={{ marginTop: 10 }}>
    <div className="field"><label htmlFor="gc-n">Nome</label><input id="gc-n" className="input" value={f.nome} onChange={(x) => setF({ ...f, nome: x.target.value })} /></div>
    <div className="grid"><div className="field"><label htmlFor="gc-t">WhatsApp</label><input id="gc-t" className="input" inputMode="tel" value={f.tel} onChange={(x) => setF({ ...f, tel: maskTel(x.target.value) })} /></div>
    <div className="field"><label htmlFor="gc-i">Idade</label><input id="gc-i" className="input" inputMode="numeric" value={f.idade} onChange={(x) => setF({ ...f, idade: x.target.value.replace(/\D/g, "").slice(0, 3) })} /></div></div>
    {e && <div className="gw-warning">{e}</div>}
    <button className="btn primary">Incluir</button>
  </form>;
}

// Abrir uma gira para a comunidade (a mesma informação vale para o cadastro da gira)
function ConfigGira({ giraAtual, onClose, onSaved }) {
  const [giras, setGiras] = useState([]), [id, setId] = useState(giraAtual?.id || ""), [f, setF] = useState(null), [e, setE] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.from("giras").select("id,name,starts_at,status,community_access,community_slots,community_public,community_waitlist,community_opens_at").gte("starts_at", new Date(Date.now() - 12 * 3600e3).toISOString()).order("starts_at").then(({ data }) => {
      setGiras(data || []);
      if (!id && data?.length) setId(data[0].id);
    });
  }, []);
  useEffect(() => {
    const x = giras.find((y) => y.id === id);
    if (x) setF({ access: x.community_access || "casa", slots: x.community_slots || "", pub: x.community_public !== false, wait: x.community_waitlist !== false, opens: x.community_opens_at ? new Date(new Date(x.community_opens_at).getTime() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : "" });
  }, [id, giras]);
  const salvar = async () => {
    if (!f) return;
    if (f.access !== "casa" && !(Number(f.slots) > 0)) return setE("Diga quantas vagas são para quem é de fora.");
    setBusy(true);
    const { error } = await supabase.rpc("editor_set_gira_community", { p_gira: id, p_access: f.access, p_slots: f.access === "casa" ? 0 : Number(f.slots), p_public: f.pub, p_waitlist: f.wait, p_opens_at: f.opens ? new Date(f.opens).toISOString() : null });
    setBusy(false);
    if (error) return setE(err(error));
    onSaved(id);
  };
  const op = (k, t, sub) => <label className={"bl-toggle" + (f?.access === k ? " is-on" : "")}><input type="radio" name="gc-acesso" checked={f?.access === k} onChange={() => setF({ ...f, access: k })} /><span><b>{t}</b><small>{sub}</small></span></label>;
  return <div className="modal-back" onClick={onClose}><div className="modal" onClick={(x) => x.stopPropagation()}>
    <div className="row between"><h3 style={{ margin: 0 }}>Gira para a comunidade</h3><button className="btn" onClick={onClose}>Fechar</button></div>
    <div className="field"><label htmlFor="gc-cg">Gira</label><select id="gc-cg" className="select" value={id} onChange={(x) => setId(x.target.value)}>{giras.map((x) => <option key={x.id} value={x.id}>{dm(x.starts_at)} · {x.name}{x.status === "draft" ? " (rascunho)" : ""}</option>)}</select></div>
    {f && <div className="bl-toggles" style={{ display: "grid", gap: 8 }}>
      <b>Quem pode se inscrever de fora?</b>
      {op("casa", "🏠 Só filhos da casa", "Gira fechada. Não aparece para a comunidade.")}
      {op("aberta", "🌍 Aberta à comunidade", "Aparece na página pública com as vagas que vocês definirem.")}
      {op("assist", "🤝 Fechada, com vagas de assistência", "Gira interna com poucas vagas de fora.")}
      {f.access !== "casa" && <>
        <div className="grid"><div className="field"><label htmlFor="gc-vagas">Vagas para quem é de fora</label><input id="gc-vagas" className="input" inputMode="numeric" value={f.slots} onChange={(x) => setF({ ...f, slots: x.target.value.replace(/\D/g, "").slice(0, 4) })} /></div>
        <div className="field"><label htmlFor="gc-abre">Inscrições abrem (opcional)</label><input id="gc-abre" className="input" type="datetime-local" value={f.opens} onChange={(x) => setF({ ...f, opens: x.target.value })} /></div></div>
        {f.access === "assist" && <>{[[true, "Na página pública", "Qualquer pessoa vê e se inscreve até lotar."], [false, "Só por link", "Não aparece na lista. Vocês mandam o link para quem quiserem."]].map(([v, t, sub]) => <label key={String(v)} className={"bl-toggle" + (f.pub === v ? " is-on" : "")}><input type="radio" name="gc-pub" checked={f.pub === v} onChange={() => setF({ ...f, pub: v })} /><span><b>{t}</b><small>{sub}</small></span></label>)}</>}
        <label className={"bl-toggle" + (f.wait ? " is-on" : "")}><input type="checkbox" checked={f.wait} onChange={(x) => setF({ ...f, wait: x.target.checked })} /><span><b>Lista de espera</b><small>Quando lotar, novas pessoas entram na espera.</small></span></label>
        <p className="muted small">Prazo para desistir: 48 horas antes da gira. Só aparece para a comunidade se a gira estiver publicada.</p>
      </>}
    </div>}
    {e && <div className="gw-warning">{e}</div>}
    <button className="btn primary" style={{ width: "100%", marginTop: 12 }} disabled={busy || !f} onClick={salvar}>{busy ? "Salvando…" : "Salvar"}</button>
  </div></div>;
}
