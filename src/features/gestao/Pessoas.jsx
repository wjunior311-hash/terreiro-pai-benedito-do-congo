// Gestão de pessoas e funções administrativas.
import { useEffect, useState } from "react";
import { Check, X, Plus, ChevronRight, Trash2, ArrowLeft } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { OrixaIcon, ORIXAS } from "../../orixaSymbols.jsx";
import { err, formatPhone, whatsappLink } from "../../lib/helpers.js";
import { PERMISSION_LABELS } from "../acesso.js";

export const NAME_PARTICLES = /* @__PURE__ */ new Set(["da", "das", "de", "do", "dos", "e", "di", "du", "del"]);

export function standardizeName(raw) {
  const clean = String(raw || "").replace(/\s+/g, " ").trim();
  if (!clean) return clean;
  return clean.toLocaleLowerCase("pt-BR").split(" ").map((w, i) => i > 0 && NAME_PARTICLES.has(w) ? w : w.split("-").map((part) => part.split("'").map((x) => x ? x[0].toLocaleUpperCase("pt-BR") + x.slice(1) : x).join("'")).join("-")).join(" ");
}

export function StandardizeNames({ people, onClose }) {
  const changes = people.filter((x) => x.name && standardizeName(x.name) !== x.name && !x.is_master).map((x) => ({ id: x.id, from: x.name, to: standardizeName(x.name) }));
  const [selected, setSelected] = useState(changes.map((c) => c.id)),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(0),
    [msg, setMsg] = useState("");
  const apply = async () => {
    if (busy || !selected.length) return;
    setBusy(true);
    setMsg("");
    let ok = 0;
    for (const c of changes.filter((c2) => selected.includes(c2.id))) {
      const { error } = await supabase.rpc("admin_save_person", { p_profile_id: c.id, p: { name: c.to } });
      if (error) {
        setMsg("Parou em " + c.from + ": " + err(error));
        break;
      }
      ok++;
      setDone(ok);
    }
    setBusy(false);
    if (ok) onClose(ok + " nome(s) padronizado(s).");
  };
  return <div className="modal-back" onClick={() => !busy && onClose("")}>
    <div className="modal fn-pay" role="dialog" aria-modal="true" aria-labelledby="sn-title" onClick={(e) => e.stopPropagation()}>
  <div className="row between">
    <h3 id="sn-title" style={{ margin: 0 }}>Padronizar nomes</h3>
    <button className="btn" disabled={busy} onClick={() => onClose("")} aria-label="Fechar">
    <X size={15} />
    </button>
    </div>
  <p className="muted small">Primeira letra de cada nome em maiúscula, partículas como "da", "de" e "dos" em minúscula e sem espaços sobrando. Desmarque quem não deve mudar.</p>
  {!changes.length ? <div className="hm-clear">
    <Check size={18} />
    <span>Todos os nomes já estão no padrão.</span>
    </div> : <>
   <div className="row between" style={{ margin: "6px 0" }}>
     <small className="muted">{selected.length} de {changes.length} selecionado(s)</small>
     <button type="button" className="gw-link-btn" onClick={() => setSelected(selected.length === changes.length ? [] : changes.map((c) => c.id))}>{selected.length === changes.length ? "Desmarcar todos" : "Marcar todos"}</button>
     </div>
   <div className="fn-list sn-list">{changes.map((c) => <label className="fn-row sn-row" key={c.id}>
     <input type="checkbox" checked={selected.includes(c.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, c.id] : selected.filter((v) => v !== c.id))} />
     <span className="fn-row-main">
     <small className="sn-from">{c.from}</small>
     <b>{c.to}</b>
     </span>
     </label>)}</div>
   {msg && <div className="gw-warning">{msg}</div>}
   <div className="gw-actions">
     <button className="btn" disabled={busy} onClick={() => onClose("")}>Cancelar</button>
     <button className="btn primary" disabled={busy || !selected.length} onClick={apply}>{busy ? "Salvando " + done + "/" + selected.length + "…" : "Padronizar " + selected.length + " nome(s)"}</button>
     </div>
  </>}
 </div></div>;
}

