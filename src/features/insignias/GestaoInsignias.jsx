// Gestão: quem já tem cada insígnia e quem ainda falta (com atalho para o WhatsApp).
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { err, whatsappLink } from "../../lib/helpers.js";
import { OrixaIcon } from "../../orixaSymbols.jsx";
import { INSIGNIAS, NIVEIS, Medalha, nomeInsignia, ICONES_EVENTO } from "./Insignias.jsx";

const ORDEM = ["antena", "regras", "cadastro", "avatar", "curioso", "parabens", "roda", "palavra", "responde", "sabedoria", "mao", "axe", "voz", "sequencia", "abertura", "cedo", "leitor", "raiz"];
const RECADO = {
  antena: "ative os avisos do app no celular (Meu espaço → Avisos no celular), assim você fica sabendo na hora das giras e recados da casa",
  regras: "leia as regras da casa no app (Conteúdos → Regras) e confirme com “Li e entendi”",
  cadastro: "complete seus dados no app (Meu espaço → Meus dados): Orixá, telefone e aniversário",
  palavra: "confirme as leituras obrigatórias no app com “Li e entendi”",
  responde: "responda no app se vai ou não às giras, assim a casa consegue se organizar",
  sabedoria: "dê uma olhada nos conteúdos da casa no app",
  mao: "escolha seu turno de atividades nas giras pelo app",
  axe: "passe no mural do app e mande axé para os irmãos",
  voz: "compartilhe no mural do app como foi a gira para você",
  avatar: "crie seu avatar no app (Meu espaço → ✎ Personalizar), ficou muito lindo",
  raiz: "preencha no app desde quando você está na casa (Meu espaço → ✎ Personalizar → Na casa desde)",
  leitor: "leia a revista Ẹ̀mí Ìlú no app até o fim, tem muita coisa bonita lá",
  roda: "faça sua primeira publicação no mural do app, a casa quer ouvir você"
};
const recado = (b) => RECADO[b] || (b.startsWith("evento:") ? "esse evento tem selo exclusivo no app! É só confirmar presença na Agenda. Vai ser lindo ter você lá" : null);

export function GestaoInsignias() {
  const [rows, setRows] = useState(null), [msg, setMsg] = useState(""), [aberta, setAberta] = useState(null);
  useEffect(() => {
    supabase.rpc("admin_badges_overview").then(async ({ data, error }) => {
      if (error) setMsg(err(error));
      const ids = [...new Set((data || []).filter((r) => r.badge.startsWith("evento:")).map((r) => r.badge.slice(7)))];
      const { data: g } = ids.length ? await supabase.from("giras").select("id,name,exclusive_badge_icon").in("id", ids) : { data: [] };
      const nm = Object.fromEntries((g || []).map((x) => [x.id, x.name]));
      (g || []).forEach((x) => { if (x.exclusive_badge_icon) ICONES_EVENTO[x.id] = x.exclusive_badge_icon; });
      setRows((data || []).map((r) => r.badge.startsWith("evento:") ? { ...r, title: nm[r.badge.slice(7)] } : r));
    });
  }, []);
  const porBadge = useMemo(() => {
    const m = {};
    (rows || []).forEach((r) => { (m[r.badge] = m[r.badge] || []).push(r); });
    return m;
  }, [rows]);
  if (!rows) return <div className="hm-skeleton" style={{ marginTop: 14 }} />;
  const total = new Set(rows.map((r) => r.profile_id)).size;
  const titulo = (b) => b.startsWith("evento:") ? ((porBadge[b] || [])[0]?.title || "Selo de evento") : nomeInsignia(b);
  const pessoas = Object.values(Object.fromEntries((rows || []).map((r) => [r.profile_id, r]))).sort((a, b) => String(a.name).localeCompare(String(b.name), "pt-BR"));
  const badges = [...ORDEM, ...Object.keys(porBadge).filter((b) => b.startsWith("evento:")), ...Object.keys(porBadge).filter((b) => b.startsWith("emi:")).sort()];
  return <div className="in-adm">
    <div className="row between gira-admin-header">
      <div>
        <span className="eyebrow">ENGAJAMENTO</span>
        <h2>Insígnias</h2>
        <p className="muted">Quem já cumpriu cada missão. Toque para ver quem ainda falta e chamar no WhatsApp.</p>
      </div>
    </div>
    {msg && <div className="gw-warning">{msg}</div>}
    <ConcederSelo pessoas={pessoas} />
    <div className="in-adm-list">{badges.map((b) => {
      const lista = porBadge[b] || [], tem = lista.filter((r) => r.level > 0), faltam = lista.filter((r) => r.level === 0);
      const pct = total ? Math.round(100 * tem.length / total) : 0, niveis = lista[0]?.kind === "niveis";
      const dist = niveis ? NIVEIS.map((_, i) => lista.filter((r) => r.level === i + 1).length) : null;
      return <div key={b} className={"in-adm-item" + (aberta === b ? " is-open" : "")}>
        <button type="button" className="in-adm-head" onClick={() => setAberta(aberta === b ? null : b)}>
          <Medalha badge={b} level={tem.length ? 1 : 0} size={42} />
          <span className="in-adm-txt">
            <b>{titulo(b)}</b>
            <span className="in-bar"><i style={{ width: pct + "%" }} /></span>
            <small>{tem.length} de {total} pessoas ({pct}%)</small>
          </span>
        </button>
        {aberta === b && <div className="in-adm-body">
          {dist && <div className="in-adm-dist">{NIVEIS.map((n, i) => <span key={i} style={{ "--in-cor": n.cor }}><i>{n.e}</i>{dist[i]}</span>)}</div>}
          <h4>{faltam.length ? "Ainda não têm (" + faltam.length + ")" : "Todo mundo já tem 🎉"}</h4>
          <div className="in-adm-people">{faltam.map((r) => {
            const nome = String(r.name || "").trim().split(/\s+/)[0];
            const wa = recado(b) && whatsappLink(r.phone, "Axé, " + nome + "! Passando pra lembrar: " + recado(b) + ". 🙏🏾");
            return <div key={r.profile_id} className="in-adm-person">
              <OrixaIcon name={r.orixa_symbol} size={26} />
              <span>{r.name}{r.kind === "unico" && r.goal > 1 ? <small> · {r.value}/{r.goal}</small> : null}</span>
              {wa && <a className="fq-wa" href={wa} target="_blank" rel="noopener">WhatsApp</a>}
            </div>;
          })}</div>
          {INSIGNIAS[b] && <p className="muted small">{INSIGNIAS[b].desc}</p>}
        </div>}
      </div>;
    })}</div>
  </div>;
}

