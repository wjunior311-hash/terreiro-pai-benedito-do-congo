// Financeiro da gestão: visão geral, mensalidades, cobranças, comprovantes, pessoas.
import { useEffect, useState } from "react";
import { Check, X, Plus, ChevronRight, FileText, Trash2, ArrowLeft } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { err, money } from "../../lib/helpers.js";
import { isMonthOverdue, payerMode, paysInMonth, upperFirst, useFinanceSettings, ymAdd, ymLabel, ymOf } from "./regras.js";

export function AdminFinance() {
  const [settings, reloadSettings] = useFinanceSettings();
  const [people, setPeople] = useState([]),
    [dues, setDues] = useState([]),
    [charges, setCharges] = useState([]),
    [giras, setGiras] = useState([]),
    [pendingCount, setPendingCount] = useState(0),
    [tab, setTab] = useState("overview"),
    [month, setMonth] = useState(ymOf(/* @__PURE__ */ new Date())),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(true),
    [showSettings, setShowSettings] = useState(false);
  const load = async () => {
    const [{ data: p }, { data: d }, { data: c }, { data: g }, { data: pr }] = await Promise.all([supabase.from("profiles").select("id,name,date_of_birth,is_active,is_pai_de_santo,is_financial_payer,financial_start_month,orixa_symbol").eq("is_active", true).order("name"), supabase.from("monthly_dues").select("profile_id,reference_month,status").limit(1e4), supabase.from("extra_charges").select("*").order("created_at", { ascending: false }).limit(1e4), supabase.from("giras").select("id,name,starts_at").order("starts_at", { ascending: false }).limit(60), supabase.rpc("admin_list_payment_proofs", { p_status: "pending" })]);
    setPeople(p || []);
    setDues(d || []);
    setCharges(c || []);
    setGiras(g || []);
    setPendingCount((pr || []).length);
    setLoading(false);
  };
  useEffect(() => {
    supabase.rpc("sync_current_monthly_dues").then(load);
  }, []);
  const dueStatus = (pid, ym) => dues.find((x) => x.profile_id === pid && String(x.reference_month).slice(0, 7) === ym)?.status || "unpaid";
  const tabs = [["overview", "Visão geral"], ["monthly", "Mensalidades"], ["extra", "Outras cobranças"], ["proofs", "Comprovantes"], ["people", "Pessoas"]];
  const ctx = { people, dues, charges, giras, settings, month, setMonth, dueStatus, reload: load, setMessage, setTab, pendingCount };
  return <div className="fn-admin">
  <div className="row between gira-admin-header">
    <div>
    <span className="eyebrow">GESTÃO DA CASA</span>
    <h2>Financeiro</h2>
    </div>
    <button className="btn" onClick={() => setShowSettings((v) => !v)}>{showSettings ? "Fechar configurações" : "Configurações"}</button>
    </div>
  {showSettings && <FinanceSettingsCard settings={settings} onSaved={() => {
    reloadSettings();
    setShowSettings(false);
    setMessage("Configurações salvas.");
  }} />}
  <div className="mu-chips fn-tabs">{tabs.map(([k, l]) => <button type="button" key={k} className={"mu-chip" + (tab === k ? " is-on" : "")} onClick={() => {
    setTab(k);
    setMessage("");
  }}>{l}{k === "proofs" && pendingCount > 0 && <i className="bl-dot-count">{pendingCount}</i>}</button>)}</div>
  {message && <div className="toast">{message}</div>}
  {loading ? <div className="hm-skeleton" /> : <>
   {tab === "overview" && <FinanceOverview {...ctx} />}
   {tab === "monthly" && <FinanceMonthly {...ctx} />}
   {tab === "extra" && <FinanceExtras {...ctx} />}
   {tab === "proofs" && <FinanceProofs {...ctx} />}
   {tab === "people" && <FinancePeople {...ctx} />}
  </>}
 </div>;
}

export function MonthPicker({ month, setMonth }) {
  return <div className="fn-month">
    <button type="button" className="ag-nav" aria-label="Mês anterior" onClick={() => setMonth(ymAdd(month, -1))}>
    <ArrowLeft size={16} />
    </button>
    <b>{upperFirst(ymLabel(month))}</b>
    <button type="button" className="ag-nav" aria-label="Próximo mês" onClick={() => setMonth(ymAdd(month, 1))}>
    <ChevronRight size={17} />
    </button>
    </div>;
}

