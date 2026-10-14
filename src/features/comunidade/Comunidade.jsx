// Página aberta à comunidade (sem login): inscrição nas giras abertas.
// Endereço: …/terreiro-pai-benedito-do-congo/?comunidade  (ou ?comunidade=<id da gira> para uma gira só por link)
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase.js";

const LOGO = import.meta.env.BASE_URL + "marca-casa.png";
const CHAVE = "tpbc-inscricoes";
const TIPOS = { gira: "Gira", quintal: "Quintal Ancestral", evento: "Evento", desenvolvimento: "Gira", interna: "Gira" };

const lerTokens = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || "[]"); } catch (e) { return []; } };
const guardarToken = (t) => { try { const l = lerTokens(); if (!l.includes(t)) localStorage.setItem(CHAVE, JSON.stringify([...l, t])); } catch (e) { /* sem armazenamento: segue sem lembrar */ } };
const dig = (t) => String(t || "").replace(/\D/g, "");
export const maskTel = (v) => { let x = dig(v); if (x.length > 11 && x.startsWith("55")) x = x.slice(2); x = x.slice(0, 11); if (x.length <= 2) return x; if (x.length <= 7) return "(" + x.slice(0, 2) + ") " + x.slice(2); return "(" + x.slice(0, 2) + ") " + x.slice(2, 7) + "-" + x.slice(7); };
const msgErro = (e) => String(e?.message || e || "Algo deu errado. Tente de novo.").replace(/^.*?ERROR:\s*/i, "");
const dataLonga = (q) => { const d = new Date(q); return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) + " · " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); };
const hora = (q) => new Date(q).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const diaMes = (q) => { const d = new Date(q); return { dia: String(d.getDate()).padStart(2, "0"), mes: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase() }; };
const prazoTxt = (q) => { const d = new Date(new Date(q).getTime() - 48 * 3600e3); return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }) + ", " + hora(d); };

function Fase({ g }) {
  const pct = g.fill_pct || 0, cheio = g.is_full;
  const fase = cheio ? ["cheio", g.waitlist ? "Lotado · lista de espera" : "Lotado"] : pct >= 85 ? ["quase", "Últimas vagas"] : pct >= 50 ? ["", "Enchendo"] : ["", "Vagas abertas"];
  return <div className="cm-vagas">
    <div className={"cm-bar " + fase[0]} role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={pct} aria-valuetext={fase[1]} aria-label="Quanto da gira já está preenchido"><i style={{ width: Math.max(6, pct) + "%" }} /></div>
    <div className="cm-vagas-txt"><span>Inscrições</span><b className={fase[0]}>{fase[1]}</b></div>
  </div>;
}

function Data({ q, cor }) {
  const dm = diaMes(q);
  return <div className="cm-date" style={{ "--cor": cor || "#3f6a3a" }}><b>{dm.dia}</b><small>{dm.mes}</small></div>;
}

function Topo({ titulo, voltar }) {
  return <div className="cm-hdr">{voltar && <button type="button" className="cm-back" aria-label="Voltar" onClick={voltar}>←</button>}<h1>{titulo}</h1></div>;
}

