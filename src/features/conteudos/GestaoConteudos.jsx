// Gestão de conteúdos, avisos e regras; editor de texto; quem leu.
import { useEffect, useRef, useState } from "react";
import { Check, Plus, FileText, Trash2, ArrowLeft, Pencil, Bell } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { err } from "../../lib/helpers.js";
import { Field } from "../../components/ui.jsx";
import { CONTENT_COLORS, CONTENT_EMOJIS, CONTENT_TAGS, contentPlain, coverStyle, sanitizeContentHtml } from "./conteudo.js";
import { ContentArticle } from "./Conteudos.jsx";

export function RichEditor({ editorRef, initialHtml, onChange, placeholder }) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = sanitizeContentHtml(initialHtml || "");
  }, []);
  const cmd = (c, v = null) => {
    editorRef.current?.focus();
    document.execCommand(c, false, v);
    onChange && onChange(editorRef.current.innerHTML);
  };
  const block = (tag) => cmd("formatBlock", "<" + tag + ">");
  const link = () => {
    const url = window.prompt("Endereço do link (começando com https://)");
    if (url && /^https?:\/\//i.test(url.trim())) cmd("createLink", url.trim());
    else if (url) alert("Use um endereço começando com https://");
  };
  const B = ({ title, onClick, children }) => <button type="button" title={title} aria-label={title} onMouseDown={(e) => {
    e.preventDefault();
    onClick();
  }}>{children}</button>;
  return <div className="bl-editor">
  <div className="bl-toolbar" role="toolbar" aria-label="Formatação">
   <B title="Título" onClick={() => block("h2")}>
     <b>T</b>
     </B>
     <B title="Subtítulo" onClick={() => block("h3")}>
     <b style={{ fontSize: ".8em" }}>T</b>
     </B>
     <B title="Texto normal" onClick={() => block("p")}>¶</B>
     <i className="bl-sep" />
   <B title="Negrito" onClick={() => cmd("bold")}>
     <b>B</b>
     </B>
     <B title="Itálico" onClick={() => cmd("italic")}>
     <i>I</i>
     </B>
     <B title="Sublinhado" onClick={() => cmd("underline")}>
     <u>U</u>
     </B>
     <i className="bl-sep" />
   <B title="Lista com marcadores" onClick={() => cmd("insertUnorderedList")}>•</B>
     <B title="Lista numerada" onClick={() => cmd("insertOrderedList")}>1.</B>
     <B title="Citação em destaque" onClick={() => block("blockquote")}>❝</B>
     <B title="Link" onClick={link}>🔗</B>
   <span className="bl-emoji-wrap">
     <B title="Emojis" onClick={() => setEmojiOpen((v) => !v)}>😊</B>{emojiOpen && <span className="bl-emoji-pop">{CONTENT_EMOJIS.map((e) => <button type="button" key={e} onMouseDown={(ev) => {
    ev.preventDefault();
    cmd("insertText", e);
    setEmojiOpen(false);
  }}>{e}</button>)}</span>}</span>
   <B title="Limpar formatação" onClick={() => {
    cmd("removeFormat");
    block("p");
  }}>✕</B>
  </div>
  <div ref={editorRef} className="bl-body bl-editable" contentEditable suppressContentEditableWarning data-placeholder={placeholder} onInput={(e) => onChange && onChange(e.currentTarget.innerHTML)} />
 </div>;
}

export function ContentReaders({ x, onClose }) {
  const [rows, setRows] = useState(null), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.rpc("admin_house_content_readers", { p_content_id: x.id }).then(({ data, error }) => {
      if (error) setMsg(err(error));
      setRows(data || []);
    });
  }, [x.id]);
  const confirmed = (rows || []).filter((r) => r.confirmed_at), opened = (rows || []).filter((r) => !r.confirmed_at && r.first_read_at), missing = (rows || []).filter((r) => !r.confirmed_at && !r.first_read_at);
  const done = x.is_required ? confirmed.length : confirmed.length + opened.length, total = (rows || []).length;
  const remind = async () => {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.rpc("remind_house_content", { p_content_id: x.id });
    setBusy(false);
    setMsg(error ? err(error) : "Lembrete enviado: o conteúdo volta para o topo da tela inicial de quem ainda não " + (x.is_required ? "confirmou" : "leu") + ".");
  };
  const pending = x.is_required ? [...opened, ...missing] : missing;
  return <div className="card bl-readers">
  <div className="row between">
    <div>
    <span className="eyebrow">QUEM JÁ LEU</span>
    <h3>{x.title}</h3>
    </div>
    <button className="btn" onClick={onClose}>Fechar</button>
    </div>
  {rows === null ? <p className="muted">Carregando…</p> : <>
   <div className="bl-progress">
     <b>{done} de {total}</b>
     <span>{x.is_required ? "confirmaram a leitura" : "abriram o conteúdo"}</span>
     </div>
   <div className="bl-bar"><i style={{ width: (total ? Math.round(done / total * 100) : 0) + "%" }} /></div>
   {pending.length > 0 && <>
     <p className="bl-sub">Ainda não {x.is_required ? "confirmaram" : "leram"} · {pending.length}</p>{pending.map((r) => <div className="bl-reader" key={r.profile_id}>
     <span>{r.name}</span>
     <small>{r.first_read_at ? "abriu, não confirmou" : "não abriu"}</small>
     </div>)}
    <button className="btn primary" style={{ marginTop: 12 }} disabled={busy} onClick={remind}>
      <Bell size={15} /> {busy ? "Enviando…" : "Lembrar quem não leu"}</button>
      </>}
   {!pending.length && total > 0 && <p className="bl-confirmed"><Check size={16} /> Todo mundo já leu.</p>}
  </>}
  {msg && <div className="toast">{msg}</div>}
 </div>;
}

