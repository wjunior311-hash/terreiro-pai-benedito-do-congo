// Mural da comunidade.
import { useEffect, useState } from "react";
import { Trash2, Pencil, MessageCircle, Send } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { OrixaIcon } from "../../orixaSymbols.jsx";
import { err, kinds } from "../../lib/helpers.js";
import { can } from "../acesso.js";
import { Giras } from "../agenda/Agenda.jsx";

export function Community({ p, draft = null }) {
  const [posts, setPosts] = useState([]),
    [giras, setGiras] = useState([]),
    [feed, setFeed] = useState("ensinamento"),
    [body, setBody] = useState(""),
    [editing, setEditing] = useState(null),
    [msg, setMsg] = useState(""),
    [composing, setComposing] = useState(false),
    [saving, setSaving] = useState(false),
    [social, setSocial] = useState(null);
  const load = async () => {
    const { data } = await supabase.from("community_posts").select("*").order("created_at", { ascending: false });
    if (!data) {
      setPosts([]);
      return;
    }
    const ids = [...new Set(data.map((x) => x.author_id))], gs = [...new Set(data.map((x) => x.gira_id).filter(Boolean))];
    const [{ data: pr }, { data: gr }] = await Promise.all([ids.length ? supabase.from("profiles").select("id,name,orixa_symbol").in("id", ids) : { data: [] }, gs.length ? supabase.from("giras").select("id,name,starts_at").in("id", gs) : { data: [] }]);
    const pm = Object.fromEntries((pr || []).map((x) => [x.id, x])), gm = Object.fromEntries((gr || []).map((x) => [x.id, x]));
    setPosts(data.map((x) => ({ ...x, author: pm[x.author_id], gira: gm[x.gira_id] })));
    loadSocial(data.map((x) => x.id));
  };
  // reações e comentários (se o banco ainda não tiver a função, o mural funciona sem eles)
  const loadSocial = async (ids) => {
    if (!ids.length) return setSocial({});
    const { data, error } = await supabase.rpc("community_post_social", { p_post_ids: ids });
    if (error) return setSocial(null);
    setSocial(Object.fromEntries((data || []).map((r) => [r.post_id, r])));
  };
  const toggleAxe = async (post) => {
    const cur = social?.[post.id] || { axe_count: 0, i_reacted: false, comment_count: 0 };
    const next = { ...cur, i_reacted: !cur.i_reacted, axe_count: cur.axe_count + (cur.i_reacted ? -1 : 1) };
    setSocial((v) => ({ ...v, [post.id]: next }));
    const { error } = cur.i_reacted ? await supabase.from("community_post_reactions").delete().eq("post_id", post.id).eq("profile_id", p.id).eq("kind", "axe") : await supabase.from("community_post_reactions").insert({ post_id: post.id, profile_id: p.id, kind: "axe" });
    if (error) {
      setSocial((v) => ({ ...v, [post.id]: cur }));
      setMsg(err(error));
    }
  };
  const setCommentCount = (id, n) => setSocial((v) => ({ ...v, [id]: { ...(v?.[id] || { axe_count: 0, i_reacted: false }), comment_count: n } }));
  useEffect(() => {
    if (!draft) return;
    setFeed("reflexao");
    setBody(draft);
    setComposing(true);
  }, [draft]);
  useEffect(() => {
    load();
    supabase.from("giras").select("id,name,starts_at").eq("status", "published").order("starts_at", { ascending: false }).then(({ data }) => setGiras(data || []));
  }, []);
  const isGira = feed.startsWith("gira:"), activeGira = isGira ? feed.slice(5) : null;
  const save = async (e) => {
    e.preventDefault();
    if (!body.trim() || !feed) {
      setMsg("Escolha um feed e escreva sua publicação.");
      return;
    }
    const giraId = isGira ? activeGira : null;
    const postKind = isGira ? editing ? posts.find((x) => x.id === editing)?.kind || "reflexao" : "reflexao" : feed;
    const payload = { kind: postKind, body: body.trim(), gira_id: giraId };
    const q = editing && can(p, "content.manage") ? supabase.rpc("editor_update_community_post", { p_id: editing, p_kind: postKind, p_body: body.trim(), p_gira_id: giraId }) : editing ? supabase.from("community_posts").update(payload).eq("id", editing).eq("author_id", p.id) : supabase.from("community_posts").insert({ ...payload, author_id: p.id });
    setSaving(true);
    const { error } = await q;
    setSaving(false);
    if (error) setMsg(err(error));
    else {
      setBody("");
      setEditing(null);
      setMsg("");
      setComposing(false);
      load();
    }
  };
  const remove = async (id) => {
    if (!confirm("Excluir esta publicação?")) return;
    const { error } = await (can(p, "content.manage") ? supabase.rpc("editor_delete_community_post", { p_id: id }) : supabase.from("community_posts").delete().eq("id", id));
    if (error) setMsg(err(error));
    else load();
  };
  const shown = posts.filter((x) => isGira ? x.gira_id === activeGira : x.kind === feed);
  const feedLabel = isGira ? giras.find((g) => g.id === activeGira)?.name || "Gira" : kinds.find((k) => k[0] === feed)?.[1] || feed;
  const ago = (d) => {
    if (!d) return "agora";
    const m = Math.floor((Date.now() - new Date(d)) / 6e4);
    if (m < 1) return "agora";
    if (m < 60) return "há " + m + " min";
    const h = Math.floor(m / 60);
    if (h < 24) return "há " + h + " h";
    const dd = Math.floor(h / 24);
    return dd === 1 ? "ontem" : dd < 7 ? "há " + dd + " dias" : new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };
  const cancel = () => {
    setEditing(null);
    setBody("");
    setMsg("");
    setComposing(false);
  };
  return <div className="mu">
  <div className="mu-head">
    <span className="eyebrow">NOSSA COMUNIDADE</span>
    <h1>Mural</h1>
    <p className="muted">O que a comunidade está compartilhando</p>
    </div>
  <div className="mu-chips" role="tablist" aria-label="Espaços do mural">{kinds.map(([v, l]) => <button type="button" role="tab" aria-selected={feed === v} className={"mu-chip" + (feed === v ? " is-on" : "")} key={v} onClick={() => {
    setFeed(v);
    cancel();
  }}>{l}</button>)}
   {giras.length > 0 && <select className={"mu-chip mu-gira-select" + (isGira ? " is-on" : "")} aria-label="Mural de uma gira" value={isGira ? feed : ""} onChange={(e) => {
    if (e.target.value) {
      setFeed(e.target.value);
      cancel();
    }
  }}>
    <option value="">🌿 Giras…</option>{giras.map((g) => <option value={"gira:" + g.id} key={g.id}>{g.name} · {new Date(g.starts_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</option>)}</select>}
  </div>
  {!composing && !editing ? <button type="button" className="mu-compose-closed" onClick={() => setComposing(true)}>
    <Pencil size={16} />
    <span>Escreva em <b>{feedLabel}</b>…</span>
    </button> : <form className="mu-compose" onSubmit={save}>
    <label className="sr-only" htmlFor="mu-text">Texto</label>
    <textarea id="mu-text" autoFocus className="textarea" rows="4" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva para a comunidade…" />
    <div className="mu-compose-foot">
    <small className="muted">{editing ? "Editando publicação" : "Publicando em " + feedLabel + " · com seu nome e Orixá"}</small>
    <div className="row">
    <button type="button" className="btn" onClick={cancel}>Cancelar</button>
    <button className="btn primary" disabled={saving || !body.trim()}>{saving ? "Enviando…" : editing ? "Salvar" : "Publicar"}</button>
    </div>
    </div>{msg && <div className="toast">{msg}</div>}</form>}
  <div className="mu-feed">{shown.map((post) => <Post key={post.id} post={post} p={p} ago={ago} social={social ? social[post.id] || { axe_count: 0, i_reacted: false, comment_count: 0 } : null} onAxe={() => toggleAxe(post)} onCommentCount={(n) => setCommentCount(post.id, n)} edit={() => {
    setEditing(post.id);
    setComposing(true);
    setFeed(post.gira_id ? "gira:" + post.gira_id : post.kind);
    setBody(post.body);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }} remove={() => remove(post.id)} />)}{!shown.length && <div className="mu-empty">Ninguém escreveu aqui ainda. Que tal ser a primeira pessoa?</div>}</div>
 </div>;
}

export function Post({ post, p, edit, remove, ago, social = null, onAxe, onCommentCount }) {
  const canEdit = post.author_id === p.id, canManage = can(p, "content.manage"), canDelete = canEdit || canManage;
  const [open, setOpen] = useState(false), [comments, setComments] = useState(null), [text, setText] = useState(""), [sending, setSending] = useState(false), [reactors, setReactors] = useState(null), [cmsg, setCmsg] = useState("");
  const loadComments = async () => {
    const { data, error } = await supabase.rpc("community_post_comments_list", { p_post_id: post.id });
    if (error) return setCmsg(err(error));
    setComments(data || []);
    onCommentCount?.((data || []).length);
  };
  const toggleComments = () => {
    if (!open && comments === null) loadComments();
    setOpen(!open);
  };
  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setCmsg("");
    const { error } = await supabase.from("community_post_comments").insert({ post_id: post.id, author_id: p.id, body: text.trim() });
    setSending(false);
    if (error) return setCmsg(err(error));
    setText("");
    loadComments();
  };
  const removeComment = async (c) => {
    if (!confirm("Apagar este comentário?")) return;
    const { error } = await supabase.from("community_post_comments").delete().eq("id", c.id);
    if (error) return setCmsg(err(error));
    loadComments();
  };
  const showReactors = async () => {
    const { data } = await supabase.rpc("community_post_reactors", { p_post_id: post.id });
    setReactors(data || []);
  };
  const first = (n) => String(n || "Membro").trim().split(/\s+/)[0];
  return <article className="mu-post">
    <header className="mu-post-head">
    <OrixaIcon name={post.author?.orixa_symbol} size={34} />
    <div className="mu-post-who">
    <b>{post.author?.name || "Membro"}</b>
    <small>{ago ? ago(post.created_at) : ""}{!post.gira && kinds.find((k) => k[0] === post.kind) ? " · " + kinds.find((k) => k[0] === post.kind)[1] : ""}{post.gira ? " · 🌿 " + post.gira.name : ""}</small>
    </div>
    </header>
    <p className="mu-post-body">{post.body}</p>
    {social && <div className="mu-social">
      <button type="button" className={"mu-axe" + (social.i_reacted ? " is-on" : "")} aria-pressed={social.i_reacted} onClick={onAxe}><span className="mu-axe-emoji" aria-hidden="true">🙏</span> Axé</button>
      {social.axe_count > 0 && <button type="button" className="mu-social-count" onClick={showReactors}>{social.axe_count} {social.axe_count === 1 ? "axé" : "axés"}</button>}
      <button type="button" className={"mu-cm-btn" + (open ? " is-on" : "")} aria-expanded={open} onClick={toggleComments}><MessageCircle size={16} /> {social.comment_count > 0 ? social.comment_count + (social.comment_count === 1 ? " comentário" : " comentários") : "Comentar"}</button>
    </div>}
    {(canEdit || canDelete) && <div className="mu-post-actions">{(canEdit || canManage) && <button type="button" onClick={edit}>
    <Pencil size={13} /> Editar</button>}{canDelete && <button type="button" className="is-danger" onClick={remove}>
    <Trash2 size={13} /> Excluir</button>}</div>}
    {open && <div className="mu-comments">
      {comments === null ? <span className="skeleton skeleton-line" style={{ width: "60%" }} /> : comments.map((c) => <div className="mu-cm" key={c.id}>
        <OrixaIcon name={c.orixa_symbol} size={26} />
        <div className="mu-cm-bubble">
          <b>{c.name || "Membro"}</b> <small>{ago ? ago(c.created_at) : ""}</small>
          <p>{c.body}</p>
        </div>
        {(c.author_id === p.id || canManage) && <button type="button" className="mu-cm-del" aria-label="Apagar comentário" onClick={() => removeComment(c)}><Trash2 size={14} /></button>}
      </div>)}
      <form className="mu-cm-form" onSubmit={send}>
        <label className="sr-only" htmlFor={"cm-" + post.id}>Comentário</label>
        <input id={"cm-" + post.id} className="input" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Responder a " + first(post.author?.name) + "…"} />
        <button className="btn primary" aria-label="Enviar comentário" disabled={sending || !text.trim()}><Send size={16} /></button>
      </form>
      {cmsg && <div className="toast">{cmsg}</div>}
    </div>}
    {reactors && <div className="modal-back" onClick={() => setReactors(null)}>
      <div className="modal mu-reactors" onClick={(e) => e.stopPropagation()}>
        <div className="row between"><h3 style={{ margin: 0 }}>🙏 Mandaram axé</h3><button className="btn" onClick={() => setReactors(null)}>Fechar</button></div>
        <div className="mu-reactor-list">{reactors.map((r) => <div className="mu-reactor" key={r.profile_id}><OrixaIcon name={r.orixa_symbol} size={28} /><span>{r.name}{r.profile_id === p.id ? " (você)" : ""}</span></div>)}</div>
      </div>
    </div>}
    </article>;
}