export const FACILITATORS = [["fac_cozinha", "Facilitador cozinha"], ["fac_decoracao", "Facilitador decoração"], ["fac_comunicacao", "Facilitador comunicação"], ["fac_coordenacao", "Facilitador coordenação"], ["fac_manutencao", "Facilitador manutenção"]];

export function People({ me }) {
  const [people, setPeople] = useState([]),
    [groupsData, setGroups] = useState([]),
    [roles, setRoles] = useState([]),
    [message, setMessage] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("active"),
    [roleFilter, setRoleFilter] = useState("all"),
    [open, setOpen] = useState(null),
    [loading, setLoading] = useState(true),
    [standardize, setStandardize] = useState(false);
  const load = async () => {
    const [{ data: p }, { data: g }, { data: r }] = await Promise.all([supabase.from("profiles").select("*,groups(name)").order("name"), supabase.from("groups").select("*").order("name"), supabase.rpc("admin_list_admin_roles")]);
    setPeople(p || []);
    setGroups(g || []);
    setRoles(r || []);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);
  const roleName = (x) => x.is_master ? "Administrador master" : x.role === "admin" ? "Administrador" : roles.find((r) => r.id === x.admin_role_id)?.name || "";
  const q = search.trim().toLocaleLowerCase("pt-BR");
  const shown = people.filter((x) => (filter === "all" || (filter === "active" ? x.is_active !== false : x.is_active === false)) && (!q || String(x.name || "").toLocaleLowerCase("pt-BR").includes(q) || String(x.email || "").toLocaleLowerCase("pt-BR").includes(q)) && (roleFilter === "all" || (roleFilter === "none" ? !roleName(x) : roleFilter === "master" ? x.is_master || x.role === "admin" : x.admin_role_id === roleFilter)));
  if (open) {
    const x = people.find((v) => v.id === open);
    return x ? <PersonEditor x={x} me={me} roles={roles} groupsData={groupsData} onClose={(msg) => {
      setOpen(null);
      if (msg) setMessage(msg);
      load();
    }} /> : null;
  }
  return <div className="pp">
  <div className="row between gira-admin-header">
    <div>
    <span className="eyebrow">GESTÃO DA CASA</span>
    <h2>Pessoas</h2>
    <p className="muted">{people.filter((x) => x.is_active !== false).length} pessoas ativas</p>
    </div>
    <button className="btn" onClick={() => setStandardize(true)}>Padronizar nomes</button>
    </div>
  {standardize && <StandardizeNames people={people} onClose={(msg) => {
    setStandardize(false);
    if (msg) {
      setMessage(msg);
      load();
    }
  }} />}
  {message && <div className="toast">{message}</div>}
  <input className="input" placeholder="Buscar por nome ou e-mail…" value={search} onChange={(e) => setSearch(e.target.value)} />
  <div className="mu-chips" style={{ marginTop: 10 }}>{[["active", "Ativas"], ["inactive", "Inativas"], ["all", "Todas"]].map(([k, l]) => <button type="button" key={k} className={"mu-chip" + (filter === k ? " is-on" : "")} onClick={() => setFilter(k)}>{l}</button>)}
   <select className="mu-chip mu-gira-select" aria-label="Filtrar por função" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
     <option value="all">Todas as funções</option>
     <option value="master">Administração</option>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}<option value="none">Sem função</option>
     </select>
     </div>
  {loading ? <div className="hm-skeleton" /> : <div className="fn-list">{shown.map((x) => <button type="button" className="fn-row fn-row-btn pp-row" key={x.id} onClick={() => setOpen(x.id)}>
    <OrixaIcon name={x.orixa_symbol} size={34} />
    <span className="fn-row-main">
    <b>{x.name || "Sem nome"}{x.is_active === false && <small className="pp-inactive"> · inativa</small>}</b>
    <small>{[x.groups?.name, x.is_iniciado ? "Iniciado(a)" : "", x.is_pai_de_santo ? "Pai/Mãe de Santo" : ""].filter(Boolean).join(" · ") || x.email}</small>
    </span>{roleName(x) && <span className={"fn-chip " + (x.is_master || x.role === "admin" ? "is-bad" : "is-ok")}>{roleName(x)}</span>}<ChevronRight size={16} />
    </button>)}{!shown.length && <p className="muted">Ninguém encontrado.</p>}</div>}
 </div>;
}