export function Comunidade() {
  const soGira = new URLSearchParams(window.location.search).get("comunidade") || null;
  const [giras, setGiras] = useState(null), [erro, setErro] = useState("");
  const [tela, setTela] = useState("inicio"), [gira, setGira] = useState(null);
  const [form, setForm] = useState({ nome: "", tel: "", idade: "" }), [ferr, setFerr] = useState({}), [aceitou, setAceitou] = useState(false), [busy, setBusy] = useState(false);
  const [minhas, setMinhas] = useState([]), [ver, setVer] = useState(null), [cancelando, setCancelando] = useState(false), [toast, setToast] = useState("");
  const [cons, setCons] = useState(""), [consRes, setConsRes] = useState(null);

  const carregar = async () => {
    const id = soGira && soGira.length > 30 ? soGira : null;
    const { data, error } = await supabase.rpc("public_giras", id ? { p_gira: id } : {});
    if (error) { setErro("Não conseguimos carregar as giras agora. Tente de novo em instantes."); setGiras([]); }
    else setGiras(data || []);
    const tokens = lerTokens();
    if (tokens.length) { const { data: m } = await supabase.rpc("public_my_signups", { p_tokens: tokens }); setMinhas(m || []); }
  };
  useEffect(() => { document.title = "Inscrições · Terreiro Pai Benedito do Congo"; carregar(); }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2600); return () => clearTimeout(t); }, [toast]);
  const ir = (t) => { setTela(t); window.scrollTo({ top: 0 }); };

  const abrir = (g) => { setGira(g); setFerr({}); setAceitou(false); ir("dados"); };
  const continuar = (e) => {
    e.preventDefault();
    const er = {};
    const nome = form.nome.trim().replace(/\s+/g, " ");
    if (nome.split(" ").length < 2) er.nome = "Escreva nome e sobrenome.";
    if (dig(form.tel).length < 10) er.tel = "Confira o número, com DDD.";
    const idade = Number(form.idade);
    if (!(idade > 0 && idade < 120)) er.idade = "Informe sua idade.";
    setFerr(er);
    if (!Object.keys(er).length) { setForm({ ...form, nome }); ir("regras"); }
  };
  const confirmar = async () => {
    if (busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("public_signup", { p_gira: gira.id, p_name: form.nome, p_phone: form.tel, p_age: Number(form.idade) });
    setBusy(false);
    if (error) { setFerr({ geral: msgErro(error) }); return; }
    const r = Array.isArray(data) ? data[0] : data;
    guardarToken(r.token);
    const { data: m } = await supabase.rpc("public_my_signups", { p_tokens: lerTokens() });
    setMinhas(m || []);
    setVer(r.token); setCancelando(false);
    setToast(r.status === "wait" ? "Você entrou na lista de espera" : "Inscrição confirmada!");
    ir("ticket");
    supabase.rpc("public_giras", {}).then(({ data: g }) => g && setGiras(g));
  };
  const cancelar = async (token) => {
    setBusy(true);
    const { error } = await supabase.rpc("public_cancel", { p_token: token });
    setBusy(false); setCancelando(false);
    if (error) { setToast(msgErro(error)); return; }
    const { data: m } = await supabase.rpc("public_my_signups", { p_tokens: lerTokens() });
    setMinhas(m || []); setToast("Inscrição cancelada. Obrigado por liberar a vaga.");
  };
  const consultar = async (e) => {
    e.preventDefault();
    const { data } = await supabase.rpc("public_lookup", { p_phone: cons });
    setConsRes(data || []);
  };

  const ativas = minhas.filter((m) => m.status !== "cancel" && new Date(m.starts_at) > new Date(Date.now() - 6 * 3600e3));
  const statusTxt = (m) => m.status === "ok" ? "✅ Inscrição confirmada" : m.status === "pend" ? "⏳ Aguardando confirmação" : m.status === "wait" ? "🕒 Lista de espera nº " + (m.wait_pos || "") : m.status === "cancel" ? "↩️ Cancelada" : "Recusada";

  let corpo;
  if (tela === "dados" && gira) {
    corpo = <>
      <Topo titulo="Inscrição" voltar={() => ir("inicio")} />
      <div className="cm-gira">
        <div className="cm-gira-top"><Data q={gira.starts_at} cor={gira.cover_color} /><div className="cm-gira-txt"><div className="cm-chips"><span className="cm-chip">{TIPOS[gira.activity_type] || "Gira"}</span>{gira.access === "assist" && <span className="cm-chip wait">Poucas vagas de assistência</span>}<span className="cm-chip ok">Gratuita</span></div><h3>{gira.name}</h3><small>{dataLonga(gira.starts_at)}</small></div></div>
        {gira.access === "assist" && <div className="cm-status wait"><span className="em">🤝</span><span>Gira interna da casa<small>São poucas vagas de assistência. Chegue no horário e aguarde ser chamado(a) para o passe.</small></span></div>}
        <Fase g={gira} />
      </div>
      <div className="cm-steps"><span>1 Seus dados</span><i className="on" /><i /></div>
      <form className="cm-card" onSubmit={continuar} noValidate>
        {gira.is_full && <div className="cm-status wait"><span className="em">🕒</span><span>Esta gira está lotada<small>Você entra na lista de espera. Se alguém desistir, a vaga passa para você e a casa avisa pelo WhatsApp.</small></span></div>}
        <div className="cm-field"><label htmlFor="cm-nome">Nome completo</label><input className="cm-input" id="cm-nome" autoComplete="name" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Como você é chamado(a)" />{ferr.nome && <span className="cm-err">{ferr.nome}</span>}</div>
        <div className="cm-field"><label htmlFor="cm-tel">WhatsApp</label><input className="cm-input" id="cm-tel" inputMode="tel" autoComplete="tel" value={form.tel} onChange={(e) => setForm({ ...form, tel: maskTel(e.target.value) })} placeholder="(11) 98765-4321" /><small>É por ele que avisamos você sobre a gira.</small>{ferr.tel && <span className="cm-err">{ferr.tel}</span>}</div>
        <div className="cm-field"><label htmlFor="cm-idade">Idade</label><input className="cm-input" id="cm-idade" inputMode="numeric" style={{ maxWidth: 140 }} value={form.idade} onChange={(e) => setForm({ ...form, idade: e.target.value.replace(/\D/g, "").slice(0, 3) })} placeholder="Ex.: 32" />{ferr.idade && <span className="cm-err">{ferr.idade}</span>}{Number(form.idade) > 0 && Number(form.idade) < 18 && <small className="cm-aviso">Menores de 18 anos vêm com um responsável, que também faz a inscrição.</small>}</div>
        <button className="cm-btn primary" type="submit">Continuar</button>
      </form>
    </>;
  } else if (tela === "regras" && gira) {
    corpo = <>
      <Topo titulo="Antes de vir" voltar={() => ir("dados")} />
      <div className="cm-steps"><span>2 Orientações</span><i className="on" /><i className="on" /></div>
      <div className="cm-card">
        <p>Para a gira acontecer bem para todo mundo, leia com atenção:</p>
        <div className="cm-rule"><span className="em">👕</span><div><b>Vista-se com respeito</b><p>Roupa clara, confortável e discreta.</p><div className="cm-roupa"><div className="sim"><b>✓ Pode</b>Calça, saia longa, camiseta, roupa clara</div><div className="nao"><b>✕ Evite</b>Decote, roupa curta ou justa</div></div></div></div>
        <div className="cm-rule"><span className="em">🙋🏾</span><div><b>A inscrição é individual</b><p>Cada pessoa faz a sua. Não traga convidados que não se inscreveram.</p></div></div>
        <div className="cm-rule"><span className="em">🚪</span><div><b>Sem inscrição, não entra</b><p>Nos preparamos para receber um número certo de pessoas. Por isso, só entra quem fez a inscrição. Pedimos compreensão na porta.</p></div></div>
        <div className="cm-rule"><span className="em">⏰</span><div><b>Chegue no horário</b><p>A gira começa às {hora(gira.starts_at)}. Chegar atrasado pode fazer você perder o atendimento: se as entidades já tiverem encerrado os passes, não vamos conseguir te atender.</p></div></div>
        <div className="cm-rule"><span className="em">📅</span><div><b>Não vai poder vir?</b><p>Cancele até 48 horas antes (até {prazoTxt(gira.starts_at)}) para liberar a vaga para outra pessoa.</p></div></div>
        <label className={"cm-check" + (aceitou ? " on" : "")} htmlFor="cm-aceito"><input type="checkbox" id="cm-aceito" checked={aceitou} onChange={(e) => setAceitou(e.target.checked)} /><span><b>Li e vou seguir as orientações</b><br /><small>Obrigado por cuidar da casa com a gente.</small></span></label>
        {ferr.geral && <div className="cm-status cancel"><span className="em">⚠️</span><span>{ferr.geral}</span></div>}
        <button type="button" className="cm-btn primary" disabled={!aceitou || busy} onClick={confirmar}>{busy ? "Enviando…" : gira.is_full ? "Entrar na lista de espera" : "Confirmar minha inscrição"}</button>
      </div>
    </>;
  } else if (tela === "ticket") {
    const m = minhas.find((x) => x.token === ver);
    corpo = m ? <>
      <Topo titulo="Minha inscrição" voltar={() => ir("inicio")} />
      <div className="cm-ticket">
        <div className="cm-ticket-top"><span className="cm-eyebrow">Terreiro Pai Benedito do Congo</span><h2>{m.gira_name}</h2><span>{dataLonga(m.starts_at)}</span></div>
        <div className="cm-cut" />
        <div className="cm-ticket-body">
          <div><small className="cm-eyebrow muted">Inscrito(a)</small><div className="cm-ticket-name">{m.name}</div></div>
          <div className="cm-kv"><div><small>Nº</small><b>#{String(m.number).padStart(3, "0")}</b></div><div><small>Idade</small><b>{m.age || "—"}</b></div><div><small>Pessoas</small><b>1</b></div></div>
          {m.status === "ok" && <div className="cm-status ok"><span className="em">✅</span><span>Inscrição confirmada<small>Sua vaga está garantida.</small></span></div>}
          {m.status === "pend" && <div className="cm-status pend"><span className="em">⏳</span><span>Aguardando confirmação<small>Avisamos no WhatsApp assim que conferirmos.</small></span></div>}
          {m.status === "wait" && <div className="cm-status wait"><span className="em">🕒</span><span>Lista de espera · nº {m.wait_pos}<small>Se abrir uma vaga, a casa avisa você pelo WhatsApp.</small></span></div>}
          {m.status === "cancel" && <div className="cm-status cancel"><span className="em">↩️</span><span>Inscrição cancelada<small>Obrigado por liberar a vaga.</small></span></div>}
          {m.status !== "cancel" && <div className="cm-lembra"><b>Para o dia:</b><span>👕 Roupa clara e discreta (evite decote, roupa curta ou justa)</span><span>⏰ Chegue no horário para não perder o atendimento</span><span>🙋🏾 Só entra quem está inscrito</span><span>📱 Mostre esta tela na entrada</span></div>}
        </div>
      </div>
      {m.status !== "cancel" && (cancelando ? <div className="cm-cancel"><b>Cancelar sua inscrição?</b><span>A vaga vai para a próxima pessoa da lista. Isso não pode ser desfeito.</span><div className="cm-row"><button type="button" className="cm-btn" onClick={() => setCancelando(false)}>Manter</button><button type="button" className="cm-btn danger" disabled={busy} onClick={() => cancelar(m.token)}>Sim, cancelar</button></div></div>
        : new Date() < new Date(m.cancel_until) ? <><button type="button" className="cm-btn ghost" onClick={() => setCancelando(true)}>Não vou mais poder ir</button><p className="cm-nota">Você pode cancelar até {new Date(m.cancel_until).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às {hora(m.cancel_until)} (48 horas antes).</p></>
        : <p className="cm-nota">O prazo para cancelar terminou (48 horas antes). Se tiver um imprevisto, fale com a casa pelo WhatsApp.</p>)}
      <button type="button" className="cm-btn" onClick={() => ir("inicio")}>Ver outras giras</button>
    </> : <><Topo titulo="Minha inscrição" voltar={() => ir("inicio")} /><p className="cm-nota">Inscrição não encontrada neste aparelho.</p></>;
  } else if (tela === "primeira") {
    corpo = <>
      <Topo titulo="Primeira vez no terreiro?" voltar={() => ir("inicio")} />
      <div className="cm-card">
        <p>Que bom ter você com a gente. Aqui vai o básico para você chegar tranquilo(a):</p>
        <div className="cm-rule"><span className="em">🥁</span><div><b>Como é uma gira</b><p>É o nosso encontro com os Orixás, as entidades e a ancestralidade, com os atabaques, os cantos e o passe. Você participa da assistência.</p></div></div>
        <div className="cm-rule"><span className="em">🙏🏾</span><div><b>O passe</b><p>No momento certo, os cambones chamam as pessoas da assistência para tomar passe com as entidades. É só aguardar ser chamado(a).</p></div></div>
        <div className="cm-rule"><span className="em">👕</span><div><b>O que vestir</b><p>Roupa clara, confortável e discreta. Evite decotes, roupas curtas e justas.</p></div></div>
        <div className="cm-rule"><span className="em">🤫</span><div><b>Durante a gira</b><p>Silêncio e respeito no salão. Celular no silencioso e sem fotos ou vídeos.</p></div></div>
        <div className="cm-rule"><span className="em">🎟️</span><div><b>Faça sua inscrição</b><p>As vagas são limitadas e a inscrição é individual. Sem inscrição, não conseguimos receber.</p></div></div>
        <button type="button" className="cm-btn primary" onClick={() => ir("inicio")}>Ver as próximas giras</button>
      </div>
    </>;
  } else if (tela === "consulta") {
    corpo = <>
      <Topo titulo="Já me inscrevi" voltar={() => ir("inicio")} />
      <form className="cm-card" onSubmit={consultar} noValidate>
        <div className="cm-field"><label htmlFor="cm-cons">Seu WhatsApp</label><input className="cm-input" id="cm-cons" inputMode="tel" value={cons} onChange={(e) => setCons(maskTel(e.target.value))} placeholder="(11) 98765-4321" /><small>Mostramos as inscrições feitas com este número.</small></div>
        <button className="cm-btn primary" type="submit">Consultar</button>
        {consRes && (consRes.length ? consRes.map((r, k) => <div className="cm-tile" key={k}><span className="ic">🎟️</span><span><b>{r.gira_name}</b><small>{r.first_name} · #{String(r.number).padStart(3, "0")} · {statusTxt(r)}</small></span></div>)
          : <p className="cm-nota">Não achamos inscrição com esse número. Confira os dígitos ou faça sua inscrição.</p>)}
      </form>
    </>;
  } else {
    corpo = <>
      <img className="cm-logo" src={LOGO} alt="Terreiro de Umbanda Pai Benedito do Congo" />
      <div className="cm-hero"><span className="cm-eyebrow">Giras abertas à comunidade</span><h2>Venha girar com a gente</h2><p>Escolha a gira, faça sua inscrição em um minuto e guarde a sua confirmação.</p></div>
      {ativas.length > 0 && <section className="cm-sec"><h2 className="cm-sec-h">Minhas inscrições</h2>{ativas.map((m) => <button type="button" className="cm-tile" key={m.token} onClick={() => { setVer(m.token); setCancelando(false); ir("ticket"); }}><span className="ic">🎟️</span><span><b>{m.gira_name}</b><small>{statusTxt(m)}</small></span></button>)}</section>}
      <section className="cm-sec"><h2 className="cm-sec-h">Próximas giras</h2>
        {giras === null ? <div className="cm-skel" /> : erro ? <p className="cm-nota">{erro}</p> : !giras.length ? <div className="cm-card"><p>No momento não há giras com inscrição aberta. Acompanhe o nosso Instagram para saber das próximas. 🌿</p></div>
          : giras.map((g) => <div className="cm-gira" key={g.id}>
            <div className="cm-gira-top"><Data q={g.starts_at} cor={g.cover_color} /><div className="cm-gira-txt"><div className="cm-chips"><span className="cm-chip">{TIPOS[g.activity_type] || "Gira"}</span>{g.access === "assist" && <span className="cm-chip wait">Poucas vagas de assistência</span>}<span className="cm-chip ok">Gratuita</span></div><h3>{g.name}</h3><small>{dataLonga(g.starts_at)}</small></div></div>
            <Fase g={g} />
            {g.opens_at && new Date(g.opens_at) > new Date() ? <p className="cm-nota">Inscrições abrem em {new Date(g.opens_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às {hora(g.opens_at)}.</p>
              : g.is_full && !g.waitlist ? <button type="button" className="cm-btn" disabled>Lotado</button>
              : <button type="button" className={"cm-btn" + (g.is_full ? "" : " primary")} onClick={() => abrir(g)}>{g.is_full ? "Entrar na lista de espera" : "Quero participar"}</button>}
          </div>)}
      </section>
      <section className="cm-sec">
        <button type="button" className="cm-tile" onClick={() => ir("primeira")}><span className="ic">🌿</span><span><b>Primeira vez no terreiro?</b><small>Como é uma gira, o que vestir e como chegar.</small></span></button>
        <button type="button" className="cm-tile" onClick={() => ir("consulta")}><span className="ic">🔎</span><span><b>Já me inscrevi</b><small>Consulte sua inscrição pelo WhatsApp.</small></span></button>
      </section>
      <p className="cm-rodape">Terreiro de Umbanda Pai Benedito do Congo</p>
    </>;
  }
  return <div className="cm"><main className="cm-app">{corpo}</main>{toast && <div className="cm-toast" role="status">{toast}</div>}</div>;
}