export function FinanceOverview({ people, dues, charges, settings, month, setMonth, dueStatus, setTab, pendingCount }) {
  const today = /* @__PURE__ */ new Date(), cur = ymOf(today);
  const payers = people.filter((p) => paysInMonth(p, month)), nonPayers = people.filter((p) => !paysInMonth(p, cur));
  const paid = payers.filter((p) => dueStatus(p.id, month) === "paid");
  const pct = payers.length ? Math.round(paid.length / payers.length * 100) : 0;
  const late = people.map((p) => {
    const months = dues.filter((d) => d.profile_id === p.id && d.status === "unpaid").map((d) => String(d.reference_month).slice(0, 7)).filter((m) => paysInMonth(p, m) && isMonthOverdue(m, settings, today));
    const extras = charges.filter((c) => c.profile_id === p.id && c.status === "unpaid" && c.due_date && /* @__PURE__ */ new Date(c.due_date + "T23:59:59") < today);
    return { p, months, extras, total: months.length * Number(settings.monthly_amount) + extras.reduce((n, c) => n + Number(c.amount), 0) };
  }).filter((x) => x.months.length || x.extras.length).sort((a, b) => b.total - a.total);
  const openExtras = charges.filter((c) => c.status === "unpaid");
  const [showAllLate, setShowAllLate] = useState(false);
  return <div>
  <MonthPicker month={month} setMonth={setMonth} />
  <div className="fn-kpis">
   <div className="fn-kpi">
     <small>Saúde de {ymLabel(month, false)}</small>
     <b>{pct}%</b>
     <small>{paid.length} de {payers.length} pagaram · {money(paid.length * settings.monthly_amount)}</small>
     <span className="bl-bar">
     <i style={{ width: pct + "%" }} />
     </span>
     </div>
   <div className="fn-kpi">
     <small>Falta receber no mês</small>
     <b>{money((payers.length - paid.length) * settings.monthly_amount)}</b>
     <small>{payers.length - paid.length} mensalidade(s)</small>
     </div>
   <div className="fn-kpi">
     <small>Em atraso</small>
     <b className={late.length ? "is-bad" : ""}>{late.length} {late.length === 1 ? "pessoa" : "pessoas"}</b>
     <small>{money(late.reduce((n, x) => n + x.total, 0))} vencidos</small>
     </div>
   <div className="fn-kpi">
     <small>Pagantes hoje</small>
     <b>{people.length - nonPayers.length}</b>
     <small>{nonPayers.length} não pagante(s)</small>
     </div>
  </div>
  {pendingCount > 0 && <button type="button" className="hm-att hm-att-info" style={{ marginTop: 12 }} onClick={() => setTab("proofs")}>
    <span className="hm-att-icon">
    <FileText size={19} />
    </span>
    <span className="hm-att-text">
    <b>{pendingCount} comprovante(s) para conferir</b>
    </span>
    <span className="hm-att-cta">Conferir<ChevronRight size={15} />
    </span>
    </button>}
  <h3 className="fn-h">Quem está em atraso</h3>
  {late.length ? <div className="fn-list">{(showAllLate ? late : late.slice(0, 6)).map((x) => <div className="fn-row" key={x.p.id}>
    <span className="fn-row-main">
    <b>{x.p.name}</b>
    <small>{[x.months.length ? x.months.length + " mensalidade(s)" : "", x.extras.length ? x.extras.length + " cobrança(s)" : ""].filter(Boolean).join(" · ")}</small>
    </span>
    <span className={"fn-chip " + (x.months.length + x.extras.length >= 3 ? "is-bad" : "is-warn")}>{money(x.total)}</span>
    </div>)}{late.length > 6 && <button className="gw-link-btn" onClick={() => setShowAllLate((v) => !v)}>{showAllLate ? "Ver menos" : "Ver todas as " + late.length + " pessoas"}</button>}</div> : <div className="hm-clear">
    <Check size={18} />
    <span>Ninguém em atraso.</span>
    </div>}
  <h3 className="fn-h">Outras cobranças em aberto</h3>
  <p className="muted">{openExtras.length ? openExtras.length + " cobrança(s) · " + money(openExtras.reduce((n, c) => n + Number(c.amount), 0)) + " a receber" : "Nenhuma cobrança em aberto."}</p>
 </div>;
}

