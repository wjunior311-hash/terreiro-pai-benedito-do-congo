// Menu da Gestão da Casa, visão geral, dúvidas e convites.
import { useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { dateTime, err, financialEligible } from "../../lib/helpers.js";
import { Field } from "../../components/ui.jsx";
import { can } from "../acesso.js";
import { Content } from "../conteudos/GestaoConteudos.jsx";
import { AdminRoles, People } from "./Pessoas.jsx";
import { Frequencia } from "./Frequencia.jsx";
import { GestaoRevista } from "../revista/GestaoRevista.jsx";
import { GiraTurnManager } from "./GestaoGiras.jsx";
import { AdminFinance } from "../financeiro/GestaoFinanceira.jsx";

export function Admin({ p }) {
  const full = can(p, "admin.full"), master = !!p?.is_master;
  const nav = [...full ? [["overview", "Visão"]] : [], ...can(p, "people.manage") ? [["people", "Pessoas"], ["attendance", "Frequência"]] : [], ...can(p, "giras.manage") ? [["giras", "Giras"]] : [], ...can(p, "finance.view") ? [["finance", "Financeiro"]] : [], ...full ? [["invites", "Convites"]] : [], ...can(p, "content.manage") ? [["content", "Conteúdos"]] : [], ...can(p, "newsletter.manage") ? [["revista", "Revista"]] : [], ...full ? [["questions", "Dúvidas"]] : [], ...master ? [["roles", "Funções"]] : []];
  const [tab, setTab] = useState(nav[0]?.[0] || "overview");
  if (!nav.length) return null;
  const allowed = nav.some(([id]) => id === tab);
  const subtitle = full ? "Pessoas, giras, financeiro e conteúdos" : nav.map((x) => x[1]).join(", ");
  return <div>
    {!full && <p className="muted small" style={{ margin: "0 2px 10px" }}>Você pode acessar: {subtitle}</p>}
    <div className="admin-nav">{nav.map(([id, label]) => <button className={"btn " + (tab === id ? "primary" : "")} key={id} onClick={() => setTab(id)}>{label}</button>)}</div>{allowed && <>{tab === "overview" && <AdminOverview onNavigate={setTab} />}{tab === "people" && <People me={p} />}{tab === "attendance" && <Frequencia />}{tab === "giras" && <GiraTurnManager p={p} editor={!full} />}{tab === "finance" && <AdminFinance />}{tab === "invites" && <Invites />}{tab === "content" && <Content />}{tab === "revista" && <GestaoRevista p={p} />}{tab === "questions" && <AdminQuestions />}{tab === "roles" && <AdminRoles />}</>}</div>;
}

export function AdminOverview({ onNavigate }) {
  const [stats, setStats] = useState(null),
    [loading, setLoading] = useState(true),
    [message, setMessage] = useState("");
  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const now = /* @__PURE__ */ new Date(), month = now.toISOString().slice(0, 7), cutoff = new Date(now.getTime() - 3 * 864e5);
      const [{ data: people }, { data: dues }, { data: giras }, { data: questions }] = await Promise.all([
        supabase.from("profiles").select("id,name,email,date_of_birth,orixa_symbol,group_id,is_active,role,leadership_seal,last_seen_at").eq("is_active", true).order("name"),
        supabase.from("monthly_dues").select("profile_id,status,reference_month").eq("reference_month", month + "-01"),
        supabase.from("giras").select("*").eq("status", "published").gte("starts_at", now.toISOString()).order("starts_at").limit(1),
        supabase.rpc("admin_house_questions", { p_status: "open" })
      ]);
      const next = giras?.[0] || null;
      const attendance = next ? (await supabase.rpc("editor_gira_attendance", { p_gira_id: next.id })).data || [] : [];
      const eligiblePeople = (people || []).filter((x) => financialEligible(x.date_of_birth, now, x.is_pai_de_santo));
      const paid = new Set((dues || []).filter((x) => x.status === "paid").map((x) => x.profile_id));
      const unpaid = Math.max(0, eligiblePeople.length - paid.size);
      const noResponse = (attendance || []).filter((x) => x.status === "no_response").length;
      const inactive = (people || []).filter((x) => !x.last_seen_at || new Date(x.last_seen_at) < cutoff).map((x) => {
        const seen = x.last_seen_at ? new Date(x.last_seen_at) : null;
        const days = seen ? Math.floor((now - seen) / 864e5) : null;
        return { ...x, days };
      });
      inactive.sort((a, b) => (b.days ?? 99999) - (a.days ?? 99999));
      setStats({ active: people?.length || 0, unpaid, questions: (questions || []).length, next, noResponse, inactive });
    } catch (e) {
      setMessage(err(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const go = (tab) => onNavigate(tab);
  return <div className="admin-dashboard">
    <div className="row between">
    <div>
    <span className="eyebrow">PAINEL DA CASA</span>
    <h2>Visão</h2>
    <p className="muted">Um resumo rápido do que precisa de atenção agora.</p>
    </div>
    <button className="btn" onClick={load}>
    <RefreshCw size={14} /> Atualizar</button>
    </div>
 {message && <div className="toast">{message}</div>}
 {loading ? <div className="card">Carregando o painel…</div> : stats && <>
  <div className="usage-summary">
   <button className="card dashboard-kpi" onClick={() => go("people")}>
     <b>{stats.active}</b>
     <span>Membros ativos</span>
     </button>
   <button className="card dashboard-kpi" onClick={() => go("finance")}>
     <b>{stats.unpaid}</b>
     <span>Mensalidades não pagas</span>
     </button>
   <button className="card dashboard-kpi" onClick={() => go("giras")}>
     <b>{stats.noResponse}</b>
     <span>Sem resposta na próxima gira</span>
     </button>
   <button className="card dashboard-kpi" onClick={() => go("questions")}>
     <b>{stats.questions}</b>
     <span>Mensagens pendentes</span>
     </button>
  </div>
  <div className="dashboard-grid" style={{ marginTop: 16 }}>
   <div className="card dashboard-panel">
     <div className="row between">
     <div>
     <span className="eyebrow">PRÓXIMA GIRA</span>
     <h3>{stats.next ? stats.next.name : "Nenhuma gira próxima"}</h3>
     </div>{stats.next && <span className="pill">{stats.noResponse} sem resposta</span>}</div>{stats.next ? <>
     <p className="muted small">{dateTime(stats.next.starts_at)}</p>
     <div className="dashboard-line">
     <span>Respostas pendentes</span>
     <b>{stats.noResponse}</b>
     </div>
     <button className="btn" onClick={() => go("giras")}>Acompanhar gira →</button>
     </> : <p className="muted">Cadastre a próxima gira para acompanhar as respostas.</p>}</div>
   <div className="card dashboard-panel">
     <div className="row between">
     <div>
     <span className="eyebrow">ACESSO AO APLICATIVO</span>
     <h3>{stats.inactive.length} não entram há mais de 3 dias</h3>
     </div>
     <span className="pill">{stats.inactive.length}</span>
     </div>{stats.inactive.length ? <div className="dashboard-mini-list">{stats.inactive.slice(0, 5).map((x) => <div className="dashboard-mini-row" key={x.id}>
     <div>
     <b>{x.name || x.email}</b>
     <small>{x.last_seen_at ? "Último acesso há " + x.days + " dias" : "Nunca entrou"}</small>
     </div>
     </div>)}</div> : <p className="muted">Todos os membros ativos acessaram o aplicativo nos últimos 3 dias.</p>}{stats.inactive.length > 5 && <p className="muted small">+ {stats.inactive.length - 5} outras pessoas.</p>}<button className="btn" onClick={() => go("people")}>Ver pessoas →</button>
     </div>
  </div>
  <div className="dashboard-note">
    <span>Resumo da casa</span>
    <b>{stats.unpaid === 0 && stats.noResponse === 0 && stats.questions === 0 && stats.inactive.length === 0 ? "Tudo em dia." : "Há itens que merecem atenção."}</b>
    </div>
 </>}</div>;
}

export function AdminQuestions() {
  const [items, setItems] = useState([]),
    [status, setStatus] = useState("open"),
    [loading, setLoading] = useState(true),
    [message, setMessage] = useState(""),
    [answers, setAnswers] = useState({});
  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_house_questions", { p_status: status });
    if (error) setMessage(err(error));
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, [status]);
  const answer = async (id) => {
    const text = answers[id] || "";
    if (!text.trim()) return;
    const { error } = await supabase.rpc("admin_answer_house_question", { p_id: id, p_answer: text });
    if (error) setMessage(err(error));
    else {
      setAnswers({ ...answers, [id]: "" });
      load();
    }
  };
  const markRead = async (id) => {
    await supabase.rpc("mark_house_question_read", { p_id: id });
    load();
  };
  return <div>
    <div className="row between">
    <div>
    <span className="eyebrow">CAIXA DA CASA</span>
    <h2>Contato com os Pais</h2>
    <p className="muted">Acompanhe, leia e responda as mensagens enviadas pela comunidade.</p>
    </div>
    <button className="btn" onClick={load}>Atualizar</button>
    </div>
    <div className="choice">
    <button className={"btn " + (status === "open" ? "primary" : "")} onClick={() => setStatus("open")}>Em aberto</button>
    <button className={"btn " + (status === "answered" ? "primary" : "")} onClick={() => setStatus("answered")}>Respondidas</button>
    <button className={"btn " + (status === "archived" ? "primary" : "")} onClick={() => setStatus("archived")}>Arquivadas</button>
    </div>{message && <div className="toast">{message}</div>}{loading ? <div className="card muted">Carregando…</div> : !items.length ? <div className="card empty">Nenhuma mensagem nesta categoria.</div> : items.map((x) => <div className="card" key={x.id}>
    <div className="row between">
    <div>
    <span className="pill">{x.is_anonymous ? "ANÔNIMA" : "IDENTIFICADA"}</span>{!x.is_anonymous && x.sender_name && <span className="muted small" style={{ marginLeft: 8 }}>{x.sender_name}</span>}</div>
    <span className="muted small">{new Date(x.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
    </div>
    <p style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{x.question}</p>
    <div className="muted small">{x.read_at ? "✓ Lida" : "○ Não lida"} · {x.answer ? "✓ Respondida" : "○ Sem resposta"}</div>{!x.read_at && <button className="btn" style={{ marginTop: 10 }} onClick={() => markRead(x.id)}>Marcar como lida</button>}{x.status === "open" && <div style={{ marginTop: 14 }}>
    <Field label="Resposta">
    <textarea className="textarea" rows="4" value={answers[x.id] || ""} onChange={(e) => setAnswers({ ...answers, [x.id]: e.target.value })} placeholder="Escreva a resposta dos Pais da Casa…" />
    </Field>
    <button className="btn primary" onClick={() => answer(x.id)}>Enviar resposta</button>
    </div>}{x.answer && <div className="card" style={{ marginTop: 14, background: "var(--brand-soft)" }}>
    <b>Resposta enviada</b>
    <p style={{ whiteSpace: "pre-wrap" }}>{x.answer}</p>
    </div>}</div>)}</div>;
}

export function Invites() {
  const [items, setItems] = useState([]),
    [role, setRole] = useState("member"),
    [code, setCode] = useState(""),
    [message, setMessage] = useState(""),
    [copied, setCopied] = useState(false);
  const load = async () => {
    const { data } = await supabase.from("invitations").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  };
  useEffect(() => {
    load();
  }, []);
  const appLink = () => window.location.origin + import.meta.env.BASE_URL;
  const invitationText = (code2) => `Olá! 💙 Você foi convidado(a) para fazer parte do Terreiro Pai Benedito do Congo.

Para entrar no aplicativo, acesse:
${appLink()}

Use o código de convite:
${code2}

O código é individual e deve ser utilizado no seu cadastro.`;
  const create = async () => {
    setMessage("");
    setCopied(false);
    const { data, error } = await supabase.rpc("admin_create_invitation", { p_role: role, p_intended_name: null, p_intended_email: null });
    if (error) setMessage(err(error));
    else {
      const newCode = Array.isArray(data) ? data[0]?.code : data?.code;
      setCode(newCode || "");
      load();
    }
  };
  const copy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(invitationText(code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };
  const remove = async (x) => {
    if (x.status !== "active") return;
    if (!confirm("Excluir este convite que ainda não foi utilizado?")) return;
    const { error } = await supabase.rpc("admin_delete_invitation", { p_invitation_id: x.id });
    if (error) setMessage(err(error));
    else {
      setMessage("Convite excluído.");
      load();
    }
  };
  return <div>
    <div className="row between">
    <div>
    <span className="eyebrow">ACESSO À CASA</span>
    <h2>Convites</h2>
    <p className="muted">Crie um convite e envie a mensagem pronta para quem vai entrar no aplicativo.</p>
    </div>
    </div>{message && <div className="toast">{message}</div>}<div className="card">
    <Field label="Perfil">
    <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
    <option value="member">Membro</option>
    <option value="editor">Editor</option>
    <option value="admin">Administrador</option>
    </select>
    </Field>
    <button className="btn primary" onClick={create}>
    <Plus size={14} /> Criar convite</button>
    </div>{code && <div className="card">
    <div className="row between">
    <div>
    <span className="eyebrow">NOVO CONVITE</span>
    <h3>{code}</h3>
    <p className="muted small">Link: {appLink()}</p>
    </div>
    <span className="pill">PRONTO PARA ENVIAR</span>
    </div>
    <div className="card" style={{ marginTop: 12, background: "var(--surface-2)", whiteSpace: "pre-wrap" }}>{invitationText(code)}</div>
    <div className="row" style={{ marginTop: 12 }}>
    <button className="btn primary" onClick={copy}>{copied ? "✓ Mensagem copiada" : "Copiar mensagem"}</button>
    <button className="btn" onClick={() => window.open(appLink(), "_blank")}>Abrir aplicativo</button>
    </div>
    </div>}<div className="section-heading" style={{ marginTop: 20 }}>
    <div>
    <span className="eyebrow">HISTÓRICO</span>
    <h3>Convites criados</h3>
    </div>
    </div>{items.map((x) => <div className={"card invitation-card " + (x.status === "used" ? "invitation-used" : "invitation-active")} key={x.id}>
    <div className="row between">
    <div>
    <b>{x.code}</b>
    <div className="muted small">{x.role} · criado em {new Date(x.created_at).toLocaleDateString("pt-BR")}</div>
    </div>
    <span className="pill">{x.status === "used" ? "UTILIZADO" : "NÃO UTILIZADO"}</span>
    </div>{x.status === "active" ? <div className="row" style={{ marginTop: 12 }}>
    <button className="btn danger" onClick={() => remove(x)}>
    <Trash2 size={14} /> Excluir convite</button>
    </div> : <div className="muted small" style={{ marginTop: 10 }}>Utilizado em {x.used_at ? new Date(x.used_at).toLocaleDateString("pt-BR") : ""}. Convites utilizados permanecem no histórico.</div>}</div>)}</div>;
}
