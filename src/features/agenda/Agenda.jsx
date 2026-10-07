// Agenda dos membros: calendário do mês e próximas giras.
import { useEffect, useState } from "react";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { GiraAgendaCard } from "../../components/GiraCard.jsx";
import { GiraDetail } from "./GiraDetalhe.jsx";

export const AGENDA_FILTERS = [["all", "Todas"], ["giras", "Giras"], ["desenvolvimento", "Desenvolvimento"], ["interna", "Internas"], ["festa", "Festas"], ["quintal", "Quintal Ancestral"], ["outros", "Outros"]];

export const matchAgendaFilter = (g, f) => f === "all" ? true : f === "giras" ? g.activity_type === "gira" : ["desenvolvimento", "interna", "festa", "quintal"].includes(f) ? g.activity_type === f : ["evento", "reuniao", "outra"].includes(g.activity_type);

export const AG_MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export const dayKey = (d) => d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

export function Giras({ p }) {
  const now = /* @__PURE__ */ new Date(), todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [giras, setGiras] = useState([]),
    [loading, setLoading] = useState(true),
    [selected, setSelected] = useState(null),
    [filter, setFilter] = useState("all"),
    [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() }),
    [day, setDay] = useState(null);
  useEffect(() => {
    supabase.from("giras").select("*").eq("status", "published").order("starts_at").then(({ data }) => {
      setGiras(data || []);
      setLoading(false);
    });
  }, []);
  if (selected) return <GiraDetail p={p} gira={selected} back={() => setSelected(null)} />;
  const filtered = giras.filter((g) => matchAgendaFilter(g, filter));
  const byDay = {};
  filtered.forEach((g) => {
    (byDay[dayKey(new Date(g.starts_at))] ??= []).push(g);
  });
  const isUpcoming = (g) => new Date(g.starts_at) >= todayStart;
  const inMonth = (g, y, m) => {
    const d = new Date(g.starts_at);
    return d.getFullYear() === y && d.getMonth() === m;
  };
  const moveMonth = (delta) => {
    setDay(null);
    setYm((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };
  const goToday = () => {
    setDay(null);
    setYm({ y: now.getFullYear(), m: now.getMonth() });
  };
  const monthLabel = (y, m) => AG_MONTHS[m][0].toUpperCase() + AG_MONTHS[m].slice(1) + (y !== now.getFullYear() ? " de " + y : "");
  let listTitle, list, emptyText;
  if (day) {
    list = byDay[dayKey(day)] || [];
    listTitle = day.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
    emptyText = "Nenhuma atividade neste dia.";
  } else {
    list = filtered.filter((g) => inMonth(g, ym.y, ym.m) && isUpcoming(g));
    listTitle = "Próximas em " + AG_MONTHS[ym.m];
    const isCurrentOrFuture = new Date(ym.y, ym.m + 1, 1) > todayStart;
    if (!list.length && isCurrentOrFuture) {
      const next = filtered.find((g) => isUpcoming(g) && new Date(g.starts_at) >= new Date(ym.y, ym.m + 1, 1));
      if (next) {
        const d = new Date(next.starts_at);
        list = filtered.filter((g) => inMonth(g, d.getFullYear(), d.getMonth()) && isUpcoming(g));
        listTitle = "Próximas em " + AG_MONTHS[d.getMonth()];
      }
    }
    if (!isCurrentOrFuture) listTitle = "Giras de " + AG_MONTHS[ym.m];
    emptyText = isCurrentOrFuture ? "Nenhuma atividade prevista por enquanto." : "Este mês já passou. Toque em um dia marcado para ver o que aconteceu.";
  }
  const first = new Date(ym.y, ym.m, 1).getDay(), days = new Date(ym.y, ym.m + 1, 0).getDate(), cells = [];
  for (let i = 0; i < first; i++) cells.push(<span key={"e" + i} />);
  for (let d = 1; d <= days; d++) {
    const dt = new Date(ym.y, ym.m, d), items = byDay[dayKey(dt)] || [], past = dt < todayStart, isToday = dayKey(dt) === dayKey(now), isSel = day && dayKey(day) === dayKey(dt);
    cells.push(<button key={d} type="button" className={"ag-day" + (past ? " is-past" : "") + (isToday ? " is-today" : "") + (items.length ? " has-gira" : "") + (isSel ? " is-selected" : "")} disabled={!items.length} aria-pressed={!!isSel} aria-label={d + " de " + AG_MONTHS[ym.m] + (items.length ? ", " + items.length + " atividade(s)" + (past ? " que já aconteceram" : "") : "")} onClick={() => setDay(isSel ? null : dt)}>{d}{items.length > 0 && <i className="ag-dot" />}</button>);
  }
  return <div className="ag-page">
  <div className="ag-head"><span className="eyebrow">AGENDA</span><h1>Giras e atividades</h1></div>
  <section className="ag-calendar card" aria-label="Calendário">
   <div className="ag-cal-top">
     <button type="button" className="ag-nav" aria-label="Mês anterior" onClick={() => moveMonth(-1)}>
     <ArrowLeft size={17} />
     </button>
     <b className="ag-month">{monthLabel(ym.y, ym.m)}</b>
     <button type="button" className="ag-nav" aria-label="Próximo mês" onClick={() => moveMonth(1)}>
     <ChevronRight size={18} />
     </button>
     </div>
   <div className="ag-grid">{["D", "S", "T", "Q", "Q", "S", "S"].map((x, i) => <span className="ag-wd" key={i}>{x}</span>)}{cells}</div>
   <div className="ag-legend">
     <span>
     <i className="ag-dot" /> Vai acontecer</span>
     <span>
     <i className="ag-dot is-past" /> Já aconteceu</span>{(ym.y !== now.getFullYear() || ym.m !== now.getMonth()) && <button type="button" className="ag-today" onClick={goToday}>Voltar para hoje</button>}</div>
  </section>
  <div className="gira-filters ag-filters">{AGENDA_FILTERS.map(([v, l]) => <button key={v} className={filter === v ? "active" : ""} onClick={() => {
    setFilter(v);
    setDay(null);
  }}>{l}</button>)}</div>
  <div className="ag-list-head">
    <h2>{listTitle}</h2>{day && <button type="button" className="ag-today" onClick={() => setDay(null)}>Ver próximas</button>}</div>
  {loading ? <div className="card muted">Carregando…</div> : list.length ? <div className="gira-agenda-list">{list.map((g) => <GiraAgendaCard key={g.id} g={g} onOpen={setSelected} />)}</div> : <div className="card empty ag-empty">{emptyText}</div>}
 </div>;
}