export function FinanceMonthly({ people, settings, month, setMonth, dueStatus, reload, setMessage }) {
  const [filter, setFilter] = useState("all"), [search, setSearch] = useState(""), [busy, setBusy] = useState("");
  const rows = people.map((p) => {
    const pays = paysInMonth(p, month);
    const st = !pays ? "na" : dueStatus(p.id, month) === "paid" ? "paid" : dueStatus(p.id, month) === "not_applicable" ? "na" : "open";
    return { p, st, late: st === "open" && isMonthOverdue(month, settings) };
  });
  const q = search.trim().toLocaleLowerCase("pt-BR");
  const shown = rows.filter((r) => (filter === "all" || r.st === filter) && (!q || r.p.name.toLocaleLowerCase("pt-BR").includes(q)));
  const count = (k) => rows.filter((r) => r.st === k).length;
  const toggle = async (r) => {
    if (busy) return;
    setBusy(r.p.id);
    const { error } = await supabase.rpc("admin_set_monthly_dues", { p_profile_id: r.p.id, p_reference_month: month + "-01", p_status: r.st === "paid" ? "unpaid" : "paid" });
    setBusy("");
    if (error) setMessage(err(error));
    else {
      setMessage(r.st === "paid" ? "Baixa desfeita." : "Baixa registrada para " + r.p.name + ".");
      reload();
    }
  };
  return <div>
  <MonthPicker month={month} setMonth={setMonth} />
  <div className="mu-chips">{[["all", "Todos", rows.length], ["paid", "Pagos", count("paid")], ["open", "Pendentes", count("open")], ["na", "Não se aplica", count("na")]].map(([k, l, n]) => <button type="button" key={k} className={"mu-chip" + (filter === k ? " is-on" : "")} onClick={() => setFilter(k)}>{l} · {n}</button>)}</div>
  <input className="input" placeholder="Buscar pelo nome…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ margin: "4px 0 8px" }} />
  <div className="fn-list">{shown.map((r) => <div className="fn-row" key={r.p.id}>
    <span className="fn-row-main">
    <b>{r.p.name}</b>
    <small>{r.st === "paid" ? "Pago" : r.st === "na" ? "Não se aplica" : r.late ? "Em atraso" : "Em aberto"}</small>
    </span>{r.st !== "na" && <button className={"btn" + (r.st === "paid" ? "" : " primary")} disabled={busy === r.p.id} onClick={() => toggle(r)}>{busy === r.p.id ? "…" : r.st === "paid" ? "Desfazer" : "Dar baixa"}</button>}</div>)}{!shown.length && <p className="muted">Ninguém nesta lista.</p>}</div>
  <p className="muted small">Use "Dar baixa" para pagamentos em dinheiro. Pagamentos com comprovante são baixados automaticamente ao confirmar.</p>
 </div>;
}

