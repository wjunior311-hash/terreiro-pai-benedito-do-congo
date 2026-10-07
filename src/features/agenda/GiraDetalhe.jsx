// Página da gira para o membro (também usada como prévia na gestão).
import { useEffect, useState } from "react";
import { CalendarDays, Check, X, Users, ArrowLeft, Clock, Info, Repeat, ListChecks, ShoppingBag, MessageSquare, Wallet, Sparkles } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { err, lineInfo, money, typeLabel } from "../../lib/helpers.js";
import { Field } from "../../components/ui.jsx";
import { useReadableCover } from "../../components/GiraCard.jsx";

export function GiraDetail({ p, gira, back, preview = null }) {
  const isPreview = !!preview;
  const [subtasks, setSubtasks] = useState({}), [turnTaskNames, setTurnTaskNames] = useState({});
  const [resp, setResp] = useState(null),
    [turns, setTurns] = useState([]),
    [availability, setAvailability] = useState([]),
    [tasks, setTasks] = useState([]),
    [statuses, setStatuses] = useState({}),
    [exchanges, setExchanges] = useState([]),
    [notifications, setNotifications] = useState([]),
    [turnChangeNotifications, setTurnChangeNotifications] = useState([]),
    [turnAvailabilityNotifications, setTurnAvailabilityNotifications] = useState([]),
    [confirmedPeople, setConfirmedPeople] = useState([]),
    [turnPeople, setTurnPeople] = useState({}),
    [showConfirmed, setShowConfirmed] = useState(false),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState(false),
    [swap, setSwap] = useState({ current: "", requested: [], message: "" }),
    [tab, setTab] = useState(preview?.phase === "day" ? "tasks" : "info"),
    [tabTouched, setTabTouched] = useState(false);
  const start = new Date(gira.starts_at), now = /* @__PURE__ */ new Date(), hasTaskAgenda = !!gira.use_task_list, open = isPreview ? hasTaskAgenda && preview.phase === "choose" : hasTaskAgenda && now >= new Date(start.getTime() - 10 * 864e5) && (now < new Date(start.getTime() - 3 * 864e5) || gira.turn_availability_reopened_until && now < new Date(gira.turn_availability_reopened_until)), released = isPreview ? hasTaskAgenda && preview.phase === "day" : hasTaskAgenda && now >= new Date(start.getTime() - 3 * 864e5) && !(gira.turn_availability_reopened_until && now < new Date(gira.turn_availability_reopened_until));
  const formatShiftDate = (d) => d ? (/* @__PURE__ */ new Date(d + "T12:00:00")).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }) : "";
  const load = async () => {
    if (isPreview) return;
    await supabase.rpc("expire_gira_exchange_requests");
    const [{ data: r }, { data: confirmed }, { data: t }, { data: a }, { data: turnPeopleRows }, { data: x }, { data: n }, { data: turnChanges }, { data: availabilityNotifications }] = await Promise.all([
      supabase.from("gira_responses").select("*").eq("gira_id", gira.id).eq("profile_id", p.id).maybeSingle(),
      supabase.rpc("get_gira_confirmed_people", { p_gira_id: gira.id }),
      supabase.rpc("gira_turn_summary", { p_gira_id: gira.id }),
      supabase.from("gira_turn_availability").select("gira_turn_id").eq("profile_id", p.id),
      supabase.rpc("get_gira_turn_people", { p_gira_id: gira.id }),
      supabase.from("task_exchange_requests").select("*").eq("gira_id", gira.id).or("requester_id.eq." + p.id + ",accepted_by.eq." + p.id).order("created_at", { ascending: false }),
      supabase.from("task_exchange_notifications").select("id,request_id,status,created_at").eq("recipient_id", p.id).eq("status", "unread").order("created_at", { ascending: false }),
      supabase.rpc("get_my_gira_turn_change_notifications", { p_gira_id: gira.id }),
      supabase.rpc("get_my_gira_turn_availability_notifications", { p_gira_id: gira.id })
    ]);
    const turnRows = hasTaskAgenda ? t || [] : [];
    const ids = turnRows.map((v) => v.turn_id);
    const { data: turnDetails } = ids.length ? await supabase.from("gira_turns").select("*").in("id", ids).order("sort_order") : { data: [] };
    const details = turnDetails || [];
    const merged = turnRows.map((x2) => ({ ...x2, ...details.find((d) => d.id === x2.turn_id) || {} }));
    setResp(r);
    setTurns(merged);
    setAvailability(hasTaskAgenda ? (a || []).map((v) => v.gira_turn_id) : []);
    setExchanges(x || []);
    setNotifications(n || []);
    setTurnChangeNotifications(turnChanges || []);
    setTurnAvailabilityNotifications((availabilityNotifications || []).filter((v) => !v.read_at));
    const confirmedPeopleRows = (confirmed || []).map((v) => ({ id: v.profile_id, name: v.name }));
    setConfirmedPeople(confirmedPeopleRows.sort((a2, b) => a2.name.localeCompare(b.name, "pt-BR")));
    const groupedTurnPeople = {};
    (turnPeopleRows || []).forEach((v) => {
      (groupedTurnPeople[v.gira_turn_id] ??= []).push({ id: v.profile_id, name: v.name });
    });
    Object.keys(groupedTurnPeople).forEach((k) => groupedTurnPeople[k].sort((a2, b) => a2.name.localeCompare(b.name, "pt-BR")));
    setTurnPeople(groupedTurnPeople);
    if (hasTaskAgenda) {
      const { data: names } = await supabase.from("tasks").select("id,name,gira_turn_id,sort_order").eq("gira_id", gira.id).order("sort_order");
      const tm = {};
      (names || []).forEach((v) => (tm[v.gira_turn_id] ??= []).push(v.name));
      setTurnTaskNames(tm);
    } else setTurnTaskNames({});
    if (released) {
      const { data: ts } = await supabase.rpc("gira_turn_tasks", { p_gira_id: gira.id });
      setTasks(ts || []);
      {
        const tids = (ts || []).map((v) => v.id);
        if (tids.length) {
          const { data: sb } = await supabase.from("gira_task_subtasks").select("id,task_id,title,sort_order").in("task_id", tids).order("sort_order");
          const sm = {};
          (sb || []).forEach((v) => (sm[v.task_id] ??= []).push(v));
          setSubtasks(sm);
        } else setSubtasks({});
      }
      const ids2 = (ts || []).map((v) => v.id);
      if (ids2.length) {
        const { data: ss } = await supabase.from("task_status").select("task_id,done,completed_by,completed_at").in("task_id", ids2);
        const m = {};
        (ss || []).forEach((v) => m[v.task_id] = v);
        setStatuses(m);
      } else setStatuses({});
    } else {
      setTasks([]);
      setStatuses({});
    }
  };
  useEffect(() => {
    if (!isPreview) return;
    const ts = preview.turns.map((t) => ({ ...t, occupied: 0, available: t.capacity, is_full: false }));
    setTurns(ts);
    setTasks(preview.tasks);
    const sm = {}, tm = {};
    preview.tasks.forEach((t) => {
      sm[t.id] = (t.subtasks || []).map((s) => ({ id: s.id, title: s.name }));
      (tm[t.gira_turn_id] ??= []).push(t.name);
    });
    setSubtasks(sm);
    setTurnTaskNames(tm);
    if (preview.phase === "day") {
      setResp({ status: "going" });
      setAvailability(ts.map((t) => t.turn_id));
      setConfirmedPeople([{ id: p.id, name: p.name || "Você" }]);
    }
  }, []);
  useEffect(() => {
    if (isPreview) return;
    load();
    const channel = supabase.channel("gira-capacity-" + gira.id).on("postgres_changes", { event: "*", schema: "public", table: "gira_turn_availability" }, () => load()).on("postgres_changes", { event: "*", schema: "public", table: "task_status" }, () => {
      if (released) load();
    }).subscribe();
    const timer = setInterval(load, open ? 3e3 : 15e3);
    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [gira.id, p.id, released]);
  const answer = async (status) => {
    if (status === "going" && hasTaskAgenda && open) {
      setTab("turn");
      setTabTouched(true);
    }
    if (isPreview) {
      setResp({ status });
      if (status === "not_going") setAvailability([]);
      setConfirmedPeople(status === "going" ? [{ id: p.id, name: p.name || "Você" }] : []);
      return;
    }
    setBusy(true);
    setMsg("");
    const { data, error } = await supabase.from("gira_responses").upsert({ gira_id: gira.id, profile_id: p.id, status }, { onConflict: "gira_id,profile_id" }).select().single();
    if (error) setMsg(err(error));
    else {
      setResp(data);
      if (status === "not_going") {
        await supabase.from("gira_turn_availability").delete().eq("profile_id", p.id).in("gira_turn_id", turns.map((x) => x.turn_id));
        setAvailability([]);
      }
    }
    setBusy(false);
    load();
  };
  const toggle = async (id) => {
    if (isPreview) {
      setAvailability((v) => v.includes(id) ? v.filter((x) => x !== id) : [...v, id]);
      return;
    }
    setMsg("");
    setBusy(true);
    const selected = availability.includes(id);
    const { error } = await supabase.rpc("set_gira_turn_availability", { p_gira_turn_id: id, p_available: !selected });
    if (error) setMsg(err(error));
    setBusy(false);
    load();
  };
  const toggleTask = async (task) => {
    if (isPreview) {
      setStatuses((v) => ({ ...v, [task.id]: { done: !v[task.id]?.done } }));
      return;
    }
    setBusy(true);
    const done = !!statuses[task.id]?.done;
    const { error } = await supabase.rpc("gira_turn_task_status", { p_task_id: task.id, p_done: !done });
    if (error) setMsg(err(error));
    setBusy(false);
    load();
  };
  const createSwap = async () => {
    if (!swap.current || !swap.requested.length) {
      setMsg("Selecione seu turno atual e pelo menos um horário desejado.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("create_gira_turn_exchange", { p_gira_id: gira.id, p_current_turn_id: swap.current, p_requested_turn_ids: swap.requested, p_message: swap.message });
    setMsg(error ? err(error) : "Solicitação de troca enviada. As pessoas dos horários escolhidos serão avisadas.");
    setBusy(false);
    setSwap({ current: "", requested: [], message: "" });
    load();
  };
  const acceptSwap = async (id) => {
    setBusy(true);
    const { error } = await supabase.rpc("accept_gira_turn_exchange", { p_request_id: id });
    setMsg(error ? err(error) : "Troca realizada com sucesso.");
    setBusy(false);
    load();
  };
  const declineSwap = async (id) => {
    await supabase.from("task_exchange_notifications").update({ status: "removed" }).eq("request_id", id).eq("recipient_id", p.id);
    load();
  };
  const markTurnChangeRead = async (id) => {
    await supabase.rpc("mark_gira_turn_change_notification_read", { p_notification_id: id });
    setTurnChangeNotifications((v) => v.filter((x) => x.id !== id));
  };
  const markTurnAvailabilityNotificationRead = async (id) => {
    await supabase.rpc("mark_gira_turn_availability_notification_read", { p_notification_id: id });
    setTurnAvailabilityNotifications((v) => v.filter((x) => x.id !== id));
  };
  const availableLabel = (t) => `${t.occupied}/${t.capacity} pessoas`;
  const taskGroups = {};
  tasks.forEach((t) => (taskGroups[t.gira_turn_id] ??= []).push(t));
  const myTurns = turns.filter((t) => availability.includes(t.turn_id));
  const fullAlternatives = turns.filter((t) => t.is_full && !availability.includes(t.turn_id));
  const isAnyShiftToday = myTurns.some((t) => t.shift_date === (/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
  const cover = useReadableCover(gira.art_path, gira.cover_color || "#65745a");
  const coverStyle2 = { "--gira-cover-image": gira.art_path ? `url("${gira.art_path}")` : "none", "--gira-cover-color": gira.cover_color || "#65745a", "--gira-text-color": cover.color, "--gira-cover-overlay": cover.overlay };
  const going = resp?.status === "going";
  const incomingSwaps = notifications.map((n) => ({ n, x: exchanges.find((e) => e.id === n.request_id) })).filter(({ x }) => x && x.status === "open");
  const myTaskList = myTurns.flatMap((t) => taskGroups[t.turn_id] || []);
  const myDone = myTaskList.filter((t) => statuses[t.id]?.done).length;
  // abre direto na aba que importa: troca pendente → Meu turno; dia do turno → Tarefas
  useEffect(() => {
    if (tabTouched || isPreview) return;
    if (incomingSwaps.length) setTab("turn");
    else if (released && going && isAnyShiftToday) setTab("tasks");
  }, [incomingSwaps.length, released, going, isAnyShiftToday]);
  const pickTab = (k) => {
    setTab(k);
    setTabTouched(true);
  };
  const tabs = [["info", "Informações", Info, null], ["turn", "Meu turno", Clock, incomingSwaps.length ? "!" : null], ["tasks", "Tarefas", ListChecks, released && going && myTaskList.length ? myDone + "/" + myTaskList.length : null]];
  const goInfo = <button className="btn" onClick={() => pickTab("info")}><Info size={15} /> Ir para Informações</button>;
  const notGoingMsg = (what) => <div className="card gd-empty">
    <Sparkles size={22} />
    <h3>{resp?.status === "not_going" ? "Você marcou que não vai" : "Confirme sua presença primeiro"}</h3>
    <p className="muted">{resp?.status === "not_going" ? "Se mudar de ideia, confirme presença em Informações para " + what + "." : "Depois de marcar “Vou participar” em Informações, " + what + " aparece aqui."}</p>
    {goInfo}
  </div>;
  const noShiftsMsg = <div className="card gd-empty">
    <Clock size={22} />
    <h3>Esta gira não tem divisão por turnos</h3>
    <p className="muted">Basta confirmar sua presença. Todas as informações estão na aba Informações.</p>
    {goInfo}
  </div>;
  return <div className="gd">
  {!isPreview && <button className="btn gira-detail-back" onClick={back}>
    <ArrowLeft size={15} /> Todas as giras</button>}
  <section className={"gira-public-hero gd-hero " + (gira.art_path ? "has-cover" : "no-cover")} style={coverStyle2}>
   <div className="gira-public-hero-content">
    <span className="activity-tag gira-public-tag">{typeLabel(gira.activity_type)}</span>
    <h1>{gira.name}</h1>
    <div className="gira-public-meta">
      <span>
      <CalendarDays size={16} />{new Date(gira.starts_at).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long" })}</span>
      <span>
      <Clock size={16} />{new Date(gira.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
      {going && <span className="gd-going"><Check size={15} /> Você vai</span>}
      </div>
   </div>
  </section>
  {msg && <div className="toast">{msg}</div>}
  {turnChangeNotifications.filter((x) => !x.read_at).map((n) => <div className="card gira-turn-change-notice" key={n.id}>
    <div className="row between">
    <div>
    <span className="eyebrow">ALTERAÇÃO DE TURNO</span>
    <h3>Seu turno foi alterado</h3>
    <p className="muted">{n.message}</p>
    </div>
    <button className="btn" onClick={() => markTurnChangeRead(n.id)}>Entendi</button>
    </div>
    </div>)}
  {turnAvailabilityNotifications.map((n) => <div className="card gira-turn-change-notice" key={n.id}>
    <div className="row between">
    <div>
    <span className="eyebrow">AVISO DA GIRA</span>
    <h3>Novidade nesta gira</h3>
    <p className="muted">{n.message}</p>
    </div>
    <button className="btn" onClick={() => markTurnAvailabilityNotificationRead(n.id)}>Entendi</button>
    </div>
    </div>)}
  <div className="gd-tabs" role="tablist" aria-label="Seções da gira">{tabs.map(([k, label, Icon, badge]) => <button key={k} role="tab" aria-selected={tab === k} className={"gd-tab" + (tab === k ? " is-on" : "")} onClick={() => pickTab(k)}>
    <Icon size={17} /><span>{label}</span>{badge && <i className={"gd-badge" + (badge === "!" ? " alert" : "")}>{badge}</i>}</button>)}</div>

  {tab === "info" && <div className="gd-panel" role="tabpanel">
  <div className="gira-public-actions">
    <button className={"btn " + (going ? "primary is-selected going" : "")} disabled={busy} onClick={() => answer("going")}>
    <Check size={15} /> {going ? "Confirmado: vou participar" : "Vou participar"}</button>
    <button className={"btn " + (resp?.status === "not_going" ? "is-selected not-going" : "")} disabled={busy} onClick={() => answer("not_going")}>
    <X size={15} /> {resp?.status === "not_going" ? "Confirmado: não vou" : "Não vou participar"}</button>
    </div>{resp?.status && <div className={"gira-response-confirmation " + resp.status}>
    <Check size={16} />
    <span>
    <b>{going ? "Presença confirmada." : "Resposta registrada."}</b> {going ? "Você marcou que vai participar desta gira." : "Você marcou que não vai participar desta gira."}</span>
    </div>}
  {going && hasTaskAgenda && open && !myTurns.length && <button className="gd-next" onClick={() => pickTab("turn")}>
    <Clock size={18} /><span><b>Próximo passo: escolha seu turno</b><small>Marque os horários em que você pode ajudar.</small></span></button>}
  <div className="gira-public-confirmed-link">
    <button className="gira-confirmed-btn" onClick={() => setShowConfirmed(true)}>
    <Users size={14} /> Veja quem já confirmou <span>{confirmedPeople.length}</span>
    </button>
    </div>
  <div className="gira-public-overview">
   {(gira.contribution_amount > 0 || gira.contribution_due_date) && <div className="gira-public-info-card">
     <span className="gira-public-info-icon"><Wallet size={16} /></span>
     <div>
     <span className="eyebrow">CONTRIBUIÇÃO</span>
     <strong>{Number(gira.contribution_amount) > 0 ? money(gira.contribution_amount) : "Valor a confirmar"}</strong>{gira.contribution_due_date && <small>Vencimento {(/* @__PURE__ */ new Date(gira.contribution_due_date + "T12:00:00")).toLocaleDateString("pt-BR")}</small>}</div>
     </div>}
   {gira.entity_lines?.length > 0 && <div className="gira-public-info-card">
     <span className="gira-public-info-icon"><Sparkles size={16} /></span>
     <div>
     <span className="eyebrow">ENTIDADES DA GIRA</span>
     <div className="gira-public-chip-list">{gira.entity_lines.map((id) => {
    const x = lineInfo(id);
    return x ? <span key={id}>{x[1]} {x[2]}</span> : null;
  })}</div></div></div>}
  </div>
  {gira.what_to_bring && <div className="card gira-public-section">
    <div className="gira-public-section-title">
    <span className="gira-public-info-icon"><ShoppingBag size={16} /></span>
    <div>
    <span className="eyebrow">O QUE LEVAR</span>
    <h3>Prepare-se para a Gira</h3>
    </div>
    </div>
    <p className="gira-public-preserve">{gira.what_to_bring}</p>
    </div>}
  {gira.notes && <div className="card gira-public-section">
    <div className="gira-public-section-title">
    <span className="gira-public-info-icon"><MessageSquare size={16} /></span>
    <div>
    <span className="eyebrow">OBSERVAÇÕES</span>
    <h3>Informações importantes</h3>
    </div>
    </div>
    <p className="gira-public-preserve">{gira.notes}</p>
    </div>}
  </div>}

  {tab === "turn" && <div className="gd-panel" role="tabpanel">
  {!hasTaskAgenda ? noShiftsMsg : !going ? notGoingMsg("escolher seu turno") : <>
  <div className="card">
    <span className="eyebrow">DISPONIBILIDADE</span>{open ? <>
    <h3>Marque um ou mais turnos em que você pode participar.</h3>
    <p className="muted small">A capacidade é atualizada conforme outras pessoas fazem suas escolhas.</p>
    <div className="turn-choice-grid">{turns.map((t) => {
    const selected = availability.includes(t.turn_id), full = t.is_full && !selected;
    return <button key={t.turn_id} className={"btn " + (selected ? "primary" : "")} disabled={busy || full} onClick={() => toggle(t.turn_id)}>
      <b>{t.label}</b>
      <small>{formatShiftDate(t.shift_date)}</small>{(turnTaskNames[t.turn_id] || []).length > 0 && <small className="gira-turn-task-names">{turnTaskNames[t.turn_id].join(" · ")}</small>}<span>{full ? "COMPLETO" : availableLabel(t)}</span>
      </button>;
  })}</div>
    </> : released ? <>
    <h3>A escolha de turnos está encerrada.</h3>{!availability.length ? <div className="deadline-message"><b>O prazo para informar sua disponibilidade terminou.</b>
    <p>A organização da gira já está fechando os turnos e distribuindo as tarefas. Como sua disponibilidade não foi informada a tempo, não é mais possível marcar pelo aplicativo.</p>
    <p>
    <b>Fale diretamente com os Pais de Santo para ver como proceder.</b>
    </p>
    </div> : <p className="muted">Sua disponibilidade foi registrada. Veja abaixo o seu turno e, na aba Tarefas, o que fazer.</p>}</> : <>
    <h3>A escolha de turnos ainda não abriu.</h3>
    <p className="muted">Ela abre 10 dias antes da gira. Você vai receber um aviso.</p>
    </>}</div>
  {myTurns.length > 0 && <div className="gd-myturns">{myTurns.map((turn) => <div className="card gd-turn" key={turn.turn_id}>
    <span className="eyebrow">SEU TURNO</span>
    <h3>{turn.label}</h3>
    <span className="muted small">{formatShiftDate(turn.shift_date)}</span>
    {(turnPeople[turn.turn_id] || []).length > 0 && <div className="gira-turn-people">
      <span className="muted small">Com você neste turno</span>
      <div className="gira-turn-people-list">{(turnPeople[turn.turn_id] || []).map((person) => <span key={person.id} className={person.id === p.id ? "gira-turn-person me" : ""}>{person.name}{person.id === p.id ? " (você)" : ""}</span>)}</div>
      </div>}
    </div>)}</div>}
  {incomingSwaps.map(({ n, x }) => {
    const requested = turns.filter((t) => x.requested_turn_ids?.includes(t.turn_id));
    return <div className="card gd-swap-in" key={n.id}>
      <span className="eyebrow"><Repeat size={13} /> TROCA DISPONÍVEL</span>
      <h3>Uma pessoa gostaria de trocar de horário com você</h3>
      <p className="muted">Ela precisa de uma vaga em outro turno.</p>{requested.length > 0 && <div className="list">{requested.map((t) => <div className="list-item" key={t.turn_id}>
      <b>{t.label}</b>
      <small className="muted">{formatShiftDate(t.shift_date)}</small>
      </div>)}</div>}{x.message && <p>{x.message}</p>}<div className="choice">
      <button className="btn primary" disabled={busy} onClick={() => acceptSwap(x.id)}>Aceitar troca</button>
      <button className="btn" disabled={busy} onClick={() => declineSwap(x.id)}>Recusar</button>
      </div>
      </div>;
  })}
  {exchanges.filter((x) => x.requester_id === p.id && (x.status === "open" || x.status === "expired" || x.status === "accepted")).map((x) => x.status === "open" ? <div className="card" key={"out-" + x.id}>
    <span className="eyebrow">TROCA EM ANDAMENTO</span>
    <p className="muted">Sua solicitação de troca está aguardando alguém assumir. O prazo é de até 3 dias.</p>
    </div> : x.status === "accepted" ? <div className="card" key={"out-" + x.id}>
    <span className="eyebrow">TROCA CONCLUÍDA</span>
    <p>A troca foi realizada com sucesso.</p>
    </div> : <div className="card" key={"out-" + x.id}>
    <span className="eyebrow">TROCA ENCERRADA</span>
    <p><b>Não foi possível realizar sua troca.</b>
    </p>
    <p className="muted">Ninguém conseguiu assumir a troca dentro do prazo. Converse com os Pais de Santo para ver outra possibilidade.</p>
    </div>)}
  {open && fullAlternatives.length > 0 && <div className="card">
    <span className="eyebrow">TROCA DE HORÁRIO</span>
    <h3>Tentar trocar de horário</h3>
    <p className="muted small">Se o horário que você precisa estiver completo, você pode pedir uma troca. A solicitação fica aberta por no máximo 3 dias.</p>
    <Field label="Seu turno atual">
    <select className="select" value={swap.current} onChange={(e) => setSwap((v) => ({ ...v, current: e.target.value, requested: [] }))}>
    <option value="">Selecione</option>{myTurns.map((t) => <option value={t.turn_id} key={t.turn_id}>{t.label}</option>)}</select>
    </Field>
    <Field label="Horários completos desejados">
    <div className="choice">{fullAlternatives.filter((t) => t.turn_id !== swap.current).map((t) => <button type="button" className={"btn " + (swap.requested.includes(t.turn_id) ? "primary" : "")} key={t.turn_id} onClick={() => setSwap((v) => ({ ...v, requested: v.requested.includes(t.turn_id) ? v.requested.filter((x) => x !== t.turn_id) : [...v.requested, t.turn_id] }))}>{t.label}</button>)}</div>
    </Field>
    <Field label="Mensagem opcional">
    <textarea className="textarea" value={swap.message} onChange={(e) => setSwap((v) => ({ ...v, message: e.target.value }))} />
    </Field>
    <button className="btn primary" disabled={busy || !swap.current || !swap.requested.length} onClick={createSwap}>Tentar trocar de horário</button>
    </div>}
  </>}
  </div>}

  {tab === "tasks" && <div className="gd-panel" role="tabpanel">
  {!hasTaskAgenda ? noShiftsMsg : !going ? notGoingMsg("acompanhar as tarefas") : !released ? <div className="card gd-empty">
    <ListChecks size={22} />
    <h3>As tarefas aparecem perto da gira</h3>
    <p className="muted">Três dias antes, quando os turnos fecham, as tarefas do seu turno ficam aqui para você e o seu grupo marcarem o que já foi feito.</p>
    {open && <button className="btn" onClick={() => pickTab("turn")}><Clock size={15} /> Escolher meu turno</button>}
  </div> : !myTurns.length ? <div className="card gd-empty">
    <ListChecks size={22} />
    <h3>Você não está em nenhum turno</h3>
    <p className="muted">Fale com os Pais de Santo se quiser ajudar nesta gira.</p>
  </div> : <>
    <p className="muted small gd-hint">As tarefas são coletivas: todas as pessoas do mesmo turno veem e marcam o mesmo progresso.</p>
    {myTurns.map((turn) => {
    const list = taskGroups[turn.turn_id] || [], done = list.filter((t) => statuses[t.id]?.done).length, isTurnToday = isPreview || turn.shift_date === (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), pct = list.length ? Math.round(done / list.length * 100) : 0;
    return <div className="card gd-taskturn" key={turn.turn_id}>
      <div className="row between">
      <div>
      <span className="eyebrow">SEU TURNO</span>
      <h3>{turn.label}</h3>
      <span className="muted small">{formatShiftDate(turn.shift_date)}</span>
      </div>
      <span className="pill">{done}/{list.length} · {pct}%</span>
      </div>
      <div className="gd-progress" aria-hidden="true"><i style={{ width: pct + "%" }} /></div>
      {!isTurnToday && <p className="muted small">Você poderá marcar as tarefas no dia deste turno.</p>}{list.map((task) => <button key={task.id} className={"list-item gd-task " + (statuses[task.id]?.done ? "task-done" : "")} disabled={!isTurnToday || busy} onClick={() => toggleTask(task)}>
      <span className="gd-check">{statuses[task.id]?.done && <Check size={15} />}</span>
      <span className="gd-task-text">
      <b>{task.name}</b>{task.instructions && <small className="muted">{task.instructions}</small>}{(subtasks[task.id] || []).length > 0 && <ul className="gira-subtasks">{subtasks[task.id].map((s) => <li key={s.id}>{s.title}</li>)}</ul>}</span>
      </button>)}{!list.length && <p className="muted small">Nenhuma tarefa cadastrada para este turno.</p>}</div>;
  })}</>}
  </div>}

  {showConfirmed && <div className="modal-back" onClick={() => setShowConfirmed(false)}>
    <div className="modal gira-confirmed-modal" onClick={(e) => e.stopPropagation()}>
    <div className="row between">
    <div>
    <span className="eyebrow">PRESENÇAS</span>
    <h3>Quem já confirmou</h3>
    <p className="muted small">{confirmedPeople.length} {confirmedPeople.length === 1 ? "pessoa confirmou" : "pessoas confirmaram"} presença nesta atividade.</p>
    </div>
    <button className="btn" onClick={() => setShowConfirmed(false)}>Fechar</button>
    </div>{confirmedPeople.length ? <div className="gira-confirmed-list">{confirmedPeople.map((person) => <div className="gira-confirmed-person" key={person.id}>
    <Users size={15} />
    <span>{person.name}{person.id === p.id && <b> (você)</b>}</span>
    </div>)}</div> : <div className="empty">
    <p>Ninguém confirmou presença ainda.</p>
    </div>}</div>
    </div>}
 </div>;
}
