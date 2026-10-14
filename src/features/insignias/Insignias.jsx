// Insígnias e missões: o progresso vem do banco (my_badges), que calcula
// tudo a partir do que o app já registra. Aqui ficam nomes, ícones e textos.
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { supabase } from "../../lib/supabase.js";

export const NIVEIS = [
  { nome: "Semente", e: "🌱", cor: "#9a8466" },
  { nome: "Broto", e: "🌿", cor: "#7f9a55" },
  { nome: "Folha", e: "🍃", cor: "#4e7f44" },
  { nome: "Flor", e: "🌺", cor: "#b8607a" },
  { nome: "Fruto", e: "🍊", cor: "#c97f2d" },
  { nome: "Árvore", e: "🌳", cor: "#2c5a30" }
];

// go: tela do app para onde o botão "Ir" leva
export const INSIGNIAS = {
  antena: { nome: "Antena ligada", ic: "📡", desc: "Ative os avisos no celular e fique sabendo na hora de giras, turnos e recados da casa.", como: "Em Meu espaço, toque em “Avisos no celular” e permita as notificações.", go: "me", ir: "Ativar avisos" },
  regras: { nome: "Guardião das regras", ic: "📜", desc: "Leia todas as regras da casa. Nas obrigatórias, confirme com “Li e entendi”.", como: "Em Conteúdos, abra a aba Regras.", go: "content", ir: "Ler as regras", un: ["regra", "regras"] },
  cadastro: { nome: "Cadastro completo", ic: "🪪", desc: "Mantenha seus dados em dia: Orixá, telefone e data de aniversário.", como: "Em Meu espaço, toque em “Meus dados”.", go: "me", ir: "Abrir Meu espaço", un: ["dado", "dados"] },
  palavra: { nome: "Palavra dada", ic: "🤝", desc: "Confirme as leituras obrigatórias com “Li e entendi”. É assim que a casa sabe que todo mundo está na mesma página.", como: "As leituras obrigatórias aparecem na tela inicial e em Conteúdos.", go: "content", ir: "Ver conteúdos", un: ["leitura confirmada", "leituras confirmadas"] },
  sabedoria: { nome: "Sabedoria da casa", ic: "📖", desc: "Leia os ensinamentos e conteúdos publicados pela casa.", como: "Abra os textos em Conteúdos.", go: "content", ir: "Ler conteúdos", un: ["conteúdo lido", "conteúdos lidos"] },
  responde: { nome: "Responde presente", ic: "🙋🏾", desc: "Responda se vai ou não a cada gira. Dizer “não vou” também conta: o importante é a casa saber.", como: "Na tela inicial ou na Agenda, responda à confirmação de presença.", go: "giras", ir: "Abrir a Agenda", un: ["gira respondida", "giras respondidas"] },
  mao: { nome: "Mão na massa", ic: "🧺", desc: "Escolha seu turno de atividades nas giras e marque suas tarefas como feitas.", como: "Na Agenda, abra a gira e escolha seu turno.", go: "giras", ir: "Abrir a Agenda", un: ["contribuição", "contribuições"] },
  axe: { nome: "Axé que circula", ic: "🙏🏾", desc: "Mande axé nas publicações dos seus irmãos no mural.", como: "No Mural, toque em 🙏🏾 Axé nas publicações.", go: "community", ir: "Abrir o Mural", un: ["axé enviado", "axés enviados"] },
  voz: { nome: "Voz da comunidade", ic: "💬", desc: "Compartilhe no mural: publique o que sentiu, o que aprendeu, ou comente as publicações dos irmãos.", como: "No Mural, escreva ou comente.", go: "community", ir: "Abrir o Mural", un: ["participação", "participações"] }
};
const ORDEM_UNICAS = ["antena", "regras", "cadastro"];
const ORDEM_NIVEIS = ["palavra", "responde", "sabedoria", "mao", "axe", "voz"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
// leituras: quando o próximo nível pede mais do que a casa já publicou
const emDia = (s, prox) => s?.goal != null && prox > s.goal && (s.value || 0) >= s.goal;
const faltaPublicar = (s, prox) => s?.goal != null && prox > s.goal && (s.value || 0) < s.goal;
const un = (k, n) => { const u = INSIGNIAS[k]?.un; return u ? (n === 1 ? u[0] : u[1]) : ""; };
const emiLabel = (badge, title) => {
  const m = /emi:(\d{4})-(\d{2})/.exec(badge || "");
  return m ? MESES[+m[2] - 1] + " " + m[1] : title || "Edição";
};
export const nomeInsignia = (badge, title) => badge?.startsWith("emi:") ? "Ẹ̀mí Ìlú · " + emiLabel(badge, title) : badge?.startsWith("evento:") ? title || "Selo de evento" : INSIGNIAS[badge]?.nome || badge;
// ícones escolhidos no cadastro de cada evento (preenchido quando o app carrega os eventos)
export const ICONES_EVENTO = {};
export const iconeInsignia = (badge) => badge?.startsWith("emi:") ? "📰" : badge?.startsWith("evento:") ? ICONES_EVENTO[badge.slice(7)] || "🌟" : INSIGNIAS[badge]?.ic || "🏅";
export async function carregarIconesEventos(ids) {
  if (!ids.length) return;
  const { data } = await supabase.from("giras").select("id,exclusive_badge_icon").in("id", ids);
  (data || []).forEach((g) => { if (g.exclusive_badge_icon) ICONES_EVENTO[g.id] = g.exclusive_badge_icon; });
}

export function useInsignias() {
  const [data, setData] = useState(null);
  const load = async () => {
    const { data: d, error } = await supabase.rpc("my_badges");
    setData(error ? { state: [], awards: [], error } : { state: d?.state || [], awards: d?.awards || [] });
  };
  useEffect(() => { load(); }, []);
  return { data, reload: load };
}

// medalhão: emoji da insígnia com o anel na cor do nível
export function Medalha({ badge, level = 0, size = 64 }) {
  const n = level > 0 ? NIVEIS[Math.min(level, 6) - 1] : null;
  return <span className={"in-medal" + (level > 0 ? " is-on" : "")} style={{ width: size, height: size, fontSize: size * 0.42, "--in-cor": n?.cor || "var(--line)" }} aria-hidden="true">
    <span>{iconeInsignia(badge)}</span>
    {level > 0 && ORDEM_NIVEIS.includes(badge) && <i className="in-medal-lvl">{n.e}</i>}
  </span>;
}

function Pontos({ level }) {
  return <span className="in-dots" aria-label={"Nível " + level + " de 6"}>{NIVEIS.map((n, i) => <i key={i} className={i < level ? "is-on" : ""} style={{ "--in-cor": n.cor }} />)}</span>;
}

export function MinhasInsignias({ go }) {
  const { data } = useInsignias();
  const [open, setOpen] = useState(null);
  useEffect(() => { supabase.rpc("mark_badges_seen").then(() => {}, () => {}); }, []);
  const st = useMemo(() => Object.fromEntries((data?.state || []).map((s) => [s.badge, s])), [data]);
  const ganhas = useMemo(() => new Set((data?.awards || []).map((a) => a.badge)), [data]);
  // selos de eventos: datas e minha resposta, para mostrar o que ainda dá para conquistar
  const [evInfo, setEvInfo] = useState({});
  useEffect(() => {
    const ids = (data?.state || []).filter((x) => x.kind === "evento").map((x) => x.badge.slice(7));
    if (!ids.length) return;
    Promise.all([supabase.from("giras").select("id,name,starts_at,exclusive_badge_icon").in("id", ids), supabase.from("gira_responses").select("gira_id,status").in("gira_id", ids)]).then(([{ data: g }, { data: r }]) => {
      const m = {};
      (g || []).forEach((x) => { m[x.id] = { ...x }; if (x.exclusive_badge_icon) ICONES_EVENTO[x.id] = x.exclusive_badge_icon; });
      (r || []).forEach((x) => { if (m[x.gira_id]) m[x.gira_id].status = x.status; });
      setEvInfo(m);
    });
  }, [data]);
  if (!data) return <div className="in"><div className="hm-skeleton" style={{ marginTop: 16 }} /></div>;
  const emis = (data.state || []).filter((s) => s.kind === "colecao").sort((a, b) => a.badge.localeCompare(b.badge));
  const agora = Date.now();
  const evs = (data.state || []).filter((s) => s.kind === "evento").map((s) => ({ ...s, info: evInfo[s.badge.slice(7)] || {} }))
    .filter((s) => s.value > 0 || ganhas.has(s.badge) || !s.info.starts_at || new Date(s.info.starts_at).getTime() > agora)
    .sort((a, b) => String(a.info.starts_at || "").localeCompare(String(b.info.starts_at || "")));
  const conquistadas = ORDEM_UNICAS.filter((k) => ganhas.has(k)).length + ORDEM_NIVEIS.filter((k) => (st[k]?.level || 0) > 0).length + emis.filter((s) => s.value > 0).length + evs.filter((s) => s.value > 0 || ganhas.has(s.badge)).length;
  const niveisSomados = ORDEM_NIVEIS.reduce((n, k) => n + (st[k]?.level || 0), 0);
  return <div className="in">
    <header className="in-head">
      <span className="eyebrow">MINHA CAMINHADA</span>
      <h1>Minhas insígnias</h1>
      <p className="muted">Missões que ajudam a casa inteira a caminhar junta. Cada passo seu conta.</p>
      <div className="in-resumo">
        <div><b>{conquistadas}</b><small>insígnias</small></div>
        <div><b>{niveisSomados}</b><small>níveis somados</small></div>
        <div><b>{emis.filter((s) => s.value > 0).length}/{emis.length || 0}</b><small>Ẹ̀mí Ìlú</small></div>
      </div>
    </header>

    <h2 className="in-sec">Primeiros passos</h2>
    <div className="in-grid">{ORDEM_UNICAS.map((k) => {
      const s = st[k] || { value: 0, goal: 0 }, ok = (s.level || 0) > 0, ja = ganhas.has(k);
      const falta = Math.max(0, (s.goal || 0) - (s.value || 0));
      return <button type="button" key={k} className={"in-card" + (ok ? " is-ok" : "")} onClick={() => setOpen(k)}>
        <Medalha badge={k} level={ok ? 1 : 0} size={58} />
        <b>{INSIGNIAS[k].nome}</b>
        {ok ? <small className="in-ok">Conquistada ✓</small>
          : ja && k === "regras" ? <small className="in-falta">{falta} {falta === 1 ? "regra nova" : "regras novas"} para ler</small>
          : s.goal > 1 ? <><span className="in-bar"><i style={{ width: Math.round(100 * (s.value || 0) / s.goal) + "%" }} /></span><small>{s.value || 0} de {s.goal}</small></>
          : <small className="in-falta">Falta pouco!</small>}
      </button>;
    })}</div>

    <h2 className="in-sec">Caminhada <small>6 níveis: {NIVEIS.map((n) => n.e).join(" ")}</small></h2>
    <div className="in-list">{ORDEM_NIVEIS.map((k) => {
      const s = st[k] || { value: 0, thresholds: [1, 3, 6, 10, 20, 35], level: 0 };
      const th = s.thresholds || [], lvl = s.level || 0, prox = th[lvl], ant = lvl ? th[lvl - 1] : 0;
      const pct = !prox || emDia(s, prox) ? 100 : Math.round(100 * ((s.value || 0) - ant) / ((faltaPublicar(s, prox) ? s.goal : prox) - ant));
      return <button type="button" key={k} className={"in-row" + (lvl ? " is-ok" : "")} onClick={() => setOpen(k)}>
        <Medalha badge={k} level={lvl} size={56} />
        <span className="in-row-txt">
          <b>{INSIGNIAS[k].nome}</b>
          <small className="in-lvl">{lvl ? "Nível " + lvl + " · " + NIVEIS[lvl - 1].nome : "Ainda não começou"}</small>
          {prox ? <>
            <span className="in-bar"><i style={{ width: Math.max(4, pct) + "%", background: NIVEIS[lvl].cor }} /></span>
            {emDia(s, prox) ? <small className="in-ok">Em dia ✓ Você já leu tudo o que a casa publicou. O próximo nível chega com as novas publicações.</small>
            : faltaPublicar(s, prox) ? <small>{s.goal - (s.value || 0) === 1 ? "Falta" : "Faltam"} {s.goal - (s.value || 0)} {un(k, s.goal - (s.value || 0))} para ficar em dia</small>
            : <small>{prox - (s.value || 0) === 1 ? "Falta" : "Faltam"} {prox - (s.value || 0)} {un(k, prox - (s.value || 0))} para {NIVEIS[lvl].e} {NIVEIS[lvl].nome}</small>}
          </> : <small className="in-ok">Nível máximo! 🌳</small>}
        </span>
        <Pontos level={lvl} />
      </button>;
    })}</div>

    {evs.length > 0 && <>
    <h2 className="in-sec">Selos de eventos <small>exclusivos de quem participa</small></h2>
    <div className="in-ev">{evs.map((s) => {
      const ok = s.value > 0 || ganhas.has(s.badge), d = s.info.starts_at ? new Date(s.info.starts_at) : null;
      return <button type="button" key={s.badge} className={"in-ev-item" + (ok ? " is-ok" : "")} onClick={() => go?.("giras")}>
        <Medalha badge={s.badge} level={ok ? 1 : 0} size={50} />
        <span className="in-ev-txt"><b>{s.title}</b>
        <small>{ok ? "Na sua coleção ✓" : s.info.status === "going" ? "Presença confirmada! O selo chega no dia" + (d ? " " + d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "") + "." : "Confirme presença na Agenda para ganhar" + (d ? " · " + d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "")}</small></span>
        <ChevronRight size={16} />
      </button>;
    })}</div>
    </>}

    <h2 className="in-sec">Coleção Ẹ̀mí Ìlú <small>um selo por edição lida até o fim</small></h2>
    {emis.length ? <div className="in-emi">{emis.map((s) => <button type="button" key={s.badge} className={"in-emi-item" + (s.value > 0 ? " is-ok" : "")} onClick={() => go?.("revista")}>
      <span className="in-emi-capa">📰</span>
      <b>{emiLabel(s.badge, s.title)}</b>
      <small>{s.value > 0 ? "Na coleção ✓" : "Ler e completar"}</small>
    </button>)}</div> : <div className="mu-empty">Quando sair a primeira edição, ela aparece aqui.</div>}

    {open && <DetalheInsignia k={open} s={st[open]} ganha={ganhas.has(open)} onClose={() => setOpen(null)} go={go} />}
  </div>;
}

function DetalheInsignia({ k, s = {}, ganha, onClose, go }) {
  const info = INSIGNIAS[k], niveis = ORDEM_NIVEIS.includes(k), lvl = s.level || 0;
  return <div className="modal-back" onClick={onClose}>
    <div className="modal in-modal" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="in-x" aria-label="Fechar" onClick={onClose}><X size={18} /></button>
      <Medalha badge={k} level={niveis ? lvl : lvl ? 1 : 0} size={88} />
      <h3>{info.nome}</h3>
      <p>{info.desc}</p>
      {niveis ? <ol className="in-niveis">{NIVEIS.map((n, i) => <li key={i} className={i < lvl ? "is-on" : ""} style={{ "--in-cor": n.cor }}>
        <span>{n.e}</span><b>{n.nome}</b><small>{(s.thresholds || [])[i]} {un(k, (s.thresholds || [])[i])}</small>{i < lvl && <em>✓</em>}
      </li>)}</ol> : <p className="in-status">{lvl ? "Você já conquistou esta insígnia ✓" : ganha && k === "regras" ? "Você já tinha esta insígnia, mas chegaram regras novas. Leia para manter tudo em dia." : s.goal > 1 ? "Você está em " + (s.value || 0) + " de " + s.goal + "." : "Ainda não conquistada."}</p>}
      {niveis && <p className="muted small">Você tem {s.value || 0} {un(k, s.value || 0)}{s.goal != null ? " (de " + s.goal + " publicados até agora)" : ""}.</p>}
      {niveis && emDia(s, (s.thresholds || [])[lvl]) && <p className="in-status">Em dia ✓ Você já leu tudo. Quando a casa publicar mais, o próximo nível libera.</p>}
      <p className="in-como">💡 {info.como}</p>
      {go && <button type="button" className="btn primary" onClick={() => { onClose(); go(info.go); }}>{info.ir} <ChevronRight size={15} /></button>}
    </div>
  </div>;
}

// Comemoração: aparece quando há conquistas que a pessoa ainda não viu
export function ComemoraInsignias({ go }) {
  const [novas, setNovas] = useState([]);
  useEffect(() => {
    supabase.rpc("my_badges").then(async ({ data, error }) => {
      if (error || !data?.awards) return;
      const pend = data.awards.filter((a) => !a.seen_at);
      const porBadge = {};
      pend.forEach((a) => { if (!porBadge[a.badge] || a.level > porBadge[a.badge].level) porBadge[a.badge] = a; });
      const titles = Object.fromEntries((data.state || []).map((s) => [s.badge, s.title]));
      await carregarIconesEventos(Object.values(porBadge).filter((a) => a.badge.startsWith("evento:")).map((a) => a.badge.slice(7)));
      setNovas(Object.values(porBadge).map((a) => ({ ...a, title: titles[a.badge] })));
    });
  }, []);
  if (!novas.length) return null;
  const fechar = (ver) => {
    supabase.rpc("mark_badges_seen").then(() => {}, () => {});
    setNovas([]);
    if (ver) go("insignias");
  };
  return <div className="modal-back in-festa-back" onClick={() => fechar(false)}>
    <div className="modal in-festa" onClick={(e) => e.stopPropagation()}>
      <div className="in-festa-brilho" aria-hidden="true">✨</div>
      <span className="eyebrow">AXÉ!</span>
      <h3>{novas.length === 1 ? "Você conquistou uma insígnia" : "Você conquistou " + novas.length + " insígnias"}</h3>
      <div className="in-festa-lista">{novas.slice(0, 6).map((a) => <div key={a.badge} className="in-festa-item">
        <Medalha badge={a.badge} level={a.level} size={52} />
        <span><b>{nomeInsignia(a.badge, a.title)}</b>{ORDEM_NIVEIS.includes(a.badge) && <small>Nível {a.level} · {NIVEIS[a.level - 1].e} {NIVEIS[a.level - 1].nome}</small>}</span>
      </div>)}{novas.length > 6 && <small className="muted">e mais {novas.length - 6}…</small>}</div>
      <button type="button" className="btn primary" onClick={() => fechar(true)}>Ver minhas insígnias</button>
      <button type="button" className="btn" onClick={() => fechar(false)}>Depois</button>
    </div>
  </div>;
}