export function FinanceExtras({ people, charges, giras, reload, setMessage }) {
  const [form, setForm] = useState(null),
    [busy, setBusy] = useState(false),
    [openBatch, setOpenBatch] = useState(null),
    [search, setSearch] = useState("");
  const groups2 = {};
  charges.forEach((c) => {
    const k = c.batch_id || c.id;
    (groups2[k] ??= []).push(c);
  });
  const list = Object.entries(groups2).map(([k, items]) => ({ k, items, first: items[0], paid: items.filter((x) => x.status === "paid").length })).sort((a, b) => new Date(b.first.created_at) - new Date(a.first.created_at));
  const blank = { description: "", amount: "", due_date: "", target: "all", ids: [], gira_id: "" };
  const create = async () => {
    if (busy) return;
    if (!form.description.trim() || !(Number(form.amount) > 0)) {
      setMessage("Informe a descrição e um valor maior que zero.");
      return;
    }
    if (form.target === "specific" && !form.ids.length) {
      setMessage("Escolha pelo menos uma pessoa.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("admin_create_extra_charge_batch", { p_profile_ids: form.target === "all" ? [] : form.ids, p_description: form.description.trim(), p_amount: Number(form.amount), p_due_date: form.due_date || null, p_gira_id: form.gira_id || null, p_scope: form.target });
    setBusy(false);
    if (error) {
      setMessage(err(error));
      return;
    }
    setForm(null);
    setMessage("Cobrança criada.");
    reload();
  };
  const toggle = async (c) => {
    const { error } = await supabase.rpc("admin_set_extra_charge_status", { p_charge_id: c.id, p_status: c.status === "paid" ? "unpaid" : "paid" });
    if (error) setMessage(err(error));
    else reload();
  };
  const removeBatch = async (g) => {
    if (!confirm('Excluir a cobrança "' + g.first.description + '" de todas as pessoas?')) return;
    const { error } = g.first.batch_id ? await supabase.rpc("admin_delete_extra_charge_batch", { p_batch_id: g.first.batch_id }) : await supabase.rpc("admin_delete_extra_charge", { p_charge_id: g.first.id });
    if (error) setMessage(err(error));
    else {
      setMessage("Cobrança excluída.");
      setOpenBatch(null);
      reload();
    }
  };
  const name = (id) => people.find((p) => p.id === id)?.name || "Pessoa";
  if (form) {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    const found = people.filter((p) => !p.is_pai_de_santo && !form.ids.includes(p.id) && q && p.name.toLocaleLowerCase("pt-BR").includes(q)).slice(0, 8);
    return <div className="card gw-panel">
   <h3 style={{ marginTop: 0 }}>Nova cobrança</h3>
   <div className="field">
     <label htmlFor="fx-d">Descrição</label>
     <input id="fx-d" className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex.: Materiais da festa de Exu" />
     </div>
   <div className="grid">
     <div className="field">
     <label htmlFor="fx-a">Valor (R$)</label>
     <input id="fx-a" className="input" type="number" min="0" step="0.01" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
     </div>
     <div className="field">
     <label htmlFor="fx-v">Vencimento</label>
     <input id="fx-v" className="input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
     </div>
     </div>
   <div className="field">
     <label>Cobrar de</label>
     <div className="bl-seg">
     <button type="button" className={form.target === "all" ? "is-on" : ""} onClick={() => setForm({ ...form, target: "all" })}>Todos os pagantes</button>
     <button type="button" className={form.target === "specific" ? "is-on" : ""} onClick={() => setForm({ ...form, target: "specific" })}>Pessoas específicas</button>
     </div>
    {form.target === "specific" && <>
      <input className="input" placeholder="Buscar pelo nome…" value={search} onChange={(e) => setSearch(e.target.value)} />{found.length > 0 && <div className="fn-found">{found.map((p) => <button type="button" key={p.id} onClick={() => {
      setForm({ ...form, ids: [...form.ids, p.id] });
      setSearch("");
    }}>
      <Plus size={13} /> {p.name}</button>)}</div>}<div className="fn-selected">{form.ids.map((id) => <span key={id} className="fn-chip is-ok">{name(id)} <button type="button" aria-label={"Remover " + name(id)} onClick={() => setForm({ ...form, ids: form.ids.filter((x) => x !== id) })}>×</button>
      </span>)}</div>
      </>}
    {form.target === "all" && <p className="muted small">Vai para todas as pessoas que pagam mensalidade (inclusive quem entrar depois).</p>}</div>
   <div className="field">
     <label htmlFor="fx-g">Vincular a uma gira (opcional)</label>
     <select id="fx-g" className="select" value={form.gira_id} onChange={(e) => setForm({ ...form, gira_id: e.target.value })}>
     <option value="">Nenhuma</option>{giras.map((g) => <option key={g.id} value={g.id}>{g.name} · {new Date(g.starts_at).toLocaleDateString("pt-BR")}</option>)}</select>
     </div>
   <div className="gw-actions">
     <button className="btn" onClick={() => setForm(null)}>Cancelar</button>
     <button className="btn primary" disabled={busy} onClick={create}>{busy ? "Criando…" : "Criar cobrança"}</button>
     </div>
  </div>;
  }
  return <div>
  <button className="btn primary" onClick={() => {
    setForm(blank);
    setSearch("");
  }}><Plus size={14} /> Nova cobrança</button>
  <div className="fn-list" style={{ marginTop: 12 }}>{list.map((g) => <div key={g.k} className="fn-batch">
   <button type="button" className="fn-row fn-row-btn" onClick={() => setOpenBatch(openBatch === g.k ? null : g.k)}>
     <span className="fn-row-main">
     <b>{g.first.description}</b>
     <small>{money(g.first.amount)} · {g.first.due_date ? "vence " + (/* @__PURE__ */ new Date(g.first.due_date + "T12:00:00")).toLocaleDateString("pt-BR") : "sem vencimento"} · {g.first.scope === "all" ? "todos" : "específicas"}</small>
     </span>
     <span className={"fn-chip " + (g.paid === g.items.length ? "is-ok" : "is-warn")}>{g.paid}/{g.items.length} pagaram</span>
     </button>
   {openBatch === g.k && <div className="fn-batch-body">{g.items.map((c) => <div className="fn-row" key={c.id}>
     <span className="fn-row-main">
     <b>{name(c.profile_id)}</b>
     <small>{c.status === "paid" ? "Pago" : "Em aberto"}</small>
     </span>
     <button className={"btn" + (c.status === "paid" ? "" : " primary")} onClick={() => toggle(c)}>{c.status === "paid" ? "Desfazer" : "Dar baixa"}</button>
     </div>)}<button className="btn danger" style={{ marginTop: 8 }} onClick={() => removeBatch(g)}>
     <Trash2 size={14} /> Excluir cobrança</button>
     </div>}
  </div>)}{!list.length && <p className="muted">Nenhuma cobrança criada ainda.</p>}</div>
 </div>;
}

export function FinanceProofs({ reload, setMessage }) {
  const [rows, setRows] = useState(null),
    [urls, setUrls] = useState({}),
    [busy, setBusy] = useState(""),
    [view, setView] = useState(null),
    [status, setStatus] = useState("pending");
  const load = async () => {
    const { data, error } = await supabase.rpc("admin_list_payment_proofs", { p_status: status });
    if (error) {
      setMessage(err(error));
      setRows([]);
      return;
    }
    setRows(data || []);
    const map = {};
    await Promise.all((data || []).filter((x) => !x.file_deleted_at).map(async (x) => {
      const { data: s } = await supabase.storage.from("comprovantes").createSignedUrl(x.file_path, 900);
      if (s?.signedUrl) map[x.id] = s.signedUrl;
    }));
    setUrls(map);
  };
  useEffect(() => {
    load();
  }, [status]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("admin_payment_proofs_to_purge");
      if (!data?.length) return;
      const { error } = await supabase.storage.from("comprovantes").remove(data.map((x) => x.file_path));
      if (!error) await supabase.rpc("admin_mark_proof_files_deleted", { p_ids: data.map((x) => x.id) });
    })();
  }, []);
  const review = async (x, approve) => {
    if (busy) return;
    let reason = null;
    if (!approve) {
      reason = window.prompt("Motivo da recusa (a pessoa vai ver esta mensagem):", "O valor não confere");
      if (reason === null) return;
      if (!reason.trim()) {
        alert("Informe o motivo.");
        return;
      }
    }
    setBusy(x.id);
    const { error } = await supabase.rpc("admin_review_payment_proof", { p_id: x.id, p_approve: approve, p_reason: reason });
    setBusy("");
    if (error) {
      setMessage(err(error));
      return;
    }
    setMessage(approve ? "Pagamento de " + x.name + " confirmado e baixado." : "Comprovante recusado. " + x.name + " será avisado(a).");
    setView(null);
    load();
    reload();
  };
  const isPdf = (x) => /\.pdf$/i.test(x.file_path);
  return <div>
  <div className="bl-seg bl-seg-sm" style={{ marginBottom: 12 }}>
    <button className={status === "pending" ? "is-on" : ""} onClick={() => setStatus("pending")}>Para conferir</button>
    <button className={status === "all" ? "is-on" : ""} onClick={() => setStatus("all")}>Histórico</button>
    </div>
  {rows === null ? <div className="hm-skeleton" /> : !rows.length ? <div className="hm-clear">
    <Check size={18} />
    <span>{status === "pending" ? "Nenhum comprovante esperando conferência." : "Nada por aqui ainda."}</span>
    </div> : <div className="fn-list">{rows.map((x) => <div className="fn-proof" key={x.id}>
   <button type="button" className="fn-thumb" onClick={() => urls[x.id] && (isPdf(x) ? window.open(urls[x.id], "_blank") : setView(x))} aria-label="Ver comprovante">{x.file_deleted_at ? <small>apagado</small> : isPdf(x) ? <FileText size={20} /> : urls[x.id] ? <img src={urls[x.id]} alt="" /> : <small>…</small>}</button>
   <span className="fn-row-main">
     <b>{x.name}</b>
     <small>{x.description} · {money(x.amount)}</small>
     <small className="muted">{x.status === "pending" ? "enviado " + new Date(x.created_at).toLocaleDateString("pt-BR") : (x.status === "approved" ? "confirmado" : "recusado") + (x.reviewer_name ? " por " + x.reviewer_name : "") + " em " + new Date(x.reviewed_at).toLocaleDateString("pt-BR")}{x.reject_reason ? " · " + x.reject_reason : ""}</small>
     </span>
   {x.status === "pending" && <span className="fn-proof-actions">
     <button className="btn" disabled={busy === x.id} aria-label="Recusar" onClick={() => review(x, false)}>
     <X size={15} />
     </button>
     <button className="btn primary" disabled={busy === x.id} aria-label="Confirmar" onClick={() => review(x, true)}>
     <Check size={15} />
     </button>
     </span>}
  </div>)}</div>}
  {view && <div className="modal-back" onClick={() => setView(null)}>
    <div className="modal fn-proof-view" onClick={(e) => e.stopPropagation()}>
    <div className="row between">
    <b>{view.name} · {view.description}</b>
    <button className="btn" onClick={() => setView(null)} aria-label="Fechar">
    <X size={15} />
    </button>
    </div>
    <img src={urls[view.id]} alt={"Comprovante de " + view.name} />{view.status === "pending" && <div className="row" style={{ justifyContent: "flex-end", marginTop: 10 }}>
    <button className="btn" onClick={() => review(view, false)}>Recusar</button>
    <button className="btn primary" onClick={() => review(view, true)}>Confirmar pagamento</button>
    </div>}</div>
    </div>}
  <p className="muted small" style={{ marginTop: 12 }}>Os arquivos são apagados automaticamente 30 dias depois da conferência. O registro do pagamento continua.</p>
 </div>;
}

