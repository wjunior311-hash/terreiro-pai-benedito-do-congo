// Frequência: quem confirma presença sempre e quem sumiu (pelas confirmações do app).
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { OrixaIcon } from "../../orixaSymbols.jsx";
import { err, types, whatsappLink } from "../../lib/helpers.js";
import { standardizeName } from "./Pessoas.jsx";

const PERIODS = [[3, "3 meses"], [6, "6 meses"], [12, "12 meses"]];
const DAY = 864e5;

// Classifica cada pessoa. "Sumiu": já teve giras para responder e não confirma há 60+ dias.
export function classifyAttendance(r, now = Date.now()) {
  const total = r.giras_total || 0, rate = total ? r.going / total : 0;
  const lastGoing = r.last_going_at ? new Date(r.last_going_at).getTime() : null;
  const daysSince = lastGoing ? Math.floor((now - lastGoing) / DAY) : null;
  let status = "ok";
  if (total < 2) status = "new";
  else if (!lastGoing || daysSince > 60) status = "gone";
  else if (rate >= 0.75) status = "always";
  else if (rate < 0.4) status = "low";
  return { ...r, rate, daysSince, status };
}

export function Frequencia() {
  const [months, setMonths] = useState(6),
    [type, setType] = useState(""),
    [rows, setRows] = useState(null),
    [view, setView] = useState("gone"),
    [msg, setMsg] = useState("");
  const load = async () => {
    setRows(null);
    setMsg("");
    const { data, error } = await supabase.rpc("admin_attendance_report", { p_months: months, p_activity_type: type || null });
    if (error) {
      setMsg(/function|schema cache|does not exist/i.test(error.message || "") ? "A Frequência precisa da atualização do banco (arquivo 20261007e). Rode o SQL no Supabase e recarregue." : err(error));
      setRows([]);
      return;
    }
    setRows((data || []).map((r) => classifyAttendance(r)));
  };
  useEffect(() => {
    load();
  }, [months, type]);
  const list = rows || [];
  const groups = {
    gone: list.filter((r) => r.status === "gone").sort((a, b) => (b.daysSince ?? 1e9) - (a.daysSince ?? 1e9)),
    always: list.filter((r) => r.status === "always").sort((a, b) => b.rate - a.rate || b.going - a.going),
    low: list.filter((r) => r.status === "low").sort((a, b) => a.rate - b.rate),
    all: [...list].sort((a, b) => b.rate - a.rate || a.name.localeCompare(b.name, "pt-BR"))
  };
  const tabs = [["gone", "Sumiram", "Não confirmam presença há mais de 60 dias"], ["low", "Pouca presença", "Confirmaram menos de 40% das giras"], ["always", "Sempre presentes", "Confirmaram 75% ou mais das giras"], ["all", "Todos", "Todas as pessoas ativas"]];
  const fmt = (d) => d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : null;
  const shown = groups[view] || [];
  return <div className="fq">
    <div className="gira-admin-header">
      <span className="eyebrow">GESTÃO DA CASA</span>
      <h2>Frequência</h2>
      <p className="muted">Quem vem sempre e quem sumiu, pelas confirmações de presença nas giras que já aconteceram.</p>
    </div>
    <div className="fq-filters">
      <div className="fq-seg" role="group" aria-label="Período">{PERIODS.map(([m, l]) => <button key={m} className={months === m ? "is-on" : ""} onClick={() => setMonths(m)}>{l}</button>)}</div>
      <select className="select fq-type" value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo de atividade">
        <option value="">Todas as atividades</option>{Object.entries(types).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <button className="btn fq-refresh" onClick={load} aria-label="Atualizar"><RefreshCw size={15} /></button>
    </div>
    {msg && <div className="toast">{msg}</div>}
    {rows === null ? <><span className="skeleton skeleton-card" /><span className="skeleton skeleton-card" /></> : <>
    <div className="fq-stats">{tabs.slice(0, 3).map(([k, l]) => <button key={k} className={"fq-stat fq-" + k + (view === k ? " is-on" : "")} onClick={() => setView(k)}>
      <b>{groups[k].length}</b><span>{l}</span></button>)}</div>
    <div className="fq-hint"><span className="muted small"><b>{tabs.find((t) => t[0] === view)?.[1]}:</b> {tabs.find((t) => t[0] === view)?.[2].toLowerCase()}</span>
      <button className="fq-all" onClick={() => setView(view === "all" ? "gone" : "all")}>{view === "all" ? "Ver quem sumiu" : "Ver todos (" + list.length + ")"}</button></div>
    <div className="fq-list">{shown.map((r) => <div className={"fq-row fq-" + r.status} key={r.profile_id}>
      <OrixaIcon name={r.orixa_symbol} size={34} />
      <div className="fq-main">
        <b>{standardizeName(r.name || "")}</b>
        <small>{r.group_name || "Sem grupo"} · {r.going} de {r.giras_total} {r.giras_total === 1 ? "gira" : "giras"}{r.no_answer > 0 ? " · " + r.no_answer + " sem resposta" : ""}</small>
        <div className="fq-bar" aria-hidden="true"><i style={{ width: Math.round(r.rate * 100) + "%" }} /></div>
      </div>
      <div className="fq-side">
        <b>{r.giras_total ? Math.round(r.rate * 100) + "%" : "—"}</b>
        <small>{r.last_going_at ? "última: " + fmt(r.last_going_at) : r.giras_total ? "nunca confirmou" : "ainda sem giras"}</small>
        {r.last_seen_at && <small>abriu o app {fmt(r.last_seen_at)}</small>}
        {(r.status === "gone" || r.status === "low") && whatsappLink(r.phone) && <a className="fq-wa" href={whatsappLink(r.phone, "Axé, " + standardizeName(r.name || "").split(" ")[0] + "! Sentimos sua falta nas giras. Está tudo bem com você?")} target="_blank" rel="noopener">WhatsApp</a>}
      </div>
    </div>)}{!shown.length && <div className="empty">{view === "gone" ? "Ninguém sumiu nesse período. Que bom!" : "Ninguém nesta lista."}</div>}</div>
    <p className="muted small fq-note">Conta só as giras publicadas que já aconteceram, depois que a pessoa entrou no app. É a confirmação pelo app, não a chamada no dia.</p>
    </>}
  </div>;
}