export function PersonEditor({ x, me, roles, groupsData, onClose }) {
  const isMaster = !!me?.is_master;
  const [f, setF] = useState({ name: x.name || "", date_of_birth: x.date_of_birth || "", orixa_symbol: x.orixa_symbol || "", group_id: x.group_id || "", leadership_seal: x.leadership_seal || "", is_iniciado: !!x.is_iniciado, is_active: x.is_active !== false, is_pai_de_santo: !!x.is_pai_de_santo, phone: x.phone ? formatPhone(x.phone) : "" }),
    [roleId, setRoleId] = useState(x.admin_role_id || ""),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState("");
  const set = (patch) => setF((v) => ({ ...v, ...patch }));
  const locked = x.is_master && !isMaster;
  const save = async () => {
    if (busy) return;
    if (!f.name.trim()) {
      setMsg("O nome não pode ficar vazio.");
      return;
    }
    setBusy(true);
    setMsg("");
    const { error } = await supabase.rpc("admin_save_person", { p_profile_id: x.id, p: { ...f, name: f.name.trim() } });
    if (error) {
      setBusy(false);
      setMsg("Não foi possível salvar: " + err(error));
      return;
    }
    if (isMaster && !x.is_master && (roleId || "") !== (x.admin_role_id || "")) {
      const { error: re } = await supabase.rpc("admin_set_profile_admin_role", { p_profile_id: x.id, p_admin_role_id: roleId || null });
      if (re) {
        setBusy(false);
        setMsg("Cadastro salvo, mas a função não mudou: " + err(re));
        return;
      }
    }
    setBusy(false);
    onClose("Cadastro de " + f.name.trim() + " salvo.");
  };
  const role = roles.find((r) => r.id === roleId);
  return <div className="pp">
  <button className="btn gira-admin-back" onClick={() => onClose("")}><ArrowLeft size={14} /> Pessoas</button>
  <div className="pp-head">
    <OrixaIcon name={f.orixa_symbol} size={52} />
    <div>
    <h2>{x.name || "Sem nome"}</h2>
    <p className="muted">{x.email}</p>
    </div>
    </div>
  {locked && <div className="gw-warning">Este é o cadastro do administrador master. Somente o próprio master pode alterá-lo.</div>}
  <fieldset className="card gw-panel pp-fields" disabled={locked}>
   <h3>Dados pessoais</h3>
   <div className="field">
     <label htmlFor="pp-n">Nome</label>
     <div className="pp-name-row">
     <input id="pp-n" className="input" value={f.name} onChange={(e) => set({ name: e.target.value })} />{standardizeName(f.name) !== f.name && <button type="button" className="btn" onClick={() => set({ name: standardizeName(f.name) })}>Padronizar</button>}</div>
     </div>
   <div className="field">
     <label htmlFor="pp-tel">WhatsApp</label>
     <div className="pp-name-row">
     <input id="pp-tel" className="input" type="tel" inputMode="tel" placeholder="(11) 98765-4321" value={f.phone} onChange={(e) => set({ phone: e.target.value })} />{whatsappLink(f.phone) && <a className="btn wa-btn" href={whatsappLink(f.phone, "Axé, " + (f.name || "").trim().split(" ")[0] + "! ")} target="_blank" rel="noopener">WhatsApp</a>}</div>
     </div>
   <div className="grid">
     <div className="field">
     <label htmlFor="pp-b">Data de nascimento</label>
     <input id="pp-b" className="input" type="date" value={f.date_of_birth} onChange={(e) => set({ date_of_birth: e.target.value })} />
     </div>
    <div className="field">
      <label htmlFor="pp-o">Orixá</label>
      <select id="pp-o" className="select" value={f.orixa_symbol} onChange={(e) => set({ orixa_symbol: e.target.value })}>
      <option value="">Não informado</option>{ORIXAS.map(([v, l]) => <option value={v} key={v}>{l}</option>)}</select>
      </div>
      </div>
   <div className="field">
     <label>E-mail de acesso</label>
     <input className="input" value={x.email || ""} disabled />
     <small className="muted">O e-mail de login só pode ser trocado pela própria pessoa, na tela de acesso.</small>
     </div>
   <h3>Na casa</h3>
   <div className="grid">
     <div className="field">
     <label htmlFor="pp-g">Grupo</label>
     <select id="pp-g" className="select" value={f.group_id} onChange={(e) => set({ group_id: e.target.value })}>
     <option value="">Organização</option>{groupsData.map((g) => <option value={g.id} key={g.id}>{g.name}</option>)}</select>
     </div>
    <div className="field">
      <label htmlFor="pp-f">Facilitador</label>
      <select id="pp-f" className="select" value={f.leadership_seal} onChange={(e) => set({ leadership_seal: e.target.value })}>
      <option value="">Sem função de facilitador</option>{FACILITATORS.map(([v, l]) => <option value={v} key={v}>{l}</option>)}</select>
      </div>
      </div>
   <div className="bl-toggles">
    <label className={"bl-toggle" + (f.is_iniciado ? " is-on" : "")}>
      <input type="checkbox" checked={f.is_iniciado} onChange={(e) => set({ is_iniciado: e.target.checked })} />
      <span>
      <b>Iniciado(a)</b>
      </span>
      </label>
    <label className={"bl-toggle" + (f.is_pai_de_santo ? " is-on" : "")}>
      <input type="checkbox" checked={f.is_pai_de_santo} onChange={(e) => set({ is_pai_de_santo: e.target.checked })} />
      <span>
      <b>Pai / Mãe de Santo</b>
      <small>Não paga mensalidade.</small>
      </span>
      </label>
    <label className={"bl-toggle" + (f.is_active ? " is-on" : "")}>
      <input type="checkbox" checked={f.is_active} onChange={(e) => set({ is_active: e.target.checked })} />
      <span>
      <b>Cadastro ativo</b>
      <small>Desmarque quando a pessoa deixar a casa.</small>
      </span>
      </label>
   </div>
  </fieldset>
  <div className="card gw-panel">
   <h3>Função administrativa</h3>
   {x.is_master ? <p className="muted">Administrador master: acesso total. Esta função não pode ser trocada pelo app.</p> : x.role === "admin" ? <p className="muted">Administrador (perfil antigo): acesso total.</p> : isMaster ? <>
     <select className="select" value={roleId} onChange={(e) => setRoleId(e.target.value)} aria-label="Função administrativa">
     <option value="">Nenhuma (membro)</option>{roles.filter((r) => r.is_active !== false || r.id === roleId).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
     <p className="muted small" style={{ marginTop: 8 }}>{role ? "Pode acessar: " + (role.permissions || []).map((k) => PERMISSION_LABELS.find((l) => l[0] === k)?.[1]).filter(Boolean).join(", ") : "Sem acesso à Gestão da Casa."}</p>
       </> : <p className="muted">{role ? role.name : "Nenhuma"} · somente o administrador master pode mudar funções.</p>}
  </div>
  {msg && <div className="gw-warning">{msg}</div>}
  <div className="gw-actions">
    <button className="btn" onClick={() => onClose("")}>Cancelar</button>
    <button className="btn primary" disabled={busy || locked} onClick={save}>{busy ? "Salvando…" : "Salvar"}</button>
    </div>
 </div>;
}

export function AdminRoles() {
  const [roles, setRoles] = useState(null),
    [edit, setEdit] = useState(null),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState(false);
  const load = async () => {
    const { data, error } = await supabase.rpc("admin_list_admin_roles");
    if (error) setMsg(err(error));
    setRoles(data || []);
  };
  useEffect(() => {
    load();
  }, []);
  const save = async () => {
    if (busy) return;
    if (!edit.name.trim()) {
      setMsg("Dê um nome para a função.");
      return;
    }
    if (!edit.permissions.length && !confirm("Esta função não dá acesso a nenhuma área. Salvar mesmo assim?")) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_save_admin_role", { p_id: edit.id || null, p_name: edit.name.trim(), p_description: edit.description || "", p_permissions: edit.permissions });
    setBusy(false);
    if (error) {
      setMsg(err(error));
      return;
    }
    setMsg(edit.id ? "Função atualizada." : "Função criada.");
    setEdit(null);
    load();
  };
  const remove = async (r) => {
    if (!confirm('Excluir a função "' + r.name + '"?' + (r.people_count ? " " + r.people_count + " pessoa(s) ficarão sem função." : ""))) return;
    const { error } = await supabase.rpc("admin_delete_admin_role", { p_id: r.id });
    if (error) setMsg(err(error));
    else {
      setMsg("Função excluída.");
      setEdit(null);
      load();
    }
  };
  if (edit) return <div className="pp">
  <button className="btn gira-admin-back" onClick={() => setEdit(null)}><ArrowLeft size={14} /> Funções</button>
  <div className="card gw-panel" style={{ marginTop: 12 }}>
   <h3 style={{ marginTop: 0 }}>{edit.id ? "Editar função" : "Nova função"}</h3>
   <div className="field">
     <label htmlFor="rl-n">Nome</label>
     <input id="rl-n" className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Ex.: Coordenação de giras" />
     </div>
   <div className="field">
     <label htmlFor="rl-d">Descrição (opcional)</label>
     <input id="rl-d" className="input" value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
     </div>
   <div className="field">
     <label>O que esta função pode acessar</label>
     <div className="bl-toggles">{PERMISSION_LABELS.map(([k, l, d]) => <label key={k} className={"bl-toggle" + (edit.permissions.includes(k) ? " is-on" : "")}>
     <input type="checkbox" checked={edit.permissions.includes(k)} onChange={(e) => setEdit({ ...edit, permissions: e.target.checked ? [...edit.permissions, k] : edit.permissions.filter((v) => v !== k) })} />
     <span>
     <b>{l}</b>
     <small>{d}</small>
     </span>
     </label>)}</div>
     </div>
   <p className="muted small">Visão geral, Convites, Dúvidas e Funções continuam exclusivos da administração.</p>
  </div>
  {msg && <div className="gw-warning">{msg}</div>}
  <div className="gw-actions">{edit.id ? <button className="btn danger" onClick={() => remove(edit)}>
    <Trash2 size={14} /> Excluir</button> : <span />}<button className="btn primary" disabled={busy} onClick={save}>{busy ? "Salvando…" : "Salvar função"}</button>
    </div>
 </div>;
  return <div className="pp">
  <div className="row between gira-admin-header">
    <div>
    <span className="eyebrow">GESTÃO DA CASA</span>
    <h2>Funções administrativas</h2>
    <p className="muted">Crie funções e escolha o que cada uma pode acessar. Depois, atribua em Pessoas.</p>
    </div>
    <button className="btn primary" onClick={() => {
    setMsg("");
    setEdit({ id: null, name: "", description: "", permissions: [] });
  }}><Plus size={14} /> Nova função</button></div>
  {msg && <div className="toast">{msg}</div>}
  <div className="fn-list">
    <div className="fn-row">
    <span className="fn-row-main">
    <b>Administrador master</b>
    <small>Acesso total · fixa</small>
    </span>
    <span className="fn-chip is-bad">Tudo</span>
    </div>
   {roles === null ? <div className="hm-skeleton" style={{ margin: "10px 0" }} /> : roles.map((r) => <button type="button" key={r.id} className="fn-row fn-row-btn" onClick={() => {
    setMsg("");
    setEdit({ ...r, permissions: r.permissions || [] });
  }}>
    <span className="fn-row-main">
    <b>{r.name}</b>
    <small>{(r.permissions || []).map((k) => PERMISSION_LABELS.find((l) => l[0] === k)?.[1]).filter(Boolean).join(" · ") || "Sem acessos"}</small>
    </span>
    <span className="fn-chip">{r.people_count} pessoa(s)</span>
    <ChevronRight size={16} />
    </button>)}</div>
 </div>;
}

export function FacilitatorBadge({ seal }) {
  const labels = { fac_cozinha: "Facilitador cozinha", fac_decoracao: "Facilitador decoração", fac_comunicacao: "Facilitador comunicação", fac_coordenacao: "Facilitador coordenação", fac_manutencao: "Facilitador manutenção" };
  return seal ? <span className="facilitator-badge" title={labels[seal] || "Facilitador"} aria-label={labels[seal] || "Facilitador"}>✦</span> : null;
}
