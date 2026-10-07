// Tela inicial: saudação, "Precisa da sua atenção", próxima gira, aniversariantes e novidades.
import { useEffect, useState } from "react";
import { CalendarDays, WalletCards, BookOpen, ShieldCheck, Check, X, RefreshCw, ChevronRight, ClipboardList, Bell, Cake } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { OrixaIcon } from "../../orixaSymbols.jsx";
import { money } from "../../lib/helpers.js";
import { HomeNextGira } from "../../components/GiraCard.jsx";
import { PERMISSION_LABELS, can, hasAnyAdmin } from "../acesso.js";
import { useMemberFinance, ymOf } from "../financeiro/regras.js";
import { PayModal } from "../financeiro/ComoPagar.jsx";
import { standardizeName } from "../gestao/Pessoas.jsx";
import { AvisosHomeCard } from "../avisos/AtivarAvisos.jsx";

export const HOME_PHRASE = "Nossa força vem de quem veio antes e de quem caminha conosco.";

export function AttentionItem({ item }) {
  return <button type="button" className={"hm-att hm-att-" + item.tone} onClick={item.onClick}>
    <span className="hm-att-icon" aria-hidden="true">{item.icon}</span>
    <span className="hm-att-text">
    <b>{item.title}</b>{item.text && <small>{item.text}</small>}</span>
    <span className="hm-att-cta">{item.cta}<ChevronRight size={15} />
    </span>
    </button>;
}

