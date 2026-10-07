// Área "Meu espaço": perfil, financeiro pessoal, contato com os Pais, instalar app.
import { useEffect, useState } from "react";
import { CalendarDays, UserRound, WalletCards, BookOpen, ShieldCheck, LogOut, RefreshCw, ChevronRight, Save, ArrowLeft, Download } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { OrixaIcon, ORIXAS } from "../../orixaSymbols.jsx";
import { err, groups, money, formatPhone, phoneDigits } from "../../lib/helpers.js";
import { AvisosOption } from "../avisos/AtivarAvisos.jsx";
import { Field } from "../../components/ui.jsx";
import { hasAnyAdmin } from "../acesso.js";
import { useMemberFinance } from "../financeiro/regras.js";
import { PayModal } from "../financeiro/ComoPagar.jsx";

export function InstallApp() {
  const [deferred, setDeferred] = useState(null), [show, setShow] = useState(false);
  useEffect(() => {
    const h = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  const install = async () => {
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else setShow(true);
  };
  return <>
    <button className="card list-item row between" onClick={install}>
    <span className="row">
    <Download size={17} /> Adicionar à tela inicial</span>
    <ChevronRight size={17} />
    </button>{show && <div className="install-help">
    <div className="install-help-card">
    <div className="row between">
    <h3>Adicionar o TPBC ao celular</h3>
    <button className="btn" onClick={() => setShow(false)}>Fechar</button>
    </div>{ios ? <p>1. Abra o TPBC no <b>Safari</b>.<br />2. Toque em <b>Compartilhar</b>.<br />3. Escolha <b>Adicionar à Tela de Início</b>.<br />4. Toque em <b>Adicionar</b>.</p> : <p>1. Abra o TPBC no <b>Chrome</b>.<br />2. Toque no menu <b>⋮</b>.<br />3. Escolha <b>Adicionar à tela inicial</b> ou <b>Instalar app</b>.<br />4. Confirme.</p>}<p className="muted small">Depois disso, o TPBC aparecerá junto dos seus aplicativos e poderá abrir em formato de aplicativo.</p>
    </div>
    </div>}</>;
}

export function Me({ p, go, logout, memberPreview = false }) {
  const [tab, setTab] = useState("menu");
  if (tab === "profile") return <Profile p={p} back={() => setTab("menu")} />;
  if (tab === "finance") return <Finance p={p} back={() => setTab("menu")} />;
  const orixa = p.orixa_symbol || "oxala";
  const roleLabel = p.role === "admin" ? "Administrador" : p.role === "editor" ? "Editor" : "Membro";
  const group = p.groups?.name || "Organização";
  return <div className={"me-page me-orixa-" + orixa}>
    <div className="me-intro">
    <div>
    <span className="eyebrow">EU</span>
    <h1>Meu perfil</h1>
    <p>Minha caminhada também faz parte da casa.</p>
    </div>
    <OrixaIcon name={orixa} size={42} />
    </div>
    <div className="me-card">
    <div className="me-card-orixa">
    <div className="me-card-orixa-art">
    <OrixaIcon name={orixa} size={106} />
    </div>
    <strong>{ORIXAS.find((x) => x[0] === orixa)?.[1] || "Orixá"}</strong>
    <span>MINHA CAMINHADA</span>
    </div>
    <div className="me-card-main">
    <span className="me-card-house">TERREIRO PAI BENEDITO DO CONGO</span>
    <h2>{p.name}</h2>
    <p className="me-card-group">{group}</p>
    <span className="me-card-role">{roleLabel}</span>
    <div className="me-card-rule" />
    <p className="me-card-quote">“Caminho com meus Orixás, construo com minha comunidade.”</p>
    </div>
    <div className="me-card-side">
    <span>AXÉ</span>
    <span>DISCIPLINA</span>
    <span>MOVIMENTO</span>
    <span>CONHECIMENTO</span>
    </div>
    </div>
    <div className="me-section-head">
    <h2>Minha vida na casa</h2>
    <p>Acompanhe sua jornada, suas participações e sua contribuição.</p>
    </div>
    <div className="me-shortcuts">{!p?.is_pai_de_santo && <button className="me-shortcut" onClick={() => setTab("finance")}>
    <WalletCards />
    <span>
    <b>Meu financeiro</b>
    <small>Mensalidades e contribuições</small>
    </span>
    <ChevronRight />
    </button>}<button className="me-shortcut" onClick={() => setTab("profile")}>
    <UserRound />
    <span>
    <b>Meus dados</b>
    <small>Informações pessoais e minha jornada</small>
    </span>
    <ChevronRight />
    </button>
    <button className="me-shortcut" onClick={() => go("giras")}>
    <CalendarDays />
    <span>
    <b>Minhas giras</b>
    <small>Veja suas participações e tarefas</small>
    </span>
    <ChevronRight />
    </button>
    <button className="me-shortcut" onClick={() => go("content")}>
    <BookOpen />
    <span>
    <b>Conteúdos da casa</b>
    <small>Textos, avisos e materiais</small>
    </span>
    <ChevronRight />
    </button>
    </div>
    <div className="me-section-head me-other-head">
    <h2>Outras opções</h2>
    <p>Configurações e recursos do aplicativo.</p>
    </div>
    <div className="me-options">{!memberPreview && hasAnyAdmin(p) && <button onClick={() => go("admin")}>
    <ShieldCheck />
    <span>
    <b>Gestão da casa</b>
    <small>Gerencie pessoas, giras e conteúdos</small>
    </span>
    <ChevronRight />
    </button>}<AvisosOption /><InstallApp />
    <button onClick={logout}>
    <LogOut />
    <span>
    <b>Sair</b>
    <small>Encerrar minha sessão</small>
    </span>
    <ChevronRight />
    </button>
    </div>
    </div>;
}

export function ContactParents({ back }) {
  const [question, setQuestion] = useState(""),
    [items, setItems] = useState([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const load = async () => {
    const { data, error } = await supabase.rpc("my_house_questions");
    if (!error) setItems(data || []);
  };
  useEffect(() => {
    load();
  }, []);
  const send = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    setMessage("");
    const { error } = await supabase.rpc("submit_house_question", { p_question: question.trim(), p_is_anonymous: false });
    if (error) setMessage(err(error));
    else {
      setQuestion("");
      setMessage("Mensagem enviada. Você poderá acompanhar a leitura e a resposta aqui.");
      load();
    }
    setBusy(false);
  };
  return <div>
    <button className="btn" onClick={back}>
    <ArrowLeft size={15} /> Voltar</button>
    <div className="section-heading">
    <div>
    <span className="eyebrow">FALA COM A CASA</span>
    <h2>Contato com os Pais</h2>
    <p className="muted">Envie uma dúvida, pedido ou assunto diretamente para os Pais da Casa.</p>
    </div>
    </div>
    <div className="card">
    <form onSubmit={send}>
    <Field label="Mensagem">
    <textarea className="textarea" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Escreva sua mensagem…" rows="6" required />
    </Field>{message && <div className="toast">{message}</div>}<button className="btn primary" disabled={busy}>{busy ? "Enviando…" : "Enviar mensagem"}</button>
    </form>
    </div>
    <div className="section-heading">
    <div>
    <span className="eyebrow">ACOMPANHAMENTO</span>
    <h3>Minhas mensagens</h3>
    </div>
    </div>{!items.length ? <div className="card empty">Você ainda não enviou nenhuma mensagem.</div> : items.map((x) => <div className="card" key={x.id}>
    <div className="row between">
    <span className="pill">{x.is_anonymous ? "ANÔNIMA" : "IDENTIFICADA"}</span>
    <span className="muted small">{new Date(x.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
    </div>
    <p style={{ whiteSpace: "pre-wrap" }}>{x.question}</p>
    <div className="muted small">{x.read_at ? "✓ Lida pela casa" : "○ Ainda não lida"} · {x.answer ? "✓ Respondida" : "○ Aguardando resposta"}</div>{x.answer && <div className="card" style={{ marginTop: 12, background: "var(--brand-soft)" }}>
    <b>Resposta dos Pais da Casa</b>
    <p style={{ whiteSpace: "pre-wrap" }}>{x.answer}</p>
    </div>}</div>)}</div>;
}

export function Profile({ p, back }) {
  const [name, setName] = useState(p.name),
    [dob, setDob] = useState(p.date_of_birth || ""),
    [orixa, setOrixa] = useState(p.orixa_symbol),
    [group, setGroup] = useState(p.groups?.name || "Organização"),
    [phone, setPhone] = useState(p.phone ? formatPhone(p.phone) : ""),
    [message, setMessage] = useState("");
  const save = async () => {
    const { error } = await supabase.rpc("update_my_profile", { p_name: name, p_date_of_birth: dob, p_orixa_symbol: orixa, p_group_name: group });
    if (error) return setMessage(err(error));
    if (phoneDigits(phone) !== phoneDigits(p.phone)) {
      const { error: e2 } = await supabase.rpc("update_my_phone", { p_phone: phone });
      if (e2) return setMessage(err(e2));
    }
    setMessage("Perfil atualizado.");
  };
  return <div>
    <button className="btn" onClick={back}>
    <ArrowLeft size={15} /> Eu</button>
    <div className="card">
    <h2>Meu perfil</h2>
    <p className="muted small">Você pode atualizar seus dados pessoais e sua identificação na casa.</p>
    <Field label="Nome">
    <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
    </Field>
    <Field label="Data de nascimento">
    <input className="input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
    </Field>
    <Field label="WhatsApp (opcional)">
    <input className="input" type="tel" inputMode="tel" placeholder="(11) 98765-4321" value={phone} onChange={(e) => setPhone(e.target.value)} />
    </Field>
    <Field label="Orixá">
    <select className="select" value={orixa} onChange={(e) => setOrixa(e.target.value)}>{ORIXAS.map(([v, l]) => <option value={v} key={v}>{l}</option>)}</select>
    </Field>
    <Field label="Grupo">
    <select className="select" value={group} onChange={(e) => setGroup(e.target.value)}>{groups.map((g) => <option key={g}>{g}</option>)}</select>
    </Field>{message && <div className="toast">{message}</div>}<button className="btn primary" onClick={save}>
    <Save size={14} /> Salvar alterações</button>
    </div>
    </div>;
}

export function Finance({ p, back }) {
  const fin = useMemberFinance(p), [payOpen, setPayOpen] = useState(false);
  const [dues, setDues] = useState([]),
    [charges, setCharges] = useState([]),
    [loading, setLoading] = useState(true),
    [showAll, setShowAll] = useState(false);
  const load = async () => {
    setLoading(true);
    const [{ data: d }, { data: c }] = await Promise.all([supabase.from("monthly_dues").select("*").eq("profile_id", p.id).order("reference_month", { ascending: false }), supabase.from("extra_charges").select("*").eq("profile_id", p.id).order("due_date", { ascending: false })]);
    setDues(d || []);
    setCharges(c || []);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, [p.id]);
  const key = (x) => String(x).slice(0, 7);
  const monthLabel = (x) => (/* @__PURE__ */ new Date(x + "-01T12:00:00")).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const ymOffset = (base, n) => {
    const d = /* @__PURE__ */ new Date(base + "-01T12:00:00");
    d.setMonth(d.getMonth() + n);
    return d.toISOString().slice(0, 7);
  };
  const today = /* @__PURE__ */ new Date();
  const current = today.toISOString().slice(0, 7);
  const baseMonths = [ymOffset(current, -1), current, ymOffset(current, 1), ymOffset(current, 2)];
  const overdue = dues.filter((x) => x.status !== "paid" && x.status !== "not_applicable" && key(x.reference_month) < ymOffset(current, -1)).map((x) => key(x.reference_month));
  const visible = [.../* @__PURE__ */ new Set([...overdue, ...baseMonths])].sort((a, b) => a.localeCompare(b));
  const allMonths = [.../* @__PURE__ */ new Set([...dues.map((x) => key(x.reference_month)), current, ymOffset(current, 1), ymOffset(current, 2)])].sort((a, b) => a.localeCompare(b));
  const months = showAll ? allMonths : visible;
  const statusFor = (m) => {
    const d = dues.find((x) => key(x.reference_month) === m);
    if (d?.status === "paid") return "paid";
    if (d?.status === "not_applicable") return "not_applicable";
    if (fin.proofs.some((x) => x.status === "pending" && x.kind === "monthly" && String(x.reference_month).slice(0, 7) === m)) return "review";
    if (m < current || m === current && today.getDate() >= fin.settings.due_day) return "overdue";
    return "open";
  };
  const statusText = (s) => s === "paid" ? "Pago" : s === "not_applicable" ? "Não se aplica" : s === "overdue" ? "Atrasado" : s === "review" ? "Em análise" : "Em aberto";
  return <div>
    <button className="btn" onClick={back}>
    <ArrowLeft size={15} /> Eu</button>
    <div className="row between">
    <div>
    <span className="eyebrow">MEU FINANCEIRO</span>
    <h2>Financeiro</h2>
    </div>
    <div className="row">
    <button className="btn primary" onClick={() => setPayOpen(true)}>Como pagar</button>
    <button className="btn" onClick={() => {
    load();
    fin.reload();
  }} aria-label="Atualizar">
    <RefreshCw size={14} />
    </button>
    </div>
    </div>{payOpen && <PayModal p={p} settings={fin.settings} items={fin.items} onClose={() => setPayOpen(false)} onSent={() => {
    fin.reload();
    load();
  }} />}{loading ? <div className="card muted">Carregando…</div> : <>
    <div className="card">
    <div className="row between finance-member-heading">
    <div>
    <h3>Mensalidades</h3>
    <p className="muted small">Acompanhe suas mensalidades, pagamentos e vencimentos.</p>
    </div>
    <button className="btn finance-see-all" onClick={() => setShowAll((v) => !v)}>{showAll ? "Ver menos" : "Ver todas"}</button>
    </div>
    <div className="finance-member-months">{months.map((m) => {
    const status = statusFor(m);
    return <div className={"finance-member-month " + status} key={m}>
      <div>
      <b>{monthLabel(m)}</b>
      <div className="muted small">{status === "overdue" ? "Em atraso" : status === "open" ? "Vencimento atual" : status === "not_applicable" ? "Não se aplica" : m > current ? "Próximo vencimento" : "Pago"}</div>
      </div>
      <span className={"finance-status-btn " + status}>
      <span className="finance-status-dot" />{statusText(status)}</span>
      </div>;
  })}</div>{!showAll && <p className="muted small finance-history-hint">Mostrando atrasados, o mês atual e os próximos vencimentos. Toque em “Ver todas” para consultar todo o histórico.</p>}</div>
    <div className="card">
    <h3>Outras cobranças</h3>{charges.length ? charges.map((x) => <div className="list-item" key={x.id}>
    <div className="row between">
    <b>{x.description}</b>
    <b>{money(x.amount)}</b>
    </div>
    <div className="muted small">{x.due_date ? "Vencimento " + (/* @__PURE__ */ new Date(x.due_date + "T12:00:00")).toLocaleDateString("pt-BR") : "Sem vencimento"} · {x.status === "paid" ? "Pago" : "Não pago"}</div>
    </div>) : <p className="muted">Nenhuma outra cobrança.</p>}</div>
    </>}</div>;
}

export function House({ back }) {
  const [items, setItems] = useState([]);
  const labels = { rule: "Regra da casa", orientation: "Orientação", important: "Informação importante" };
  const cleanHtml = (html) => String(html || "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<([a-z]+)\s+[^>]*>/gi, "<$1>");
  const textToHtml = (t) => String(t || "").split(/\n\n+/).map((x) => "<p>" + x.replace(/\n/g, "<br>") + "</p>").join("");
  useEffect(() => {
    supabase.from("house_contents").select("*").order("sort_order").then(({ data }) => setItems(data || []));
    supabase.rpc("touch_my_last_seen");
  }, []);
  return <div className="house-info">
    <button className="btn" onClick={back}>
    <ArrowLeft size={15} /> Eu</button>
    <div className="section-heading house-info-heading">
    <div>
    <span className="eyebrow">NOSSA CASA</span>
    <h2>Informações da casa</h2>
    <p className="muted">Regras e orientações permanentes da casa.</p>
    </div>
    </div>{!items.length ? <div className="card empty">Nenhum conteúdo publicado.</div> : <div className="house-content-list">{items.map((x, i) => <article className="house-content-card" key={x.id}>
    <div className="house-content-top">
    <span className="content-kind">{labels[x.content_type] || "Informação"}</span>
    <span className="content-number">{String(i + 1).padStart(2, "0")}</span>
    </div>
    <h3>{x.title}</h3>{x.tags?.length > 0 && <div className="content-tags">{x.tags.map((t) => <span className="content-tag" key={t}>{t}</span>)}</div>}<div className="house-content-body" dangerouslySetInnerHTML={{ __html: cleanHtml(/<[a-z][\s\S]*>/i.test(x.body || "") ? x.body : textToHtml(x.body)) }} />
    </article>)}</div>}</div>;
}

export function ProfileMenu({ setTab, p }) {
  return <div>
    <button className="btn" onClick={() => setTab("menu")}>
    <ArrowLeft size={15} /> Eu</button>
    <div className="section-heading">
    <div>
    <span className="eyebrow">MEU PERFIL</span>
    <h2>Meu Perfil</h2>
    <p className="muted">Acesse suas informações pessoais e seu financeiro.</p>
    </div>
    </div>
    <div className="list">{!p?.is_pai_de_santo && <button className="card list-item row between" onClick={() => setTab("finance")}>
    <span className="row">
    <WalletCards /> Meu financeiro</span>
    <ChevronRight size={17} />
    </button>}<button className="card list-item row between" onClick={() => setTab("profile")}>
    <span className="row">
    <UserRound /> Meu perfil</span>
    <ChevronRight size={17} />
    </button>
    </div>
    </div>;
}
