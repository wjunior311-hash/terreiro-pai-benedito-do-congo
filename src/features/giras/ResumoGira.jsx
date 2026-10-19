// Resumo administrativo de uma gira: pendências, presença, pagamentos, lista de acesso, o que levar, turnos e leitura.
import { useEffect, useState } from "react";
import { supabase, APP_URL } from "../../lib/supabase.js";
import { err, money, whatsappLink } from "../../lib/helpers.js";
import { OrixaIcon } from "../../orixaSymbols.jsx";
import { AcessoBloco } from "./ListaAcesso.jsx";

const dataBR = (d) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const hora = (t) => (t || "").slice(0, 5).replace(":00", "h").replace(":", "h");
const primeiro = (n) => (n || "").split(" ")[0];
const slug = (s) => (s || "evento").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");

function baixarCsv(nome, linhas) {
  const csv = "﻿" + linhas.map((l) => l.map((c) => '"' + String(c ?? "").replace(/"/g, '""') + '"').join(";")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
}

// O que falta para cada pessoa que vai
export function pendenciasDe(p, r, regraNova) {
  const g = r.gira, out = [];
  if (g.has_charge && p.pay === "open") out.push("pagar");
  if (g.collect_docs && p.pay === "paid" && !p.doc) out.push("enviar RG");
  if (g.bring_per_person > 0 && r.items.length && p.items < g.bring_per_person) out.push("escolher " + (g.bring_per_person - p.items) + (g.bring_per_person - p.items === 1 ? " item" : " itens"));
  if (g.needs_ack && !p.leu) out.push("ler as informações");
  if (r.turns.length && !p.turns.length && !(regraNova && p.is_pai)) out.push("escolher turno");
  return out;
}

function Secao({ titulo, n, aberta, alerta, children }) {
  return <details className={"rg-sec" + (alerta ? " is-alerta" : "")} open={aberta}>
    <summary><span>{titulo}</span>{n !== undefined && <b>{n}</b>}</summary>
    <div className="rg-corpo">{children}</div>
  </details>;
}

function Pessoa({ p, extra, wa }) {
  return <li><OrixaIcon name={p.orixa_symbol} size={20} /><span className="rg-nome">{p.name}{extra && <small>{extra}</small>}</span>{wa && p.phone && <a className="cw-wa" href={whatsappLink(p.phone, wa)} target="_blank" rel="noreferrer">WhatsApp</a>}</li>;
}

export function GestaoResumoGira() {
  const [giras, setGiras] = useState(null), [sel, setSel] = useState(""), [r, setR] = useState(null), [msg, setMsg] = useState(""), [copiado, setCopiado] = useState(false);
  useEffect(() => {
    supabase.rpc("admin_resumo_giras").then(({ data, error }) => {
      if (error) setMsg(err(error));
      const g = Array.isArray(data) ? data : [];
      setGiras(g);
      const prox = g.find((x) => new Date(x.starts_at) > new Date(Date.now() - 6 * 36e5)) || g[g.length - 1];
      if (prox) setSel(prox.id);
    });
  }, []);
  const carregar = () => { if (!sel) return; setR(null); supabase.rpc("admin_gira_resumo", { p_gira: sel }).then(({ data, error }) => { if (error) setMsg(err(error)); else setR(data); }); };
  useEffect(carregar, [sel]);
  if (!giras) return <div className="hm-skeleton" style={{ marginTop: 14 }} />;
  if (!giras.length) return <div className="mu-empty">Nenhuma gira publicada nos próximos dias.</div>;
  const seletor = giras.length > 1 && <select className="select" value={sel} onChange={(e) => setSel(e.target.value)}>{giras.map((x) => <option key={x.id} value={x.id}>{x.name} · {dataBR(x.starts_at)}</option>)}</select>;
  if (!r) return <div className="rg">{seletor}{msg ? <div className="gw-warning">{msg}</div> : <div className="hm-skeleton" />}</div>;

  const g = r.gira, regraNova = new Date(g.starts_at) >= new Date("2026-10-19T00:00:00-03:00");
  const vao = r.people.filter((p) => p.status === "going"), naoVao = r.people.filter((p) => p.status === "not_going"), semResp = r.people.filter((p) => !p.status);
  const fechada = g.responses_until && new Date(g.responses_until) < new Date();
  const pend = vao.map((p) => ({ p, falta: pendenciasDe(p, r, regraNova) })).filter((x) => x.falta.length);
  const cobrados = r.people.filter((p) => p.pay);
  const pagos = cobrados.filter((p) => p.pay === "paid"), analise = cobrados.filter((p) => p.pay === "review"), abertos = cobrados.filter((p) => p.pay === "open");
  const soma = (l) => l.reduce((n, p) => n + Number(p.amount || 0), 0);
  const leram = vao.filter((p) => p.leu);
  const semItens = vao.filter((p) => p.items < g.bring_per_person);
  const vagasItens = r.items.reduce((n, i) => n + Math.max(i.slots - i.who.length, 0), 0);
  const semTurno = vao.filter((p) => !p.turns.length && !(regraNova && p.is_pai));
  const grupos = [];
  r.turns.forEach((t) => { const k = t.group_name || ""; let gr = grupos.find((x) => x.nome === k); if (!gr) grupos.push(gr = { nome: k, turnos: [] }); gr.turnos.push(t); });
  const ocup = (t) => t.who.filter((w) => !(regraNova && w.is_pai)).length;
  const msgWa = (p, falta) => "Axé, " + primeiro(p.name) + "! 🙏🏾 Sobre a " + g.name + " (" + dataBR(g.starts_at) + "): ainda falta você " + falta.join(", ") + ". É rapidinho pelo app: " + APP_URL;

  const textoResumo = () => {
    const L = ["*" + g.name + " · " + dataBR(g.starts_at) + "*", ""];
    L.push("✅ Vão: " + vao.length + "  ·  ❌ Não vão: " + naoVao.length + "  ·  ⏳ Sem resposta: " + semResp.length);
    if (g.has_charge) L.push("💰 Pagaram: " + pagos.length + " de " + cobrados.length + (analise.length ? " (" + analise.length + " em análise)" : "") + (r.can_money ? " · " + money(soma(pagos)) + " de " + money(soma(cobrados)) : ""));
    if (g.collect_docs) L.push("🪪 RG enviado: " + pagos.filter((p) => p.doc).length + " de " + pagos.length);
    if (g.needs_ack) L.push("📖 Leram as informações: " + leram.length + " de " + vao.length);
    if (r.items.length) {
      L.push("", "*O que vão levar*");
      r.items.forEach((i) => L.push("• " + i.name + ((i.weight || 1) > 1 ? " [vale por " + i.weight + "]" : "") + (i.portion ? " (" + i.portion + ")" : "") + " — " + i.who.length + "/" + i.slots + (i.who.length ? ": " + i.who.map(primeiro).join(", ") : "")));
    }
    if (r.turns.length) {
      L.push("", "*Turnos*");
      r.turns.forEach((t) => L.push("• " + t.label + " — " + ocup(t) + "/" + t.capacity + (t.who.length ? ": " + t.who.map((w) => primeiro(w.name)).join(", ") : "")));
      if (semTurno.length) L.push("Sem turno: " + semTurno.map((p) => primeiro(p.name)).join(", "));
    }
    if (pend.length) {
      L.push("", "*Pendências*");
      pend.forEach(({ p, falta }) => L.push("• " + p.name + ": " + falta.join(", ")));
    }
    return L.join("\n");
  };
  const copiar = async () => {
    try { await navigator.clipboard.writeText(textoResumo()); setCopiado(true); setTimeout(() => setCopiado(false), 2500); } catch (e) { setMsg("Não deu para copiar automaticamente."); }
  };
  const planilha = () => {
    const pay = { paid: "Pago", review: "Em análise", open: "Em aberto" };
    const cab = ["Nome", "Resposta"];
    if (g.has_charge) cab.push("Pagamento"), r.can_money && cab.push("Valor");
    if (g.collect_docs) cab.push("RG enviado");
    if (r.items.length) cab.push("Itens que leva");
    if (r.turns.length) cab.push("Turnos");
    if (g.needs_ack) cab.push("Leu as informações");
    cab.push("Pendências");
    const itensDe = (p) => r.items.filter((i) => i.who.includes(p.name)).map((i) => i.name).join(", ");
    const linhas = [cab];
    [...vao, ...semResp, ...naoVao].forEach((p) => {
      const l = [p.name, p.status === "going" ? "Vai" : p.status === "not_going" ? "Não vai" : "Sem resposta"];
      if (g.has_charge) l.push(pay[p.pay] || ""), r.can_money && l.push(p.amount ? String(p.amount).replace(".", ",") : "");
      if (g.collect_docs) l.push(p.pay === "paid" ? (p.doc ? "Sim" : "Não") : "");
      if (r.items.length) l.push(itensDe(p));
      if (r.turns.length) l.push(p.turns.join(", "));
      if (g.needs_ack) l.push(p.status === "going" ? (p.leu ? "Sim" : "Não") : "");
      l.push(p.status === "going" ? pendenciasDe(p, r, regraNova).join(", ") : "");
      linhas.push(l);
    });
    baixarCsv("resumo-" + slug(g.name) + ".csv", linhas);
  };

  return <div className="rg">
    {seletor}
    <div className="la-head"><span className="eyebrow">RESUMO DA GIRA</span><h3>{g.name}</h3>
      <p className="muted small">{new Date(g.starts_at).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })} · {new Date(g.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        {g.responses_until && <> · {fechada ? "respostas encerradas" : "respostas até " + dataBR(g.responses_until) + " às " + new Date(g.responses_until).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</>}</p></div>
    {msg && <div className="gw-warning">{msg}</div>}
    <div className="in-resumo">
      <div><b>{vao.length}</b><small>vão</small></div>
      {g.has_charge ? <div><b>{pagos.length}</b><small>pagaram</small></div> : <div><b>{naoVao.length}</b><small>não vão</small></div>}
      <div><b>{pend.length}</b><small>com pendência</small></div>
    </div>
    <div className="rg-acoes">
      <button className="btn primary" onClick={copiar}>{copiado ? "Copiado ✓" : "Copiar resumo p/ WhatsApp"}</button>
      <button className="btn" onClick={planilha}>Baixar planilha completa</button>
    </div>

    {pend.length > 0 && <Secao titulo="Pendências" n={pend.length} aberta alerta>
      <ul>{pend.map(({ p, falta }) => <Pessoa key={p.id} p={p} extra={"falta " + falta.join(" · ")} wa={msgWa(p, falta)} />)}</ul>
    </Secao>}

    <Secao titulo="Presença" n={vao.length + " vão"}>
      <div className="rg-chips"><span>✅ {vao.length} vão</span><span>❌ {naoVao.length} não vão</span><span>⏳ {semResp.length} sem resposta</span></div>
      {semResp.length > 0 && <><p className="rg-sub">Ainda não responderam{fechada ? " (respostas encerradas)" : ""}</p>
        <ul>{semResp.map((p) => <Pessoa key={p.id} p={p} wa={fechada ? null : "Axé, " + primeiro(p.name) + "! 🙏🏾 Você ainda não respondeu se vai na " + g.name + " (" + dataBR(g.starts_at) + "). Responde pelo app: " + APP_URL} />)}</ul></>}
      <p className="rg-sub">Vão</p>
      <ul>{vao.map((p) => <Pessoa key={p.id} p={p} extra={p.is_pai ? "pai/mãe da casa" : ""} />)}</ul>
      {naoVao.length > 0 && <><p className="rg-sub">Não vão</p><ul>{naoVao.map((p) => <Pessoa key={p.id} p={p} />)}</ul></>}
    </Secao>

    {g.has_charge && <Secao titulo="Pagamento do evento" n={pagos.length + "/" + cobrados.length}>
      <div className="rg-chips"><span>✅ {pagos.length} pagos{r.can_money ? " · " + money(soma(pagos)) : ""}</span><span>🔎 {analise.length} em análise</span><span>⏳ {abertos.length} em aberto{r.can_money ? " · " + money(soma(abertos)) : ""}</span></div>
      {r.can_money && <p className="muted small">Arrecadado {money(soma(pagos))} de {money(soma(cobrados))} esperados{g.contribution_amount ? " · " + money(g.contribution_amount) + " por pessoa" : ""}.</p>}
      {analise.length > 0 && <><p className="rg-sub">Comprovante em análise <small>(confira em Financeiro)</small></p><ul>{analise.map((p) => <Pessoa key={p.id} p={p} />)}</ul></>}
      {abertos.length > 0 && <><p className="rg-sub">Em aberto</p><ul>{abertos.map((p) => <Pessoa key={p.id} p={p} wa={"Axé, " + primeiro(p.name) + "! 🙏🏾 Falta o pagamento da " + g.name + ". Pelo app: Início → Como pagar → Já paguei pra mandar o comprovante. " + APP_URL} />)}</ul></>}
    </Secao>}

    {g.collect_docs && r.can_docs && <Secao titulo="Lista de acesso (nome + RG)" n={pagos.filter((p) => p.doc).length + "/" + pagos.length}>
      <AcessoBloco gira={g} />
    </Secao>}

    {r.items.length > 0 && <Secao titulo="O que vão levar" n={vagasItens ? vagasItens + " vagas" : "completo"}>
      {(() => {
        const cats = [];
        r.items.forEach((i) => { let c = cats.find((x) => x.nome === (i.category || "")); if (!c) cats.push(c = { nome: i.category || "", itens: [] }); c.itens.push(i); });
        return cats.map((c) => <div key={c.nome} className="rg-cat">{c.nome && <p className="rg-sub">{c.nome}</p>}
          <ul className="rg-itens">{c.itens.map((i) => <li key={i.id} className={i.who.length >= i.slots ? "is-ok" : ""}>
            <span className="rg-nome"><b>{i.name}{(i.weight || 1) > 1 && <span className="ol-peso">vale por {i.weight}</span>}</b><small>{i.portion}{i.portion ? " · " : ""}{i.who.length ? i.who.join(", ") : "ninguém ainda"}</small></span>
            <span className="rg-conta">{i.who.length}/{i.slots}</span></li>)}</ul></div>);
      })()}
      {semItens.length > 0 && <><p className="rg-sub">Ainda não escolheram {g.bring_per_person} itens <small>(combinar contribuição do almoço)</small></p>
        <ul>{semItens.map((p) => <Pessoa key={p.id} p={p} extra={p.items ? p.items + " de " + g.bring_per_person : "nenhum"} />)}</ul></>}
    </Secao>}

    {r.turns.length > 0 && <Secao titulo="Turnos" n={semTurno.length ? semTurno.length + " sem turno" : r.turns.length}>
      {grupos.map((gr) => <div key={gr.nome} className="rg-cat">{gr.nome && <p className="rg-sub">{gr.nome}</p>}
        <ul className="rg-itens">{gr.turnos.map((t) => <li key={t.id} className={ocup(t) >= t.capacity ? "is-ok" : ""}>
          <span className="rg-nome"><b>{t.label}</b><small>{t.shift_date ? dataBR(t.shift_date + "T12:00:00") + " · " : ""}{t.starts_at ? hora(t.starts_at) + (t.ends_at ? "–" + hora(t.ends_at) : "") + " · " : ""}{t.who.length ? t.who.map((w) => w.name + (regraNova && w.is_pai ? " (pai/mãe)" : "")).join(", ") : "ninguém ainda"}</small></span>
          <span className="rg-conta">{ocup(t)}/{t.capacity}</span></li>)}</ul></div>)}
      {semTurno.length > 0 && <><p className="rg-sub">Vão e estão sem turno</p><ul>{semTurno.map((p) => <Pessoa key={p.id} p={p} />)}</ul></>}
    </Secao>}

    {g.needs_ack && <Secao titulo="Leram as informações" n={leram.length + "/" + vao.length}>
      {vao.length - leram.length > 0 ? <><p className="rg-sub">Ainda não leram</p><ul>{vao.filter((p) => !p.leu).map((p) => <Pessoa key={p.id} p={p} />)}</ul></> : <p className="muted small">Todo mundo que vai já leu ✓</p>}
    </Secao>}
  </div>;
}