export function Home({ p, go, memberPreview = false }) {
  const [gira, setGira] = useState(null),
    [resp, setResp] = useState(null),
    [turns, setTurns] = useState([]),
    [contents, setContents] = useState([]),
    [notices, setNotices] = useState([]),
    [turnChangeNotifications, setTurnChangeNotifications] = useState([]),
    [giraNotifications, setGiraNotifications] = useState([]),
    [requiredReads, setRequiredReads] = useState([]),
    [loadingHome, setLoadingHome] = useState(true),
    [showGiraDescription, setShowGiraDescription] = useState(false);
  const load = async () => {
    setLoadingHome(true);
    const now2 = /* @__PURE__ */ new Date();
    const [{ data: g }, { data: c }, { data: n }, { data: turnChanges }, { data: availabilityNotifications }] = await Promise.all([
      supabase.from("giras").select("*").eq("status", "published").gte("starts_at", now2.toISOString()).order("starts_at").limit(1).maybeSingle(),
      supabase.from("house_contents").select("id,title,body,content_type,tags,created_at").eq("content_type", "content").order("created_at", { ascending: false }).limit(3),
      supabase.from("notices").select("id,title,body,starts_at,ends_at,published,created_at").eq("published", true).order("created_at", { ascending: false }).limit(3),
      supabase.rpc("get_my_gira_turn_change_notifications", { p_gira_id: null }),
      supabase.rpc("get_my_gira_turn_availability_notifications", { p_gira_id: null })
    ]);
    setGira(g);
    setContents(c || []);
    setNotices((n || []).filter((x) => (!x.starts_at || new Date(x.starts_at) <= now2) && (!x.ends_at || new Date(x.ends_at) >= now2)));
    setTurnChangeNotifications((turnChanges || []).filter((x) => !x.read_at));
    setGiraNotifications((availabilityNotifications || []).filter((x) => !x.read_at));
    {
      const [{ data: req }, { data: myReads }] = await Promise.all([supabase.from("house_contents").select("id,title,reminded_at").eq("is_required", true).order("created_at", { ascending: false }), supabase.from("house_content_reads").select("content_id,confirmed_at").eq("profile_id", p.id)]);
      const ok = new Set((myReads || []).filter((x) => x.confirmed_at).map((x) => x.content_id));
      setRequiredReads((req || []).filter((x) => !ok.has(x.id)));
    }
    if (g) {
      const [{ data: r }, { data: ts }] = await Promise.all([supabase.from("gira_responses").select("*").eq("gira_id", g.id).eq("profile_id", p.id).maybeSingle(), g.use_task_list ? supabase.rpc("gira_turn_summary", { p_gira_id: g.id }) : Promise.resolve({ data: [] })]);
      setResp(r);
      setTurns(ts || []);
    } else {
      setResp(null);
      setTurns([]);
    }
    setLoadingHome(false);
  };
  useEffect(() => {
    load();
  }, [p.id]);
  const answer = async (status) => {
    if (!gira) return;
    const { data, error } = await supabase.from("gira_responses").upsert({ gira_id: gira.id, profile_id: p.id, status }, { onConflict: "gira_id,profile_id" }).select().single();
    if (error) return;
    setResp(data);
  };
  const fin = useMemberFinance(p), [payOpen, setPayOpen] = useState(false);
  const now = /* @__PURE__ */ new Date();
  const attention = [];
  if (gira) {
    const d = new Date(gira.starts_at), day = 864e5, dateText = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
    if (!resp?.status) attention.push({ key: "presence", tone: "warning", icon: <CalendarDays size={20} />, title: "Confirme sua presença", text: gira.name + " · " + dateText, cta: "Responder", onClick: () => document.getElementById("hm-next-gira")?.scrollIntoView({ behavior: "smooth", block: "center" }) });
    if (resp?.status === "going" && gira.use_task_list) {
      const open = now >= new Date(d.getTime() - 10 * day) && (now < new Date(d.getTime() - 3 * day) || gira.turn_availability_reopened_until && now < new Date(gira.turn_availability_reopened_until));
      const deadline = now.toDateString() === new Date(d.getTime() - 3 * day).toDateString();
      const released = now >= new Date(d.getTime() - 3 * day) && now < d;
      if (deadline) attention.push({ key: "deadline", tone: "danger", icon: <ClipboardList size={20} />, title: "Último dia para escolher seu turno", text: gira.name, cta: "Escolher", onClick: () => go("giras") });
      else if (open) attention.push({ key: "turns", tone: "warning", icon: <ClipboardList size={20} />, title: "Escolha seu turno de atividades", text: gira.name, cta: "Escolher", onClick: () => go("giras") });
      else if (released) attention.push({ key: "tasks", tone: "info", icon: <ClipboardList size={20} />, title: "As tarefas da gira foram organizadas", text: "Acompanhe o seu turno no dia da gira", cta: "Ver", onClick: () => go("giras") });
    }
  }
  turnChangeNotifications.slice(0, 1).forEach((n) => attention.push({ key: "turnchange-" + n.id, tone: "warning", icon: <RefreshCw size={19} />, title: "Seu turno foi alterado", text: n.message, cta: "Ver", onClick: () => go("giras") }));
  giraNotifications.slice(0, 1).forEach((n) => attention.push({ key: "gira-" + n.id, tone: "info", icon: <CalendarDays size={20} />, title: "Novidade na agenda", text: n.message, cta: "Abrir", onClick: () => go("giras") }));
  requiredReads.forEach((x) => {
    const reminded = x.reminded_at && now - new Date(x.reminded_at) < 7 * 864e5;
    attention.push({ key: "read-" + x.id, tone: reminded ? "danger" : "warning", icon: <BookOpen size={19} />, title: reminded ? "Lembrete: leitura obrigatória" : "Leitura obrigatória", text: x.title, cta: "Ler", onClick: () => go("content") });
  });
  const seen = async (x) => {
    await supabase.rpc("mark_payment_proof_seen", { p_id: x.id });
    fin.reload();
  };
  fin.reviewed.forEach((x) => attention.push(x.status === "approved" ? { key: "proof-" + x.id, tone: "info", icon: <Check size={20} />, title: "Pagamento confirmado", text: x.description + " · " + money(x.amount), cta: "Ok", onClick: () => seen(x) } : { key: "proof-" + x.id, tone: "danger", icon: <X size={20} />, title: "Comprovante recusado", text: x.description + (x.reject_reason ? " · " + x.reject_reason : ""), cta: "Enviar de novo", onClick: () => {
    seen(x);
    setPayOpen(true);
  } }));
  const unpaidItems = fin.items.filter((x) => !x.proof), overdueItems = unpaidItems.filter((x) => x.overdue);
  if (overdueItems.length) attention.push({ key: "late", tone: "danger", icon: <WalletCards size={20} />, title: overdueItems.length === 1 ? overdueItems[0].description + " em atraso" : overdueItems.length + " pagamentos em atraso", text: money(overdueItems.reduce((n, x) => n + x.amount, 0)) + (overdueItems.length === 1 ? " · " + overdueItems[0].dueText : ""), cta: "Como pagar", onClick: () => setPayOpen(true) });
  const curItem = unpaidItems.find((x) => x.kind === "monthly" && !x.overdue && x.ym === ymOf(now));
  if (curItem && now.getDate() >= fin.settings.due_day - fin.settings.reminder_days) attention.push({ key: "remind", tone: "warning", icon: <WalletCards size={20} />, title: "Mensalidade vence dia " + fin.settings.due_day, text: curItem.description + " · " + money(curItem.amount), cta: "Como pagar", onClick: () => setPayOpen(true) });
  unpaidItems.filter((x) => x.kind === "extra" && !x.overdue).slice(0, 1).forEach((x) => attention.push({ key: "charge-" + x.id, tone: "info", icon: <WalletCards size={20} />, title: "Cobrança em aberto", text: x.description + " · " + money(x.amount), cta: "Como pagar", onClick: () => setPayOpen(true) }));
  const isManager = !memberPreview && hasAnyAdmin(p);
  const news = [...notices.map((x) => ({ ...x, kind: "Aviso" })), ...contents.map((x) => ({ ...x, kind: "Conteúdo" }))].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);
  const ago = (s) => {
    const dd = Math.floor((now - new Date(s)) / 864e5);
    return dd <= 0 ? "hoje" : dd === 1 ? "ontem" : dd < 7 ? "há " + dd + " dias" : new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };
  const firstName = String(p.name || "").trim().split(" ")[0];
  return <div className="home-page hm">
  <header className="hm-hello">
   <span className="hm-date">{now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span>
   <h1>Olá{firstName ? ", " + firstName : ""}</h1>
   <p className="hm-phrase">{HOME_PHRASE}</p>
  </header>

  <section className="hm-section" aria-labelledby="hm-att-title">
   <h2 id="hm-att-title" className="hm-label">Precisa da sua atenção{attention.length > 0 && <span className="hm-count">{attention.length}</span>}</h2>
   {loadingHome ? <div className="hm-skeleton" /> : attention.length ? <div className="hm-att-list">{attention.map((x) => <AttentionItem key={x.key} item={x} />)}</div> : <div className="hm-clear">
     <Check size={18} />
     <span>Tudo em dia por aqui.</span>
     </div>}
  </section>

  {!memberPreview && <AvisosHomeCard />}

  {isManager && <button type="button" className="hm-manage" onClick={() => go("admin")}>
    <ShieldCheck size={18} />
    <span>
    <b>Gestão da Casa</b>
    <small>{can(p, "admin.full") ? "Pessoas, giras, financeiro e conteúdos" : PERMISSION_LABELS.filter((l) => can(p, l[0])).map((l) => l[1]).join(", ")}</small>
    </span>
    <ChevronRight size={17} />
    </button>}

  <section className="hm-section" id="hm-next-gira" aria-labelledby="hm-gira-title">
   <div className="hm-section-head">
     <h2 id="hm-gira-title" className="hm-label">Próxima gira</h2>
     <button type="button" className="home-link" onClick={() => go("giras")}>Ver agenda <ChevronRight size={14} />
     </button>
     </div>
   {gira ? <HomeNextGira gira={gira} resp={resp} answer={answer} showGiraDescription={showGiraDescription} setShowGiraDescription={setShowGiraDescription} /> : <div className="hm-empty">
     <CalendarDays size={20} />
     <span>Nenhuma gira marcada por enquanto.</span>
     </div>}
  </section>

  <HomeBirthdays p={p} go={go} />

  {payOpen && <PayModal p={p} settings={fin.settings} items={fin.items} onClose={() => setPayOpen(false)} onSent={fin.reload} />}
  {news.length > 0 && <section className="hm-section" aria-labelledby="hm-news-title">
   <div className="hm-section-head">
     <h2 id="hm-news-title" className="hm-label">Novidades da casa</h2>
     <button type="button" className="home-link" onClick={() => go("content")}>Ver tudo <ChevronRight size={14} />
     </button>
     </div>
   <div className="hm-news">{news.map((x) => <button type="button" className="hm-news-row" key={x.kind + x.id} onClick={() => go("content")}>
     <span className="hm-news-icon" aria-hidden="true">{x.kind === "Aviso" ? <Bell size={16} /> : <BookOpen size={16} />}</span>
     <span className="hm-news-text">
     <small>{x.kind}</small>
     <b>{x.title}</b>
     </span>
     <span className="hm-news-when">{ago(x.created_at)}</span>
     </button>)}</div>
  </section>}
 </div>;
}