// Selo especial concedido pela casa (Mutirão da reforma): marcar quem ajudou e conceder.
function ConcederSelo({ pessoas }) {
  const [aberto, setAberto] = useState(false), [ja, setJa] = useState(null), [sel, setSel] = useState([]), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const carregar = () => supabase.rpc("admin_badge_grants", { p_badge: "mutirao" }).then(({ data }) => setJa((data || []).map((x) => x.profile_id)));
  useEffect(() => { if (aberto && ja === null) carregar(); }, [aberto]);
  const conceder = async () => {
    setBusy(true); setMsg("");
    const { error } = await supabase.rpc("admin_badge_grant", { p_badge: "mutirao", p_profiles: sel, p_on: true });
    setBusy(false);
    if (error) return setMsg(err(error));
    setMsg("Selo concedido para " + sel.length + (sel.length === 1 ? " pessoa" : " pessoas") + ". Elas recebem o aviso no celular. 🧱");
    setSel([]); carregar();
  };
  return <div className={"in-adm-item" + (aberto ? " is-open" : "")} style={{ marginBottom: 12 }}>
    <button type="button" className="in-adm-head" onClick={() => setAberto(!aberto)}>
      <Medalha badge="mutirao" level={1} size={42} />
      <span className="in-adm-txt"><b>Conceder: Mutirão da reforma</b><small>Selo especial da casa. Marque quem ajudou na reforma.</small></span>
    </button>
    {aberto && <div className="in-adm-body">
      {ja === null ? <div className="hm-skeleton" /> : <div className="in-adm-people">{pessoas.map((r) => {
        const tem = ja.includes(r.profile_id), on = sel.includes(r.profile_id);
        return <label key={r.profile_id} className="in-adm-person" style={{ cursor: tem ? "default" : "pointer" }}>
          <input type="checkbox" disabled={tem} checked={tem || on} onChange={() => setSel(on ? sel.filter((x) => x !== r.profile_id) : [...sel, r.profile_id])} />
          <span>{r.name}{tem && <small> · já tem 🧱</small>}</span>
        </label>;
      })}</div>}
      {msg && <p className="muted small">{msg}</p>}
      <button type="button" className="btn primary" disabled={!sel.length || busy} onClick={conceder}>{busy ? "Concedendo…" : sel.length ? "Conceder para " + sel.length : "Marque quem ajudou"}</button>
    </div>}
  </div>;
}