export function Content() {
  const [items, setItems] = useState([]),
    [notices, setNotices] = useState([]),
    [stats, setStats] = useState({}),
    [section, setSection] = useState("content"),
    [view, setView] = useState("list"),
    [form, setForm] = useState(null),
    [message, setMessage] = useState(""),
    [saving, setSaving] = useState(false),
    [readersOf, setReadersOf] = useState(null),
    [preview, setPreview] = useState(false);
  const editorRef = useRef(null);
  const labels = { content: "Conteúdo", rule: "Regra da casa", notice: "Aviso da casa" };
  const toInputDate = (s) => s ? new Date(s).toISOString().slice(0, 16) : "";
  const load = async () => {
    const [{ data: hc, error: he }, { data: no, error: ne }, { data: st }] = await Promise.all([supabase.from("house_contents").select("*").order("sort_order").order("created_at", { ascending: false }), supabase.rpc("editor_list_notices"), supabase.rpc("admin_house_content_read_summary")]);
    if (he || ne) setMessage(err(he || ne));
    setItems(hc || []);
    setNotices(no || []);
    setStats(Object.fromEntries((st || []).map((x) => [x.content_id, x])));
  };
  useEffect(() => {
    load();
  }, []);
  const blank = (k) => ({ kind: k, id: null, title: "", summary: "", body: "", tags: [], featured: false, is_required: false, cover_url: "", cover_color: CONTENT_COLORS[0], coverFile: null, starts_at: "", ends_at: "", published: true });
  const startNew = () => {
    setForm(blank(section));
    setPreview(false);
    setMessage("");
    setView("edit");
    window.scrollTo({ top: 0 });
  };
  const startEdit = (x) => {
    setForm({ ...blank(x._kind), ...x, kind: x._kind, tags: Array.isArray(x.tags) ? x.tags : [], cover_url: x.cover_url || "", cover_color: x.cover_color || CONTENT_COLORS[0], starts_at: toInputDate(x.starts_at), ends_at: toInputDate(x.ends_at), published: x.published !== false, coverFile: null });
    setPreview(false);
    setMessage("");
    setView("edit");
    window.scrollTo({ top: 0 });
  };
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const uploadCover = async (file) => {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = "conteudos/" + Date.now() + "." + ext;
    const { error } = await supabase.storage.from("gira-art").upload(path, file, { upsert: true, contentType: file.type || void 0 });
    if (error) throw error;
    return supabase.storage.from("gira-art").getPublicUrl(path).data.publicUrl;
  };
  const save = async () => {
    if (saving) return;
    const html = sanitizeContentHtml(editorRef.current?.innerHTML || form.body);
    if (!form.title.trim() || !contentPlain(html)) {
      setMessage("Preencha o título e o texto.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      if (form.kind === "notice") {
        const args = { p_title: form.title.trim(), p_body: html, p_starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null, p_ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null, p_published: form.published };
        const { error } = await (form.id ? supabase.rpc("editor_update_notice", { p_id: form.id, ...args }) : supabase.rpc("editor_create_notice", args));
        if (error) throw error;
      } else {
        let cover = form.cover_url;
        if (form.coverFile) cover = await uploadCover(form.coverFile);
        const { error } = await supabase.rpc("editor_save_house_content", { p_id: form.id || null, p_data: { title: form.title.trim(), summary: form.summary.trim(), body: html, content_type: form.kind, tags: form.kind === "content" ? form.tags : [], featured: form.kind === "content" && form.featured, is_required: form.is_required, cover_url: form.kind === "content" ? cover || "" : "", cover_color: form.kind === "content" ? form.cover_color : "", sort_order: form.id ? form.sort_order || 0 : items.length } });
        if (error) throw error;
      }
      setSaving(false);
      setView("list");
      setForm(null);
      setMessage(form.id ? "Alterações salvas." : labels[form.kind] + " publicado.");
      load();
    } catch (e) {
      setSaving(false);
      setMessage("Não foi possível salvar: " + err(e));
    }
  };
  const remove = async (x) => {
    if (!confirm('Excluir "' + x.title + '"? Esta ação não pode ser desfeita.')) return;
    const { error } = await (x._kind === "notice" ? supabase.rpc("editor_delete_notice", { p_id: x.id }) : supabase.rpc("editor_delete_house_content", { p_id: x.id }));
    if (error) setMessage(err(error));
    else {
      setMessage("Item excluído.");
      load();
    }
  };
  const all = [...items.filter((x) => x.content_type === "content").map((x) => ({ ...x, _kind: "content" })), ...items.filter((x) => x.content_type === "rule").map((x) => ({ ...x, _kind: "rule" })), ...notices.map((x) => ({ ...x, _kind: "notice" }))];
  const shown = all.filter((x) => x._kind === section);
  if (view === "edit" && form) {
    const isContent = form.kind === "content";
    const previewItem = { ...form, body: editorRef.current?.innerHTML || form.body, cover_url: form.coverFile ? URL.createObjectURL(form.coverFile) : form.cover_url };
    return <div className="bl-admin">
   <button className="btn gira-admin-back" onClick={() => {
      if (confirm("Sair sem salvar?")) {
        setView("list");
        setForm(null);
      }
    }}><ArrowLeft size={14} /> Voltar</button>
   <div className="row between" style={{ margin: "12px 0" }}>
     <div>
     <span className="eyebrow">{form.id ? "EDITAR" : "NOVO"}</span>
     <h2 style={{ margin: 0 }}>{labels[form.kind]}</h2>
     </div>
     <div className="bl-seg bl-seg-sm">
     <button className={!preview ? "is-on" : ""} onClick={() => setPreview(false)}>Escrever</button>
     <button className={preview ? "is-on" : ""} onClick={() => {
      set({ body: editorRef.current?.innerHTML || form.body });
      setPreview(true);
    }}>Pré-visualizar</button></div></div>
   {message && <div className="gw-warning">{message}</div>}
   {preview ? <div className="gw-preview-frame">
     <ContentArticle x={previewItem} preview read={null} />
     </div> : <div className="card gw-panel">
    {isContent && <div className="field">
      <label>Capa</label>
      <div className={"bl-cover-edit" + (form.coverFile || form.cover_url ? " has-image" : "")} style={form.coverFile ? { backgroundImage: 'url("' + URL.createObjectURL(form.coverFile) + '")' } : coverStyle(form)}>
      <label className="btn">
      <input type="file" accept="image/*" hidden onChange={(e) => {
      const f = e.target.files?.[0];
      if (f) set({ coverFile: f });
    }} />Escolher imagem</label>{(form.coverFile || form.cover_url) && <button type="button" className="btn" onClick={() => set({ coverFile: null, cover_url: "" })}>Usar cor</button>}</div>
     {!form.coverFile && !form.cover_url && <div className="gira-color-palette" style={{ marginTop: 8 }}>{CONTENT_COLORS.map((c) => <button type="button" key={c} aria-label={"Cor " + c} className={"gira-color-dot " + (form.cover_color === c ? "selected" : "")} style={{ background: c }} onClick={() => set({ cover_color: c })} />)}</div>}</div>}
    <div className="field">
      <label htmlFor="bl-title">Título</label>
      <input id="bl-title" className="input bl-title-input" value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder={form.kind === "notice" ? "Ex.: Mudança no horário da gira" : "Ex.: Como se preparar para a gira"} />
      </div>
    {isContent && <div className="field">
      <label htmlFor="bl-sum">Resumo <small className="muted">(aparece no cartão; uma frase)</small>
      </label>
      <input id="bl-sum" className="input" maxLength={160} value={form.summary} onChange={(e) => set({ summary: e.target.value })} placeholder="Ex.: O que levar, como chegar e o que observar" />
      </div>}
    <div className="field">
      <label>Texto</label>
      <RichEditor key={form.id || "novo-" + form.kind} editorRef={editorRef} initialHtml={form.body} placeholder="Escreva aqui…" />
      </div>
    {isContent && <div className="field">
      <label>Etiquetas</label>
      <div className="mu-chips" style={{ flexWrap: "wrap" }}>{CONTENT_TAGS.map((t) => <button type="button" key={t} className={"mu-chip" + (form.tags.includes(t) ? " is-on" : "")} onClick={() => set({ tags: form.tags.includes(t) ? form.tags.filter((v) => v !== t) : [...form.tags, t] })}>{t}</button>)}</div>
      </div>}
    {form.kind !== "notice" && <div className="bl-toggles">
     <label className={"bl-toggle" + (form.is_required ? " is-on" : "")}>
       <input type="checkbox" checked={form.is_required} onChange={(e) => set({ is_required: e.target.checked })} />
       <span>
       <b>Leitura obrigatória</b>
       <small>Termina com "Li e entendi" e fica na tela inicial até a pessoa confirmar.</small>
       </span>
       </label>
     {isContent && <label className={"bl-toggle" + (form.featured ? " is-on" : "")}>
       <input type="checkbox" checked={form.featured} onChange={(e) => set({ featured: e.target.checked })} />
       <span>
       <b>Destacar no topo</b>
       <small>Aparece em destaque em Conteúdos.</small>
       </span>
       </label>}
    </div>}
    {form.kind === "notice" && <>
      <div className="grid">
      <Field label="Exibir a partir de">
      <input className="input" type="datetime-local" value={form.starts_at} onChange={(e) => set({ starts_at: e.target.value })} />
      </Field>
      <Field label="Exibir até">
      <input className="input" type="datetime-local" value={form.ends_at} onChange={(e) => set({ ends_at: e.target.value })} />
      </Field>
      </div>
      <label className={"bl-toggle" + (form.published ? " is-on" : "")}>
      <input type="checkbox" checked={form.published} onChange={(e) => set({ published: e.target.checked })} />
      <span>
      <b>Publicado</b>
      <small>Desmarque para deixar o aviso oculto.</small>
      </span>
      </label>
      </>}
   </div>}
   <div className="gw-actions">
     <span />
     <div className="gw-actions-right">
     <button className="btn primary" disabled={saving} onClick={save}>{saving ? "Salvando…" : form.id ? "Salvar alterações" : "Publicar"}</button>
     </div>
     </div>
  </div>;
  }
  return <div className="bl-admin">
  <div className="row between gira-admin-header">
    <div>
    <span className="eyebrow">GESTÃO DA CASA</span>
    <h2>Conteúdos</h2>
    <p className="muted">Publique e acompanhe quem está lendo.</p>
    </div>
    <button className="btn primary" onClick={startNew}>
    <Plus size={14} /> Novo {section === "content" ? "conteúdo" : section === "notice" ? "aviso" : "regra"}</button>
    </div>
  {message && <div className="toast">{message}</div>}
  <div className="bl-seg">{[["content", "Conteúdos"], ["notice", "Avisos"], ["rule", "Regras"]].map(([k, l]) => <button key={k} className={section === k ? "is-on" : ""} onClick={() => {
    setSection(k);
    setReadersOf(null);
  }}>{l}</button>)}</div>
  {readersOf && <ContentReaders x={readersOf} onClose={() => setReadersOf(null)} />}
  <div className="bl-list">{!shown.length ? <div className="mu-empty">Nada publicado aqui ainda.</div> : shown.map((x) => {
    const st = stats[x.id];
    const done = st ? x.is_required ? st.confirmed : st.opened : 0;
    return <div className="bl-admin-item" key={x.id}>
   {x._kind === "content" ? <span className={"bl-thumb" + (x.cover_url ? " has-image" : "")} style={coverStyle(x)} /> : <span className="bl-notice-icon">{x._kind === "notice" ? <Bell size={17} /> : <FileText size={17} />}</span>}
   <div className="bl-admin-text">
     <b>{x.title}</b>
     <span className="bl-admin-pills">{x.is_required && <span className="bl-st is-req">Obrigatória</span>}{x.featured && <span className="bl-st is-new">Destaque</span>}{x._kind === "notice" && <span className="bl-st">{x.published === false ? "Oculto" : "Publicado"}</span>}</span>
    {x._kind !== "notice" && st && <button type="button" className="bl-admin-reads" onClick={() => setReadersOf(x)}>
      <span className="bl-bar bl-bar-sm">
      <i style={{ width: (st.total ? Math.round(done / st.total * 100) : 0) + "%" }} />
      </span>{done}/{st.total} {x.is_required ? "confirmaram" : "leram"} · ver quem</button>}</div>
   <div className="bl-admin-actions">
     <button className="btn" onClick={() => startEdit(x)} aria-label={"Editar " + x.title}>
     <Pencil size={14} />
     </button>
     <button className="btn danger" onClick={() => remove(x)} aria-label={"Excluir " + x.title}>
     <Trash2 size={14} />
     </button>
     </div>
  </div>;
  })}</div>
 </div>;
}