// Aniversariantes: o de hoje em destaque com "Mandar axé"; os próximos 30 dias em círculos.
export function HomeBirthdays({ p, go }) {
  const [people, setPeople] = useState(null);
  useEffect(() => {
    supabase.from("profiles").select("id,name,date_of_birth,orixa_symbol").eq("is_active", true).then(({ data }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const list = (data || []).filter((x) => /^\d{4}-\d{2}-\d{2}/.test(x.date_of_birth || "")).map((x) => {
        const m = Number(x.date_of_birth.slice(5, 7)), d = Number(x.date_of_birth.slice(8, 10));
        let next = new Date(today.getFullYear(), m - 1, d);
        if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
        return { ...x, next, days: Math.round((next - today) / 864e5) };
      }).filter((x) => x.days <= 30).sort((a, b) => a.days - b.days || a.name.localeCompare(b.name, "pt-BR"));
      setPeople(list);
    });
  }, []);
  if (!people || !people.length) return null;
  const first = (n) => {
    const w = String(n || "").trim().split(/\s+/)[0] || "";
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  };
  const todays = people.filter((x) => x.days === 0), upcoming = people.filter((x) => x.days > 0).slice(0, 12);
  const when = (x) => x.days === 1 ? "amanhã" : x.days < 7 ? "em " + x.days + " dias" : x.next.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const others = todays.filter((x) => x.id !== p.id), me = todays.some((x) => x.id === p.id);
  return <section className="hm-section bd" aria-labelledby="bd-title">
    <h2 id="bd-title" className="hm-label">Aniversariantes</h2>
    {me && <div className="bd-today is-me">
      <span className="bd-today-orixa"><OrixaIcon name={p.orixa_symbol} size={46} /></span>
      <span className="bd-today-text"><small>Hoje é o seu dia</small><b>Feliz aniversário, {first(p.name)}!</b><span>A casa inteira celebra a sua caminhada. Muito axé!</span></span>
      <Cake size={22} className="bd-cake" />
    </div>}
    {others.map((x) => <div className="bd-today" key={x.id}>
      <span className="bd-today-orixa"><OrixaIcon name={x.orixa_symbol} size={46} /></span>
      <span className="bd-today-text"><small>Hoje é aniversário de</small><b>{standardizeName(x.name)}</b></span>
      <button type="button" className="btn primary bd-axe" onClick={() => go("community", { muralDraft: "Feliz aniversário, " + first(x.name) + "! Que os Orixás iluminem seu caminho. Muito axé! 🙏🎂" })}>Mandar axé</button>
    </div>)}
    {upcoming.length > 0 && <div className="bd-row" role="list">{upcoming.map((x) => <div className="bd-person" role="listitem" key={x.id}>
      <span className="bd-circle"><OrixaIcon name={x.orixa_symbol} size={38} /></span>
      <b>{first(x.name)}</b>
      <small>{when(x)}</small>
    </div>)}</div>}
  </section>;
}