export function FinancePeople({ people, reload, setMessage }) {
  const [search, setSearch] = useState(""),
    [open, setOpen] = useState(null),
    [draft, setDraft] = useState(null),
    [busy, setBusy] = useState(false);
  const q = search.trim().toLocaleLowerCase("pt-BR");
  const shown = people.filter((p) => !q || p.name.toLocaleLowerCase("pt-BR").includes(q));
  const label = (p) => p.is_pai_de_santo ? "Pai/Mãe de Santo · não paga" : payerMode(p) === "never" ? "Não se aplica" : payerMode(p) === "from" ? "A partir de " + ymLabel(String(p.financial_start_month).slice(0, 7)) : "Paga sempre";
  const tone = (p) => p.is_pai_de_santo || payerMode(p) === "never" ? "" : payerMode(p) === "from" ? "is-warn" : "is-ok";
  const start = (p) => {
    setOpen(p.id);
    setDraft({ mode: payerMode(p), month: p.financial_start_month ? String(p.financial_start_month).slice(0, 7) : ymOf(/* @__PURE__ */ new Date()) });
  };
  const save = async (p) => {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_set_finance_mode", { p_profile_id: p.id, p_mode: draft.mode, p_start_month: draft.mode === "from" ? draft.month + "-01" : null });
    setBusy(false);
    if (error) {
      setMessage(err(error));
      return;
    }
    setMessage("Configuração de " + p.name + " salva.");
    setOpen(null);
    reload();
  };
  return <div>
  <input className="input" placeholder="Buscar pelo nome…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 8 }} />
  <div className="fn-list">{shown.map((p) => <div key={p.id} className="fn-batch">
   <button type="button" className="fn-row fn-row-btn" disabled={p.is_pai_de_santo} onClick={() => open === p.id ? setOpen(null) : start(p)}>
     <span className="fn-row-main">
     <b>{p.name}</b>
     </span>
     <span className={"fn-chip " + tone(p)}>{label(p)}</span>
     </button>
   {open === p.id && draft && <div className="fn-batch-body">
    <p className="muted small" style={{ margin: "0 0 6px" }}>Paga mensalidade?</p>
    <div className="bl-seg">{[["always", "Sempre"], ["from", "A partir de…"], ["never", "Não se aplica"]].map(([k, l]) => <button type="button" key={k} className={draft.mode === k ? "is-on" : ""} onClick={() => setDraft({ ...draft, mode: k })}>{l}</button>)}</div>
    {draft.mode === "from" && <div className="field">
      <label htmlFor={"m" + p.id}>Começa em</label>
      <input id={"m" + p.id} className="input" type="month" value={draft.month} onChange={(e) => setDraft({ ...draft, month: e.target.value })} />
      <small className="muted">Meses antes disso não contam como dívida.</small>
      </div>}
    {draft.mode === "never" && <p className="muted small">Não entra na conta de mensalidades. Cobranças específicas ainda podem ser enviadas a esta pessoa.</p>}
    <div className="row" style={{ justifyContent: "flex-end" }}>
      <button className="btn" onClick={() => setOpen(null)}>Cancelar</button>
      <button className="btn primary" disabled={busy} onClick={() => save(p)}>{busy ? "Salvando…" : "Salvar"}</button>
      </div>
   </div>}
  </div>)}</div>
 </div>;
}

