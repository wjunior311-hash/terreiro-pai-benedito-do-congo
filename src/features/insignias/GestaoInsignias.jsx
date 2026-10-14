// Gestão: quem já tem cada insígnia e quem ainda falta (com atalho para o WhatsApp).
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { err, whatsappLink } from "../../lib/helpers.js";
import { OrixaIcon } from "../../orixaSymbols.jsx";
import { INSIGNIAS, NIVEIS, Medalha, nomeInsignia } from "./Insignias.jsx";

const ORDEM = ["antena", "regras", "cadastro", "palavra", "responde", "sabedoria", "mao", "axe", "voz"];
const RECADO = {
  antena: "ative os avisos do app no celular (Meu espaço → Avisos no celular), assim você fica sabendo na hora das giras e recados da casa",
  regras: "leia as regras da casa no app (Conteúdos → Regras) e confirme com “Li e entendi”",
  cadastro: "complete seus dados no app (Meu espaço → Meus dados): Orixá, telefone e aniversário",
  palavra: "confirme as leituras obrigatórias no app com “Li e entendi”",
  responde: "responda no app se vai ou não às giras, assim a casa consegue se organizar",
  sabedoria: "dê uma olhada nos conteúdos da casa no app",
  mao: "escolha seu turno de atividades nas giras pelo app",
  axe: "passe no mural do app e mande axé para os irmãos",
  voz: "compartilhe no mural do app como foi a gira para você"
};
const recado = (b) => RECADO[b] || (b.startsWith("evento:") ? "esse evento tem selo exclusivo no app! É só confirmar presença na Agenda. Vai ser lindo ter você lá" : null);

export function GestaoInsignias() {
  const [rows, setRows] = useState(null), [msg, setMsg] = useState(""), [aberta, setAberta] = useState(null);
  useEffect(() => {
    supabase.rpc("admin_badges_overview").then(async ({ data, error }) => {
      if (error) setMsg(err(error));
      const ids = [...new Set((data || []).filter((r) => r.badge.startsWith("evento:")).map((r) => r.badge.slice(7)))];
      const { data: g } = ids.length ? await supabase.from("giras").select("id,name").in("id", ids) : { data: [] };
      const nm = Object.fromEntries((g || []).map((x) => [x.id, x.name]));
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
  const titulo = (b) => b.startsWith("evento:") ? "🌟 " + ((porBadge[b] || [])[0]?.title || "Selo de evento") : nomeInsignia(b);
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
