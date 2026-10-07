// Gestão de giras: lista, wizard de criação/edição, divisão dos turnos.
import React, { useEffect, useState } from "react";
import { Check, X, Plus, ChevronRight, ClipboardList, Save, Trash2, ArrowLeft, Pencil } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { entityLines, err, lineInfo, money, newId, pad2, typeIcons, typeLabel, types } from "../../lib/helpers.js";
import { FieldError } from "../../components/ui.jsx";
import { UnifiedGiraCard } from "../../components/GiraCard.jsx";
import { Giras } from "../agenda/Agenda.jsx";
import { GiraDetail } from "../agenda/GiraDetalhe.jsx";

export function AdminGiraTurnControl({ gira, editor = false }) {
  const [turns, setTurns] = useState([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [capacityDrafts, setCapacityDrafts] = useState({});
  const load = async () => {
    const { data: t, error: te } = await supabase.from("gira_turns").select("*").eq("gira_id", gira.id).order("sort_order");
    if (te) {
      setMessage(err(te));
      return;
    }
    const ids = (t || []).map((x) => x.id);
    const [{ data: a, error: ae }, { data: p, error: pe }] = ids.length ? await Promise.all([supabase.from("gira_turn_availability").select("gira_turn_id,profile_id").in("gira_turn_id", ids), supabase.from("profiles").select("id,name").eq("is_active", true).order("name")]) : [{ data: [], error: null }, { data: [], error: null }];
    if (ae || pe) {
      setMessage(err(ae || pe));
      return;
    }
    const names = Object.fromEntries((p || []).map((x) => [x.id, x.name]));
    const rows = (t || []).map((turn) => ({ ...turn, people: (a || []).filter((x) => x.gira_turn_id === turn.id).map((x) => ({ id: x.profile_id, name: names[x.profile_id] || "Pessoa" })).sort((a2, b) => a2.name.localeCompare(b.name, "pt-BR")) }));
    setTurns(rows);
    setCapacityDrafts(Object.fromEntries(rows.map((x) => [x.id, String(x.capacity || "")])));
  };
  useEffect(() => {
    load();
  }, [gira.id]);
  const saveCapacity = async (turn) => {
    const value = Number(capacityDrafts[turn.id]);
    if (!Number.isInteger(value) || value < 1) {
      setMessage("A capacidade deve ser de pelo menos 1 pessoa.");
      return;
    }
    if (value < turn.people.length) {
      setMessage("A capacidade não pode ser menor que as pessoas já alocadas.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("admin_set_gira_turn_capacity", { p_gira_turn_id: turn.id, p_capacity: value });
    setMessage(error ? err(error) : "Capacidade de " + turn.label + " atualizada.");
    setBusy(false);
    if (!error) load();
  };
  const reopen = async () => {
    if (busy) return;
    if (!window.confirm("Reabrir a escolha de turnos por 72 horas e avisar todas as pessoas que confirmaram esta gira?")) return;
    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.rpc("admin_reopen_gira_turn_availability", { p_gira_id: gira.id, p_hours: 72 });
    setMessage(error ? err(error) : `Disponibilidade reaberta por 72 horas. ${data || 0} pessoa(s) avisada(s).`);
    setBusy(false);
    if (!error) load();
  };
  const move = async (person, from, to) => {
    if (!to || busy) return;
    const target = turns.find((x) => x.id === to);
    if (target && target.capacity > 0 && target.people.length >= target.capacity) {
      setMessage("Esse turno está completo.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { error } = await supabase.rpc("admin_move_gira_participant", { p_gira_id: gira.id, p_profile_id: person.id, p_from_turn_id: from, p_to_turn_id: to });
    setMessage(error ? err(error) : person.name + " foi movido para " + (target?.label || "o novo turno") + ". A pessoa receberá uma notificação.");
    setBusy(false);
    if (!error) load();
  };
  return <div className="card gira-admin-turn-control">
    <div className="row between">
    <div>
    <span className="eyebrow">DIVISÃO DOS TURNOS</span>
    <h3>Organizar quem fica em cada turno</h3>
    <p className="muted small">Defina a capacidade de cada turno e, depois, mova pessoas quando os Pais de Santo pedirem uma alteração.</p>
    </div>
    <button className="btn primary" disabled={busy} onClick={reopen}>Reabrir escolha e avisar confirmados</button>
    </div>{message && <div className="toast">{message}</div>}<div className="gira-admin-turn-grid">{turns.map((turn) => <div className="gira-admin-turn-card" key={turn.id}>
    <div className="row between">
    <div>
    <b>{turn.label}</b>
    <span className="muted small">{turn.shift_date ? (/* @__PURE__ */ new Date(turn.shift_date + "T12:00:00")).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }) : ""}</span>
    </div>
    <span className="pill">{turn.people.length}/{turn.capacity || "—"}</span>
    </div>
    <div className="gira-admin-turn-capacity">
    <label className="muted small">Capacidade</label>
    <div className="row">
    <input className="input" type="number" min="1" value={capacityDrafts[turn.id] || ""} onChange={(e) => setCapacityDrafts((v) => ({ ...v, [turn.id]: e.target.value }))} />
    <button className="btn" disabled={busy} onClick={() => saveCapacity(turn)}>Salvar</button>
    </div>
    </div>{turn.people.length ? <div className="gira-admin-turn-people">{turn.people.map((person) => <div className="gira-admin-turn-person" key={person.id}>
    <div>
    <b>{person.name}</b>
    </div>
    <div className="gira-admin-turn-move">
    <select className="select" value="" disabled={busy} onChange={(e) => {
    const to = e.target.value;
    if (to) {
      const target = turns.find((x) => x.id === to);
      if (target && target.capacity > 0 && target.people.length >= target.capacity) {
        setMessage("Esse turno está completo.");
        return;
      }
      if (window.confirm("Mover " + person.name + " de " + turn.label + " para " + target.label + "?")) move(person, turn.id, to);
    }
  }}>
    <option value="">Mover para…</option>{turns.filter((x) => x.id !== turn.id).map((x) => <option value={x.id} key={x.id} disabled={x.capacity > 0 && x.people.length >= x.capacity}>{x.label}{x.capacity > 0 ? " · " + x.people.length + "/" + x.capacity : ""}</option>)}</select>
    </div>
    </div>)}</div> : <p className="muted small">Ninguém alocado neste turno.</p>}</div>)}</div>
    </div>;
}

export const GIRA_STATUS = { draft: "Rascunho", published: "Publicada" };

export const localDateOf = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
};

export const localTimeOf = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
};

export const shiftLabel = (s) => {
  if (!s?.date || !s?.time) return "Turno sem dia/horário";
  const [y, m, d] = s.date.split("-");
  const [h, mi] = s.time.split(":");
  return d + "/" + m + " · " + Number(h) + "h" + (mi && mi !== "00" ? mi : "");
};

export const wizardProgress = { read: (id) => {
  try {
    return JSON.parse(localStorage.getItem("gira-wizard:" + id) || "{}");
  } catch (e) {
    return {};
  }
}, write: (id, v) => {
  try {
    localStorage.setItem("gira-wizard:" + id, JSON.stringify(v));
  } catch (e) {
  }
}, clear: (id) => {
  try {
    localStorage.removeItem("gira-wizard:" + id);
  } catch (e) {
  }
} };

export const emptyGiraInfo = () => ({ name: "", date: "", time: "", activity_type: "gira", entity_lines: [], hasContribution: false, contribution_amount: "", contribution_due_date: "", what_to_bring: "", notes: "", coverMode: "color", cover_color: "#65745A", art_path: "", coverFile: null });

export const validateGiraInfo = (g) => {
  const e = {};
  if (!g.name.trim()) e.name = "Informe o nome da gira.";
  if (!g.date) e.date = "Informe o dia.";
  if (!g.time) e.time = "Informe o horário.";
  if (!types[g.activity_type]) e.activity_type = "Escolha o tipo de gira.";
  if (g.hasContribution && !(Number(g.contribution_amount) > 0)) e.contribution_amount = "Informe um valor maior que zero.";
  return e;
};

export const validateGiraShifts = (hasShifts, shifts) => {
  const e = {};
  if (hasShifts === null || hasShifts === void 0) {
    e.hasShifts = "Responda se a gira possui turnos de atividades.";
    return e;
  }
  if (!hasShifts) return e;
  if (!shifts.length) e.list = "Cadastre pelo menos um turno.";
  const seen = {};
  shifts.forEach((s) => {
    if (!s.date || !s.time) {
      e[s.id] = "Preencha o dia e o horário.";
      return;
    }
    const k = s.date + " " + s.time;
    if (seen[k]) e[s.id] = "Já existe um turno neste dia e horário.";
    seen[k] = true;
  });
  return e;
};

export const validateGiraTasks = (tasks, shifts) => {
  const e = {};
  const ids = new Set(shifts.map((s) => s.id));
  tasks.forEach((t) => {
    if (!t.name.trim()) e[t.id + ":name"] = "Informe o nome da tarefa.";
    if (!t.shiftId || !ids.has(t.shiftId)) e[t.id + ":shift"] = "Escolha um turno cadastrado.";
    t.subtasks.forEach((s) => {
      if (!s.name.trim()) e[s.id] = "Preencha ou remova esta subtarefa.";
    });
  });
  return e;
};

export const giraInfoPayload = (g) => ({ name: g.name.trim(), starts_at: (/* @__PURE__ */ new Date(g.date + "T" + g.time + ":00")).toISOString(), activity_type: g.activity_type, entity_lines: g.entity_lines, has_contribution: g.hasContribution, contribution_amount: g.hasContribution ? Number(g.contribution_amount) : 0, contribution_due_date: g.hasContribution && g.contribution_due_date ? g.contribution_due_date : null, what_to_bring: g.what_to_bring, notes: g.notes, art_path: g.coverMode === "image" ? g.art_path : "", cover_color: g.coverMode === "color" ? g.cover_color : "" });

export async function loadGiraStructure(giraId) {
  const [{ data: turns, error: te }, { data: tasks, error: ke }] = await Promise.all([
    supabase.from("gira_turns").select("id,shift_date,starts_at,label,sort_order,enabled,capacity").eq("gira_id", giraId).eq("enabled", true).order("sort_order"),
    supabase.from("tasks").select("id,name,gira_turn_id,sort_order").eq("gira_id", giraId).order("sort_order")
  ]);
  if (te || ke) throw te || ke;
  const taskIds = (tasks || []).map((t) => t.id);
  const { data: subs, error: se } = taskIds.length ? await supabase.from("gira_task_subtasks").select("id,task_id,title,sort_order").in("task_id", taskIds).order("sort_order") : { data: [], error: null };
  if (se) throw se;
  const shifts = (turns || []).map((t) => ({ id: t.id, date: t.shift_date || "", time: String(t.starts_at || "").slice(0, 5), label: t.label, capacity: t.capacity }));
  const list = (tasks || []).map((t) => ({ id: t.id, name: t.name || "", shiftId: t.gira_turn_id || "", subtasks: (subs || []).filter((s) => s.task_id === t.id).map((s) => ({ id: s.id, name: s.title || "" })) }));
  return { shifts, tasks: list };
}

export function GiraTurnManager({ p, editor = false }) {
  const [giras, setGiras] = useState([]),
    [loading, setLoading] = useState(true),
    [view, setView] = useState("list"),
    [selectedId, setSelectedId] = useState(""),
    [message, setMessage] = useState(""),
    [busyId, setBusyId] = useState(""),
    [wizardKey, setWizardKey] = useState(0);
  const lock = React.useRef(false);
  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("giras").select("*").order("starts_at", { ascending: false });
    if (error) setMessage(err(error));
    setGiras(data || []);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);
  const selected = giras.find((x) => x.id === selectedId);
  const openWizard = (id) => {
    setMessage("");
    setSelectedId(id || "");
    setWizardKey((k) => k + 1);
    setView("wizard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openDetail = (g) => {
    setMessage("");
    setSelectedId(g.id);
    setView("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const backToList = (msg) => {
    setMessage(msg || "");
    setView("list");
    setSelectedId("");
    load();
  };
  const duplicate = async (g) => {
    if (lock.current) return;
    lock.current = true;
    setBusyId(g.id);
    setMessage("");
    const { data, error } = await supabase.rpc("duplicate_gira", { p_gira_id: g.id });
    lock.current = false;
    setBusyId("");
    if (error) {
      setMessage("Não foi possível duplicar: " + err(error));
      return;
    }
    await load();
    openWizard(data);
    setMessage("Cópia criada como rascunho. Ajuste o que for necessário e publique quando estiver pronta.");
  };
  const remove = async (g) => {
    if (!confirm(g.status === "draft" ? "Excluir este rascunho? Esta ação não pode ser desfeita." : "Excluir esta gira publicada? Presenças, turnos e tarefas dela também deixarão de existir.")) return;
    const { error } = await supabase.rpc("delete_gira", { p_gira_id: g.id });
    if (error) setMessage(err(error));
    else backToList("Gira excluída.");
  };
  const drafts = giras.filter((g) => g.status === "draft"), published = giras.filter((g) => g.status !== "draft");
  const card = (g) => <div className={"gw-list-item " + (g.status === "draft" ? "is-draft" : "")} key={g.id}>
    <UnifiedGiraCard g={g} mode="admin" onOpen={openDetail} />
    <div className="gw-list-actions">
    <span className={"gw-status gw-status-" + (g.status === "draft" ? "draft" : "published")}>{GIRA_STATUS[g.status] || "Publicada"}</span>
    <div className="gw-list-buttons">
    <button className="btn" onClick={() => openDetail(g)}>Ver</button>
    <button className="btn" onClick={() => openWizard(g.id)}>
    <Pencil size={14} /> {g.status === "draft" ? "Continuar edição" : "Editar"}</button>
    <button className="btn" disabled={!!busyId} onClick={() => duplicate(g)}>{busyId === g.id ? "Duplicando…" : "Duplicar"}</button>
    </div>
    </div>
    </div>;
  if (view === "wizard") return <GiraWizard key={wizardKey} p={p} giraId={selectedId} initialMessage={message} onCreated={(id) => setSelectedId(id)} onExit={backToList} />;
  return <div className="gira-admin-page">
  {message && <div className="toast">{message}</div>}
  {view === "list" && <>
   <div className="row between gira-admin-header">
     <div>
     <span className="eyebrow">AGENDA DA CASA</span>
     <h2>Giras</h2>
     <p className="muted">Crie, revise e publique as giras da casa. Rascunhos só aparecem aqui.</p>
     </div>
     <button className="btn primary" onClick={() => openWizard("")}>
     <Plus size={14} /> Criar nova gira</button>
     </div>
   {loading ? <div className="card muted">Carregando giras…</div> : !giras.length ? <div className="card empty">
     <h3>Nenhuma gira cadastrada</h3>
     <p className="muted">Quando você criar uma gira, ela aparecerá aqui.</p>
     <button className="btn primary" onClick={() => openWizard("")}>Criar primeira gira</button>
     </div> : <>
    {drafts.length > 0 && <section className="gw-list-section">
      <div className="gw-list-heading">
      <span className="eyebrow">EM PREPARAÇÃO</span>
      <h3>Rascunhos <span className="gw-count">{drafts.length}</span>
      </h3>
      <p className="muted small">Visíveis apenas para a gestão. Continue de onde parou e publique quando estiver pronto.</p>
      </div>
      <div className="gira-admin-list">{drafts.map(card)}</div>
      </section>}
    <section className="gw-list-section">
      <div className="gw-list-heading">
      <span className="eyebrow">NA AGENDA DOS MEMBROS</span>
      <h3>Publicadas <span className="gw-count">{published.length}</span>
      </h3>
      </div>{published.length ? <div className="gira-admin-list">{published.map(card)}</div> : <p className="muted">Nenhuma gira publicada ainda.</p>}</section>
   </>}
  </>}
  {view === "detail" && selected && <GiraAdminDetail g={selected} editor={editor} onBack={() => backToList("")} onEdit={() => openWizard(selected.id)} onDuplicate={() => duplicate(selected)} duplicating={busyId === selected.id} onRemove={() => remove(selected)} />}
 </div>;
}

export function GiraAdminDetail({ g, editor, onBack, onEdit, onDuplicate, duplicating, onRemove }) {
  const [structure, setStructure] = useState(null), [message, setMessage] = useState("");
  useEffect(() => {
    loadGiraStructure(g.id).then(setStructure).catch((e) => setMessage(err(e)));
  }, [g.id]);
  const shiftOf = (id) => structure?.shifts.find((s) => s.id === id);
  return <div className="gira-admin-detail">
  <button className="btn gira-admin-back" onClick={onBack}><ArrowLeft size={14} /> Voltar para giras</button>
  <div className="card gira-admin-detail-hero" style={g.art_path ? { backgroundImage: "linear-gradient(90deg,rgba(0,0,0,.45),rgba(0,0,0,.05)),url(" + g.art_path + ")", color: "#fff" } : { borderTop: "8px solid " + (g.cover_color || "#E8E0D0") }}>
    <div>
    <span className={"gw-status gw-status-" + (g.status === "draft" ? "draft" : "published")}>{GIRA_STATUS[g.status] || "Publicada"}</span> <span className="activity-tag">{typeLabel(g.activity_type)}</span>
    <h2>{g.name}</h2>
    <p className="gira-admin-detail-date">{new Date(g.starts_at).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })} · {new Date(g.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>{g.entity_lines?.length > 0 && <div className="entity-chips">{g.entity_lines.map((id) => {
    const x = lineInfo(id);
    return x ? <span className="entity-chip" key={id}>{x[1]} {x[2]}</span> : null;
  })}</div>}</div>
    <div className="choice">
    <button className="btn" onClick={onEdit}>
    <Pencil size={14} /> {g.status === "draft" ? "Continuar edição" : "Editar gira"}</button>
    <button className="btn" disabled={duplicating} onClick={onDuplicate}>{duplicating ? "Duplicando…" : "Duplicar"}</button>{!editor && <button className="btn danger" onClick={onRemove}>
    <Trash2 size={14} /> Excluir</button>}</div>
    </div>
  {message && <div className="toast">{message}</div>}
  <div className="grid gira-admin-detail-grid">
    <div className="card">
    <span className="eyebrow">CONTRIBUIÇÃO</span>
    <p>{Number(g.contribution_amount) > 0 ? money(g.contribution_amount) + (g.contribution_due_date ? " · vence " + (/* @__PURE__ */ new Date(g.contribution_due_date + "T12:00:00")).toLocaleDateString("pt-BR") : "") : "Sem contribuição"}</p>
    </div>
    <div className="card">
    <span className="eyebrow">TURNOS DE ATIVIDADES</span>
    <p>{g.has_activity_shifts ? structure ? structure.shifts.length + " turno(s) · " + structure.tasks.length + " tarefa(s)" : "Carregando…" : "Esta gira não possui turnos de atividades."}</p>
    </div>
    </div>
  {(g.what_to_bring || g.notes) && <div className="grid gira-admin-detail-grid">
    <div className="card">
    <span className="eyebrow">O QUE LEVAR</span>
    <p className="gira-admin-preserve">{g.what_to_bring || "—"}</p>
    </div>
    <div className="card">
    <span className="eyebrow">OBSERVAÇÕES</span>
    <p className="gira-admin-preserve">{g.notes || "—"}</p>
    </div>
    </div>}
  {g.has_activity_shifts && structure && <div className="card">
    <span className="eyebrow">ATIVIDADES POR TURNO</span>{structure.shifts.map((s) => {
    const list = structure.tasks.filter((t) => t.shiftId === s.id);
    return <div className="gw-detail-shift" key={s.id}>
      <b>{s.label || shiftLabel(s)}</b>{list.length ? <ul>{list.map((t) => <li key={t.id}>{t.name}{t.subtasks.length > 0 && <ul>{t.subtasks.map((x) => <li key={x.id}>{x.name}</li>)}</ul>}</li>)}</ul> : <p className="muted small">Nenhuma tarefa neste turno.</p>}</div>;
  })}</div>}
  {g.has_activity_shifts && g.status !== "draft" && <AdminGiraTurnControl gira={g} editor={editor} />}
 </div>;
}

export function GiraWizard({ p, giraId, initialMessage = "", onCreated, onExit }) {
  const [id, setId] = useState(giraId || ""),
    [status, setStatus] = useState("draft"),
    [loaded, setLoaded] = useState(!giraId),
    [g, setG] = useState(emptyGiraInfo()),
    [hasShifts, setHasShifts] = useState(null),
    [shifts, setShifts] = useState([]),
    [tasks, setTasks] = useState([]),
    [step, setStep] = useState("info"),
    [errors, setErrors] = useState({}),
    [message, setMessage] = useState(initialMessage),
    [saving, setSaving] = useState(false),
    [dirty, setDirty] = useState(false),
    [savedAt, setSavedAt] = useState(null),
    [coverLibrary, setCoverLibrary] = useState([]),
    [previewKey, setPreviewKey] = useState(0),
    [previewPhase, setPreviewPhase] = useState("choose"),
    [publishState, setPublishState] = useState({ busy: false, done: false, error: "", chargeError: "" }),
    [notifyState, setNotifyState] = useState({ busy: false, done: false, count: 0, error: "" });
  const initialId = React.useRef(giraId).current;
  const savingRef = React.useRef(false), publishRef = React.useRef(false), notifyRef = React.useRef(false);
  const steps = [["info", "Informações"], ["shifts", "Turnos"], ...hasShifts === false ? [] : [["activities", "Atividades"]], ["preview", "Prévia"], ["publish", "Publicação"]];
  const stepIndex = steps.findIndex((s) => s[0] === step);
  const touch = () => {
    setDirty(true);
    setErrors((e) => Object.keys(e).length ? {} : e);
  };
  const setInfo = (patch) => {
    setG((v) => ({ ...v, ...patch }));
    touch();
  };
  useEffect(() => {
    supabase.storage.from("gira-art").list("Capas", { limit: 100, sortBy: { column: "name", order: "asc" } }).then(({ data }) => setCoverLibrary((data || []).filter((x) => x.name && x.name !== "placeholder").map((x) => ({ name: x.name, url: supabase.storage.from("gira-art").getPublicUrl("Capas/" + x.name).data.publicUrl }))));
  }, []);
  useEffect(() => {
    if (!initialId) return;
    (async () => {
      try {
        const { data: row, error } = await supabase.from("giras").select("*").eq("id", initialId).single();
        if (error) throw error;
        const structure = await loadGiraStructure(initialId);
        const progress = wizardProgress.read(initialId);
        setStatus(row.status || "published");
        setG({ name: row.name || "", date: localDateOf(row.starts_at), time: localTimeOf(row.starts_at), activity_type: row.activity_type || "gira", entity_lines: Array.isArray(row.entity_lines) ? row.entity_lines : [], hasContribution: Number(row.contribution_amount || 0) > 0, contribution_amount: Number(row.contribution_amount || 0) > 0 ? String(row.contribution_amount) : "", contribution_due_date: row.contribution_due_date || "", what_to_bring: row.what_to_bring || "", notes: row.notes || "", coverMode: row.art_path ? "image" : "color", cover_color: row.cover_color || "#65745A", art_path: row.art_path || "", coverFile: null });
        setShifts(structure.shifts);
        setTasks(structure.tasks);
        setHasShifts(row.has_activity_shifts ? true : row.status === "draft" && !progress.shiftsAnswered && !structure.shifts.length ? null : false);
        const resumeAt = progress.step && row.status === "draft" ? progress.step : "info";
        setStep(resumeAt === "activities" && !row.has_activity_shifts ? "shifts" : resumeAt);
        setLoaded(true);
        if (progress.step && row.status === "draft" && !initialMessage) setMessage("Rascunho recuperado. Você está continuando de onde parou.");
      } catch (e) {
        setMessage("Não foi possível carregar a gira: " + err(e));
        setLoaded(true);
      }
    })();
  }, []);
  useEffect(() => {
    const h = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
  useEffect(() => {
    if (id && loaded) wizardProgress.write(id, { step, shiftsAnswered: hasShifts !== null });
  }, [id, step, hasShifts, loaded]);
  const uploadCover = async (gid, file) => {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = gid + "/" + Date.now() + "." + ext;
    const { error } = await supabase.storage.from("gira-art").upload(path, file, { upsert: true, contentType: file.type || void 0 });
    if (error) throw error;
    return supabase.storage.from("gira-art").getPublicUrl(path).data.publicUrl;
  };
  const saveInfo = async () => {
    const e = validateGiraInfo(g);
    setErrors(e);
    if (Object.keys(e).length) return false;
    let gid = id;
    const { data, error } = await supabase.rpc("editor_save_gira_info", { p_gira_id: gid || null, p_info: giraInfoPayload(g) });
    if (error) throw error;
    if (!gid) {
      gid = data;
      setId(gid);
      onCreated && onCreated(gid);
    }
    if (g.coverMode === "image" && g.coverFile) {
      const url = await uploadCover(gid, g.coverFile);
      const next2 = { ...g, art_path: url, coverFile: null };
      setG(next2);
      const { error: e2 } = await supabase.rpc("editor_save_gira_info", { p_gira_id: gid, p_info: giraInfoPayload(next2) });
      if (e2) throw e2;
    }
    if (status === "published" && g.hasContribution && Number(g.contribution_amount) > 0) {
      const { error: ce } = await supabase.rpc("sync_gira_contribution_charge", { p_gira_id: gid });
      if (ce) setMessage("Informações salvas, mas as cobranças da contribuição não foram atualizadas: " + err(ce));
    }
    return true;
  };
  const saveStructure = async () => {
    const e = { ...validateGiraShifts(hasShifts, shifts), ...hasShifts ? validateGiraTasks(tasks, shifts) : {} };
    setErrors(e);
    if (Object.keys(e).length) return false;
    const payloadShifts = hasShifts ? shifts.map((s) => ({ id: s.id, date: s.date, time: s.time })) : [];
    const payloadTasks = hasShifts ? tasks.map((t) => ({ id: t.id, name: t.name.trim(), shiftId: t.shiftId, subtasks: t.subtasks.filter((s) => s.name.trim()).map((s) => ({ id: s.id, name: s.name.trim() })) })) : [];
    const { error } = await supabase.rpc("editor_save_gira_structure", { p_gira_id: id, p_has_shifts: !!hasShifts, p_turns: payloadShifts, p_tasks: payloadTasks });
    if (error) throw error;
    if (!hasShifts) {
      setShifts([]);
      setTasks([]);
    }
    return true;
  };
  const saveCurrent = async (target = step) => {
    if (savingRef.current) return false;
    if (target !== "info" && !id) {
      setErrors({});
      setMessage("Preencha e salve as informações da gira primeiro.");
      return false;
    }
    if (!dirty && target !== "info" && target !== "shifts" && target !== "activities") return true;
    if (!dirty && id && target === "info") return true;
    savingRef.current = true;
    setSaving(true);
    setMessage("");
    try {
      const ok = target === "info" ? await saveInfo() : await saveStructure();
      if (ok) {
        setDirty(false);
        setSavedAt(/* @__PURE__ */ new Date());
      } else setMessage("Revise os campos destacados antes de continuar.");
      return ok;
    } catch (e) {
      setMessage("Não foi possível salvar: " + err(e) + " Seus dados continuam na tela; tente novamente.");
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const canReach = (target) => {
    const order = steps.map((s) => s[0]);
    const ti = order.indexOf(target);
    if (ti <= 0) return true;
    if (!id) return false;
    if (ti > order.indexOf("shifts") && hasShifts === null) return false;
    return true;
  };
  const goTo = async (target) => {
    if (target === step) return;
    if (!canReach(target) && !(steps.findIndex((s) => s[0] === target) === stepIndex + 1)) {
      setMessage("Conclua as etapas anteriores primeiro.");
      return;
    }
    const ok = await saveCurrent(step);
    if (!ok) return;
    if ((target === "preview" || target === "publish") && hasShifts && step !== "activities") {
      const e = validateGiraTasks(tasks, shifts);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep("activities");
        setMessage("Revise as atividades antes de seguir.");
        return;
      }
    }
    if (target === "preview") {
      setPreviewKey((k) => k + 1);
      setPreviewPhase("choose");
    }
    setErrors({});
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const next = () => {
    const n = steps[stepIndex + 1];
    if (n) goTo(n[0]);
  };
  const prev = () => {
    const n = steps[stepIndex - 1];
    if (n) goTo(n[0]);
  };
  const exit = async () => {
    if (dirty && !confirm("Há alterações não salvas nesta etapa. Sair mesmo assim?")) return;
    onExit(id && status === "draft" ? "Rascunho salvo. Você pode continuar depois." : "");
  };
  const chooseShifts = (v) => {
    if (v === hasShifts) return;
    if (v === false && (shifts.length || tasks.length) && !confirm("Ao salvar, os " + shifts.length + " turno(s) e " + tasks.length + " tarefa(s) desta gira serão removidos. Deseja continuar?")) return;
    setHasShifts(v);
    if (v && !shifts.length) setShifts([{ id: newId(), date: g.date || "", time: "" }]);
    touch();
  };
  const addShift = () => {
    setShifts((v) => [...v, { id: newId(), date: v[v.length - 1]?.date || g.date || "", time: "" }]);
    touch();
  };
  const updateShift = (sid, patch) => {
    setShifts((v) => v.map((s) => s.id === sid ? { ...s, ...patch } : s));
    touch();
  };
  const removeShift = (s) => {
    const used = tasks.filter((t) => t.shiftId === s.id);
    if (used.length) {
      setErrors((v) => ({ ...v, [s.id]: "Este turno está ligado a " + used.length + " tarefa(s): " + used.map((t) => t.name || "sem nome").join(", ") + ". Mude o turno dessas tarefas antes de excluir." }));
      return;
    }
    if (!confirm("Excluir o turno " + shiftLabel(s) + "?")) return;
    setShifts((v) => v.filter((x) => x.id !== s.id));
    touch();
  };
  const addTask = () => {
    setTasks((v) => [...v, { id: newId(), name: "", shiftId: shifts.length === 1 ? shifts[0].id : "", subtasks: [] }]);
    touch();
  };
  const updateTask = (tid, patch) => {
    setTasks((v) => v.map((t) => t.id === tid ? { ...t, ...patch } : t));
    touch();
  };
  const removeTask = (t) => {
    if (!confirm('Excluir a tarefa "' + (t.name || "sem nome") + '" e suas ' + t.subtasks.length + " subtarefa(s)?")) return;
    setTasks((v) => v.filter((x) => x.id !== t.id));
    touch();
  };
  const addSubtask = (tid) => {
    setTasks((v) => v.map((t) => t.id === tid ? { ...t, subtasks: [...t.subtasks, { id: newId(), name: "" }] } : t));
    touch();
  };
  const updateSubtask = (tid, sid, name) => {
    setTasks((v) => v.map((t) => t.id === tid ? { ...t, subtasks: t.subtasks.map((s) => s.id === sid ? { ...s, name } : s) } : t));
    touch();
  };
  const removeSubtask = (tid, sid) => {
    setTasks((v) => v.map((t) => t.id === tid ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== sid) } : t));
    touch();
  };
  const publish = async () => {
    if (publishRef.current) return;
    publishRef.current = true;
    setPublishState({ busy: true, done: false, error: "", chargeError: "" });
    const ok = await saveCurrent(step);
    if (!ok) {
      publishRef.current = false;
      setPublishState({ busy: false, done: false, error: "", chargeError: "" });
      return;
    }
    const { error } = await supabase.rpc("publish_gira", { p_gira_id: id });
    if (error) {
      publishRef.current = false;
      setPublishState({ busy: false, done: false, error: err(error), chargeError: "" });
      return;
    }
    setStatus("published");
    wizardProgress.clear(id);
    let chargeError = "";
    if (g.hasContribution && Number(g.contribution_amount) > 0) {
      const { error: ce } = await supabase.rpc("sync_gira_contribution_charge", { p_gira_id: id });
      if (ce) chargeError = err(ce);
    }
    publishRef.current = false;
    setPublishState({ busy: false, done: true, error: "", chargeError });
  };
  const retryCharges = async () => {
    const { error } = await supabase.rpc("sync_gira_contribution_charge", { p_gira_id: id });
    setPublishState((v) => ({ ...v, chargeError: error ? err(error) : "" }));
    if (!error) setMessage("Cobranças da contribuição geradas.");
  };
  const notify = async () => {
    if (notifyRef.current || notifyState.done) return;
    notifyRef.current = true;
    setNotifyState({ busy: true, done: false, count: 0, error: "" });
    const { data, error } = await supabase.rpc("notify_gira_published", { p_gira_id: id });
    notifyRef.current = false;
    setNotifyState(error ? { busy: false, done: false, count: 0, error: err(error) } : { busy: false, done: true, count: data || 0, error: "" });
  };
  if (!loaded) return <div className="card muted">Carregando gira…</div>;
  const selectedEntities = entityLines.filter((x) => g.entity_lines.includes(x[0]));
  const previewGira = { id: id || "preview", name: g.name || "Nome da gira", starts_at: g.date && g.time ? (/* @__PURE__ */ new Date(g.date + "T" + g.time + ":00")).toISOString() : (/* @__PURE__ */ new Date()).toISOString(), activity_type: g.activity_type, entity_lines: g.entity_lines, art_path: g.coverMode === "image" ? g.coverFile ? URL.createObjectURL(g.coverFile) : g.art_path : "", cover_color: g.coverMode === "color" ? g.cover_color : null, contribution_amount: g.hasContribution ? Number(g.contribution_amount) || 0 : 0, contribution_due_date: g.hasContribution ? g.contribution_due_date : null, what_to_bring: g.what_to_bring, notes: g.notes, use_task_list: !!hasShifts, has_activity_shifts: !!hasShifts, status };
  const previewData = { phase: previewPhase, turns: (hasShifts ? shifts : []).map((s) => ({ turn_id: s.id, label: shiftLabel(s), shift_date: s.date, capacity: s.capacity || 7 })), tasks: (hasShifts ? tasks : []).map((t) => ({ id: t.id, name: t.name, gira_turn_id: t.shiftId, subtasks: t.subtasks.filter((x) => x.name.trim()) })) };
  if (publishState.done) return <div className="gw-success card">
  <div className="gw-success-mark"><Check size={30} /></div>
  <span className="eyebrow">PUBLICAÇÃO CONCLUÍDA</span><h2>Gira publicada com sucesso</h2>
  <p className="muted"><b>{g.name}</b> já está na agenda dos membros.</p>
  {publishState.chargeError && <div className="gw-warning" role="alert">
    <b>A gira continua publicada,</b> mas as cobranças da contribuição não foram geradas: {publishState.chargeError} <button className="btn" onClick={retryCharges}>Tentar gerar novamente</button>
    </div>}
  <div className="gw-notify card">
    <div>
    <b>Avisar a comunidade</b>
    <p className="muted small">Envia um aviso para todos os membros ativos, que aparece na tela inicial e na página da gira. É opcional e não altera a publicação.</p>
    </div>
   {notifyState.done ? <span className="gw-notify-done">
     <Check size={15} /> {notifyState.count} pessoa(s) notificada(s)</span> : <button className="btn primary" disabled={notifyState.busy} onClick={notify}>{notifyState.busy ? "Enviando…" : "Notificar usuários"}</button>}
   {notifyState.error && <p className="gw-field-error" role="alert">Não foi possível enviar as notificações: {notifyState.error}. A gira continua publicada; tente novamente.</p>}
  </div>
  <div className="gw-actions">
    <button className="btn" onClick={() => onExit("Gira publicada.")}>
    <ArrowLeft size={14} /> Voltar para giras</button>
    </div>
 </div>;
  return <div className="gw">
  <div className="gw-top">
    <button className="btn gira-admin-back" onClick={exit}>
    <ArrowLeft size={14} /> Voltar para giras</button>
    <div className="gw-save-state" aria-live="polite">{saving ? <span>Salvando…</span> : dirty ? <span className="gw-unsaved">Alterações não salvas</span> : savedAt ? <span>✓ Salvo às {savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span> : id ? <span>✓ Tudo salvo</span> : null}</div>
    </div>
  <div className="gw-head">
    <span className={"gw-status gw-status-" + (status === "draft" ? "draft" : "published")}>{status === "draft" ? id ? "Rascunho" : "Novo rascunho" : "Publicada"}</span>
    <h2>{id ? g.name || "Gira sem nome" : "Criar nova gira"}</h2>{status === "published" && <p className="gw-live-note">Esta gira já está publicada: as alterações salvas aparecem para os membros.</p>}</div>
  <nav className="gw-stepper" aria-label="Etapas da gira">{steps.map(([k, l], i) => <button key={k} type="button" className={"gw-step " + (k === step ? "is-current " : "") + (i < stepIndex ? "is-done " : "")} aria-current={k === step ? "step" : void 0} disabled={saving || !canReach(k) && i !== stepIndex + 1} onClick={() => goTo(k)}>
    <span className="gw-step-num">{i < stepIndex ? <Check size={13} /> : i + 1}</span>
    <span className="gw-step-label">{l}</span>
    </button>)}</nav>
  {message && <div className={/^(Revise|Não foi|Conclua|Preencha|Informações salvas, mas)/.test(message) ? "gw-warning" : "toast"} role="status">{message}</div>}

  {step === "info" && <div className="card gw-panel">
   <div className="gw-panel-head">
     <h3>Informações da gira</h3>
     <p className="muted small">O essencial para a comunidade saber do que se trata.</p>
     </div>
   <div className="field">
     <label htmlFor="gw-name">Nome</label>
     <input id="gw-name" className={"input " + (errors.name ? "has-error" : "")} value={g.name} onChange={(e) => setInfo({ name: e.target.value })} placeholder="Ex.: Gira de Caboclos" />
     <FieldError msg={errors.name} />
     </div>
   <div className="grid">
     <div className="field">
     <label htmlFor="gw-date">Dia</label>
     <input id="gw-date" className={"input " + (errors.date ? "has-error" : "")} type="date" value={g.date} onChange={(e) => setInfo({ date: e.target.value })} />
     <FieldError msg={errors.date} />
     </div>
     <div className="field">
     <label htmlFor="gw-time">Horário</label>
     <input id="gw-time" className={"input " + (errors.time ? "has-error" : "")} type="time" value={g.time} onChange={(e) => setInfo({ time: e.target.value })} />
     <FieldError msg={errors.time} />
     </div>
     </div>
   <div className="field">
     <label htmlFor="gw-type">Tipo de gira</label>
     <select id="gw-type" className="select" value={g.activity_type} onChange={(e) => setInfo({ activity_type: e.target.value })}>{Object.entries(types).map(([k, v]) => <option value={k} key={k}>{typeIcons[k]} {v}</option>)}</select>
     <FieldError msg={errors.activity_type} />
     </div>
   <div className="field">
     <label>Entidades</label>
     <div className="gira-entity-picker">{entityLines.map((x) => <label className={"gira-entity-option " + (g.entity_lines.includes(x[0]) ? "selected" : "")} key={x[0]}>
     <input type="checkbox" checked={g.entity_lines.includes(x[0])} onChange={(e) => setInfo({ entity_lines: e.target.checked ? [...g.entity_lines, x[0]] : g.entity_lines.filter((v) => v !== x[0]) })} />
     <span>{x[1]}</span>
     <b>{x[2]}</b>
     </label>)}</div>{selectedEntities.length > 0 && <div className="entity-chips" style={{ marginTop: 10 }}>{selectedEntities.map((x) => <span className="entity-chip" key={x[0]}>{x[1]} {x[2]}</span>)}</div>}</div>
   <div className="field">
     <label>Possui contribuição?</label>
     <div className="gira-admin-choice-grid" role="radiogroup">
     <button type="button" role="radio" aria-checked={!g.hasContribution} className={"gira-admin-choice " + (!g.hasContribution ? "selected" : "")} onClick={() => setInfo({ hasContribution: false })}>
     <span className="gira-admin-choice-icon">○</span>
     <span>
     <b>Não</b>
     <small>Sem contribuição.</small>
     </span>
     </button>
     <button type="button" role="radio" aria-checked={g.hasContribution} className={"gira-admin-choice " + (g.hasContribution ? "selected" : "")} onClick={() => setInfo({ hasContribution: true })}>
     <span className="gira-admin-choice-icon">✓</span>
     <span>
     <b>Sim</b>
     <small>Definir o valor.</small>
     </span>
     </button>
     </div>
    {g.hasContribution && <div className="grid" style={{ marginTop: 12 }}>
      <div className="field">
      <label htmlFor="gw-amount">Valor da contribuição (R$)</label>
      <input id="gw-amount" className={"input " + (errors.contribution_amount ? "has-error" : "")} type="number" min="0" step="0.01" inputMode="decimal" value={g.contribution_amount} onChange={(e) => setInfo({ contribution_amount: e.target.value })} placeholder="0,00" />
      <FieldError msg={errors.contribution_amount} />
      </div>
      <div className="field">
      <label htmlFor="gw-due">Vencimento (opcional)</label>
      <input id="gw-due" className="input" type="date" value={g.contribution_due_date} onChange={(e) => setInfo({ contribution_due_date: e.target.value })} />
      </div>
      </div>}
    {g.hasContribution && status === "draft" && <p className="muted small">As cobranças só são geradas quando a gira for publicada.</p>}
   </div>
   <details className="gw-more" open={!!(g.what_to_bring || g.notes || g.art_path || g.coverFile)}>
     <summary>Mais detalhes (opcional): o que levar, observações e capa</summary>
    <div className="field">
      <label htmlFor="gw-bring">O que levar</label>
      <textarea id="gw-bring" className="textarea" rows="3" value={g.what_to_bring} onChange={(e) => setInfo({ what_to_bring: e.target.value })} placeholder="Ex.: roupa branca, água…" />
      </div>
    <div className="field">
      <label htmlFor="gw-notes">Observações</label>
      <textarea id="gw-notes" className="textarea" rows="3" value={g.notes} onChange={(e) => setInfo({ notes: e.target.value })} />
      </div>
    <div className="field">
      <label>Capa</label>
      <div className="gira-cover-mode">
      <button type="button" className={"gira-cover-choice " + (g.coverMode === "color" ? "selected" : "")} onClick={() => setInfo({ coverMode: "color" })}>
      <span className="gira-cover-swatch" style={{ background: g.cover_color }} />
      <span>
      <b>Usar uma cor</b>
      </span>
      </button>
      <button type="button" className={"gira-cover-choice " + (g.coverMode === "image" ? "selected" : "")} onClick={() => setInfo({ coverMode: "image" })}>
      <span className="gira-cover-photo">▧</span>
      <span>
      <b>Usar imagem</b>
      </span>
      </button>
      </div>
     {g.coverMode === "color" ? <div className="gira-color-palette" style={{ marginTop: 10 }}>{["#65745A", "#8B6F47", "#A65D4A", "#8A6A8F", "#55758A", "#B78A3D", "#7B5B45", "#6F7F76", "#9A7B67", "#C8B99A"].map((c) => <button type="button" key={c} aria-label={"Usar cor " + c} className={"gira-color-dot " + (String(g.cover_color).toLowerCase() === c.toLowerCase() ? "selected" : "")} style={{ background: c }} onClick={() => setInfo({ cover_color: c })} />)}<label className="gira-color-picker-swatch" style={{ background: g.cover_color }} title="Cor personalizada">
       <input aria-label="Escolher cor personalizada" type="color" value={g.cover_color} onChange={(e) => setInfo({ cover_color: e.target.value })} />
       </label>
       </div> : <div className="gira-cover-upload">{coverLibrary.length > 0 && <div className="gira-cover-library">{coverLibrary.map((c) => <button type="button" key={c.name} className={"gira-cover-library-item " + (g.art_path === c.url && !g.coverFile ? "selected" : "")} onClick={() => setInfo({ art_path: c.url, coverFile: null })}>
       <img src={c.url} alt={c.name} />
       <span>{c.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ")}</span>
       </button>)}</div>}<div className="gira-cover-custom">
       <b>Ou enviar uma nova imagem</b>
       <input className="input" type="file" accept="image/*" onChange={(e) => setInfo({ coverFile: e.target.files?.[0] || null, art_path: "" })} />
       </div>
       </div>}
    </div>
   </details>
  </div>}

  {step === "shifts" && <div className="card gw-panel">
   <div className="gw-panel-head">
     <h3>A gira possui turnos de atividades?</h3>
     <p className="muted small">Turnos são os momentos em que os filhos ajudam na organização (preparo, limpeza…). Os membros escolhem em quais turnos podem participar.</p>
     </div>
   <div className="gira-admin-choice-grid" role="radiogroup" aria-label="A gira possui turnos de atividades?">
     <button type="button" role="radio" aria-checked={hasShifts === true} className={"gira-admin-choice " + (hasShifts === true ? "selected" : "")} onClick={() => chooseShifts(true)}>
     <span className="gira-admin-choice-icon">✓</span>
     <span>
     <b>Sim</b>
     <small>Vou cadastrar os turnos e as tarefas.</small>
     </span>
     </button>
     <button type="button" role="radio" aria-checked={hasShifts === false} className={"gira-admin-choice " + (hasShifts === false ? "selected" : "")} onClick={() => chooseShifts(false)}>
     <span className="gira-admin-choice-icon">○</span>
     <span>
     <b>Não</b>
     <small>Seguir direto para a prévia.</small>
     </span>
     </button>
     </div>
   <FieldError msg={errors.hasShifts} />
   {hasShifts === true && <div className="gw-shifts">
    <div className="gw-subhead">
      <b>Turnos</b>
      <span className="muted small">Cada turno tem apenas dia e horário.</span>
      </div>
    {shifts.map((s, i) => <div className={"gw-shift " + (errors[s.id] ? "has-error" : "")} key={s.id}>
      <span className="gw-shift-tag">{s.date && s.time ? shiftLabel(s) : "Turno " + (i + 1)}</span>
      <div className="gw-shift-fields">
      <div className="field">
      <label htmlFor={"d" + s.id}>Dia</label>
      <input id={"d" + s.id} className="input" type="date" value={s.date} onChange={(e) => updateShift(s.id, { date: e.target.value })} />
      </div>
      <div className="field">
      <label htmlFor={"t" + s.id}>Horário</label>
      <input id={"t" + s.id} className="input" type="time" value={s.time} onChange={(e) => updateShift(s.id, { time: e.target.value })} />
      </div>
      <button type="button" className="btn gw-icon-btn" aria-label={"Excluir turno " + (i + 1)} onClick={() => removeShift(s)}>
      <Trash2 size={15} />
      </button>
      </div>
      <FieldError msg={errors[s.id]} />
      </div>)}
    <FieldError msg={errors.list} />
    <button type="button" className="btn gw-add" onClick={addShift}><Plus size={14} /> Adicionar turno</button>
   </div>}
   {hasShifts === false && (shifts.length > 0 || tasks.length > 0) && <div className="gw-warning">Ao salvar, os turnos e as tarefas cadastrados serão removidos. Se mudar de ideia, marque <b>Sim</b> antes de avançar.</div>}
  </div>}

  {step === "activities" && <div className="card gw-panel">
   <div className="gw-panel-head">
     <h3>Atividades</h3>
     <p className="muted small">Cada tarefa pertence a um turno. As subtarefas seguem automaticamente o turno da tarefa.</p>
     </div>
   {!tasks.length && <div className="gw-empty">
     <ClipboardList size={20} />
     <p>Nenhuma tarefa ainda. Adicione a primeira tarefa e escolha o turno.</p>
     </div>}
   {tasks.map((t, i) => <div className="gw-task" key={t.id}>
    <div className="gw-task-row"><span className="gw-task-num">{i + 1}</span>
     <div className="field gw-task-name">
       <label htmlFor={"n" + t.id}>Tarefa</label>
       <input id={"n" + t.id} className={"input " + (errors[t.id + ":name"] ? "has-error" : "")} value={t.name} onChange={(e) => updateTask(t.id, { name: e.target.value })} placeholder="Ex.: Decoração do congá" />
       <FieldError msg={errors[t.id + ":name"]} />
       </div>
     <div className="field gw-task-shift">
       <label htmlFor={"s" + t.id}>Turno</label>
       <select id={"s" + t.id} className={"select " + (errors[t.id + ":shift"] ? "has-error" : "")} value={t.shiftId} onChange={(e) => updateTask(t.id, { shiftId: e.target.value })}>
       <option value="">Escolha o turno…</option>{shifts.map((s) => <option value={s.id} key={s.id}>{shiftLabel(s)}</option>)}</select>
       <FieldError msg={errors[t.id + ":shift"]} />
       </div>
     <button type="button" className="btn gw-icon-btn" aria-label={"Excluir tarefa " + (t.name || i + 1)} onClick={() => removeTask(t)}>
       <Trash2 size={15} />
       </button>
    </div>
    <div className="gw-subtasks">
      <span className="gw-subtasks-label">Subtarefas {t.shiftId && shifts.find((s) => s.id === t.shiftId) ? <em>· no turno {shiftLabel(shifts.find((s) => s.id === t.shiftId))}</em> : null}</span>
     {t.subtasks.map((s, j) => <div className="gw-subtask" key={s.id}>
       <span aria-hidden="true">↳</span>
       <input className={"input " + (errors[s.id] ? "has-error" : "")} aria-label={"Subtarefa " + (j + 1) + " de " + (t.name || "tarefa")} value={s.name} onChange={(e) => updateSubtask(t.id, s.id, e.target.value)} placeholder="Ex.: Separar as flores" />
       <button type="button" className="btn gw-icon-btn" aria-label="Remover subtarefa" onClick={() => removeSubtask(t.id, s.id)}>
       <X size={14} />
       </button>
       <FieldError msg={errors[s.id]} />
       </div>)}
     <button type="button" className="gw-link-btn" onClick={() => addSubtask(t.id)}>
       <Plus size={13} /> Adicionar subtarefa</button>
    </div>
   </div>)}
   <button type="button" className="btn gw-add" onClick={addTask}><Plus size={14} /> Adicionar tarefa</button>
  </div>}

  {step === "preview" && <div className="gw-preview">
   <div className="card gw-preview-bar">
     <div>
     <b>Prévia: assim os membros verão esta gira</b>
     <p className="muted small">Pode testar à vontade: confirmar presença, escolher turnos, marcar tarefas. Nada aqui é salvo e tudo volta ao início quando você sair da prévia.</p>
     </div>
    {hasShifts && <div className="gw-phase" role="group" aria-label="Simular momento">
      <span className="muted small">Simular:</span>
      <button type="button" className={"btn " + (previewPhase === "choose" ? "primary" : "")} onClick={() => {
    setPreviewPhase("choose");
    setPreviewKey((k) => k + 1);
  }}>Escolha de turnos</button>
    <button type="button" className={"btn " + (previewPhase === "day" ? "primary" : "")} onClick={() => {
    setPreviewPhase("day");
    setPreviewKey((k) => k + 1);
  }}>Dia da gira</button></div>}
    <div className="gw-jump">
      <span className="muted small">Editar:</span>
      <button type="button" className="gw-link-btn" onClick={() => goTo("info")}>Informações</button>
      <button type="button" className="gw-link-btn" onClick={() => goTo("shifts")}>Turnos</button>{hasShifts && <button type="button" className="gw-link-btn" onClick={() => goTo("activities")}>Atividades</button>}</div>
   </div>
   <div className="gw-preview-frame">
     <GiraDetail key={previewKey} p={p} gira={previewGira} preview={previewData} back={() => {
  }} /></div>
  </div>}

  {step === "publish" && <div className="card gw-panel">
   <div className="gw-panel-head">
     <h3>{status === "published" ? "Publicar alterações" : "Publicar gira"}</h3>
     <p className="muted small">{status === "published" ? "A gira já está na agenda. Confirme para validar e manter as alterações publicadas." : "Ao publicar, a gira aparece automaticamente no menu GIRAS dos membros."}</p>
     </div>
   <ul className="gw-checklist">
    <li>
      <Check size={14} /> <span>
      <b>{g.name}</b> · {g.date ? (/* @__PURE__ */ new Date(g.date + "T12:00:00")).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : ""} às {g.time}</span>
      </li>
    <li>
      <Check size={14} /> <span>{types[g.activity_type]}{selectedEntities.length ? " · " + selectedEntities.map((x) => x[2]).join(", ") : ""}</span>
      </li>
    <li>
      <Check size={14} /> <span>{g.hasContribution ? "Contribuição de " + money(g.contribution_amount) + " (cobranças geradas ao publicar)" : "Sem contribuição"}</span>
      </li>
    <li>
      <Check size={14} /> <span>{hasShifts ? shifts.length + " turno(s), " + tasks.length + " tarefa(s) e " + tasks.reduce((n, t) => n + t.subtasks.length, 0) + " subtarefa(s)" : "Sem turnos de atividades"}</span>
      </li>
   </ul>
   {publishState.error && <div className="gw-warning" role="alert">
     <b>Não foi possível publicar:</b> {publishState.error}</div>}
   <div className="gw-jump">
     <span className="muted small">Quer revisar antes?</span>
     <button type="button" className="gw-link-btn" onClick={() => goTo("preview")}>Ver prévia</button>
     </div>
  </div>}

  <div className="gw-actions">
   {stepIndex > 0 ? <button type="button" className="btn" disabled={saving} onClick={prev}>
     <ArrowLeft size={14} /> Voltar</button> : <span />}
   <div className="gw-actions-right">
    {step !== "preview" && step !== "publish" && status === "draft" && <button type="button" className="btn" disabled={saving || !dirty && !!id} onClick={() => saveCurrent(step)}>
      <Save size={14} /> Salvar rascunho</button>}
    {step === "publish" ? <button type="button" className="btn primary" disabled={publishState.busy || saving} onClick={publish}>{publishState.busy ? "Publicando…" : status === "published" ? "Publicar alterações" : "Publicar gira"}</button> : <button type="button" className="btn primary" disabled={saving} onClick={next}>{saving ? "Salvando…" : step === "preview" ? "Ir para publicação" : "Salvar e avançar"} <ChevronRight size={14} />
      </button>}
   </div>
  </div>
 </div>;
}