export function FinanceSettingsCard({ settings, onSaved }) {
  const [f, setF] = useState({ ...settings }), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const save = async () => {
    if (!(Number(f.monthly_amount) >= 0) || !(Number(f.due_day) >= 1 && Number(f.due_day) <= 28) || !String(f.pix_key || "").trim()) {
      setMsg("Confira os valores: dia de 1 a 28 e chave Pix preenchida.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("admin_save_finance_settings", { p: { monthly_amount: Number(f.monthly_amount), due_day: Number(f.due_day), reminder_days: Number(f.reminder_days), pix_key: f.pix_key, pix_holder: f.pix_holder || "" } });
    setBusy(false);
    if (error) setMsg(err(error));
    else onSaved();
  };
  return <div className="card gw-panel"><h3 style={{ marginTop: 0 }}>Configurações do financeiro</h3>
  <div className="grid">
    <div className="field">
    <label htmlFor="fs-a">Mensalidade (R$)</label>
    <input id="fs-a" className="input" type="number" min="0" step="0.01" value={f.monthly_amount} onChange={(e) => setF({ ...f, monthly_amount: e.target.value })} />
    </div>
    <div className="field">
    <label htmlFor="fs-d">Vence todo dia</label>
    <input id="fs-d" className="input" type="number" min="1" max="28" value={f.due_day} onChange={(e) => setF({ ...f, due_day: e.target.value })} />
    </div>
    </div>
  <div className="field">
    <label htmlFor="fs-r">Lembrete quantos dias antes</label>
    <input id="fs-r" className="input" type="number" min="0" max="15" value={f.reminder_days} onChange={(e) => setF({ ...f, reminder_days: e.target.value })} />
    </div>
  <div className="grid">
    <div className="field">
    <label htmlFor="fs-k">Chave Pix</label>
    <input id="fs-k" className="input" value={f.pix_key} onChange={(e) => setF({ ...f, pix_key: e.target.value })} />
    </div>
    <div className="field">
    <label htmlFor="fs-h">Nome do titular (opcional)</label>
    <input id="fs-h" className="input" value={f.pix_holder || ""} onChange={(e) => setF({ ...f, pix_holder: e.target.value })} />
    </div>
    </div>
  {msg && <div className="gw-warning">{msg}</div>}
  <div className="row" style={{ justifyContent: "flex-end" }}>
    <button className="btn primary" disabled={busy} onClick={save}>{busy ? "Salvando…" : "Salvar configurações"}</button>
    </div>
 </div>;
}
