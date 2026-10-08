// Gestão da revista Ẹ̀mí Ìlú: prévia, publicar e quem leu.
import { useEffect, useState } from "react";
import { Eye, Send, EyeOff, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { OrixaIcon } from "../../orixaSymbols.jsx";
import { err, whatsappLink } from "../../lib/helpers.js";
import { EDICOES, Revista } from "./Revista.jsx";

export function GestaoRevista({ p }) {
  const [rows, setRows] = useState(null), [msg, setMsg] = useState(""), [preview, setPreview] = useState(null), [readers, setReaders] = useState(null), [busy, setBusy] = useState("");
  const load = async () => {
    const { data, error } = await supabase.from("newsletter_editions").select("*").order("slug", { ascending: false });
    if (error) {
      setMsg(/relation|schema cache|does not exist/i.test(error.message || "") ? "A revista precisa da atualização do banco (arquivo 20261008h). Rode o SQL no Supabase e recarregue." : err(error));
      return setRows([]);
    }
    setRows(data || []);
  };
  useEffect(() => {
    load();
  }, []);
  const publish = async (ed, on) => {
    if (on && !confirm("Publicar " + ed.titulo + "? Todo mundo recebe o aviso no celular.")) return;
    setBusy(ed.slug);
    const { error } = await supabase.rpc("admin_save_newsletter", { p_slug: ed.slug, p_title: ed.titulo, p_articles: ed.materias.length, p_publish: on });
    setBusy("");
    setMsg(error ? err(error) : on ? "Edição publicada. O aviso já foi para o celular de todo mundo." : "Edição voltou para rascunho.");
    load();
  };
  if (preview) return <div>
    <div className="toast">Prévia: sua leitura não conta no "quem leu".</div>
    <Revista p={p} slug={preview} preview back={() => setPreview(null)} />
  </div>;
  if (readers) return <QuemLeu slug={readers} back={() => setReaders(null)} />;
  return <div className="rv-admin">
    <div className="gira-admin-header">
      <span className="eyebrow">GESTÃO DA CASA</span>
      <h2>Revista Ẹ̀mí Ìlú</h2>
      <p className="muted">Veja a prévia, publique a edição do mês e acompanhe quem já leu.</p>
    </div>
    {msg && <div className="toast">{msg}</div>}
    {rows === null ? <span className="skeleton skeleton-card" /> : EDICOES.map((ed) => {
      const r = rows.find((x) => x.slug === ed.slug), pub = r?.status === "published";
      return <div className="card rv-admin-ed" key={ed.slug}>
        <div className="rv-admin-cover" style={{ backgroundImage: `url("${ed.capa.img}")` }}><span>Ẹ̀mí Ìlú</span></div>
        <div className="rv-admin-info">
          <b>{ed.mes}</b>
          <span className={"rv-tag" + (pub ? " on" : "")}>{pub ? "Publicada em " + new Date(r.published_at).toLocaleDateString("pt-BR") : "Rascunho · só a gestão vê"}</span>
          <div className="rv-admin-actions">
            <button className="btn" onClick={() => setPreview(ed.slug)}><Eye size={15} /> Prévia</button>
            {pub ? <button className="btn primary" onClick={() => setReaders(ed.slug)}>Quem leu</button> : <button className="btn primary" disabled={busy === ed.slug} onClick={() => publish(ed, true)}><Send size={15} /> Publicar</button>}
            {pub && <button className="btn" disabled={busy === ed.slug} onClick={() => publish(ed, false)}><EyeOff size={15} /> Despublicar</button>}
          </div>
        </div>
      </div>;
    })}
  </div>;
}

function QuemLeu({ slug, back }) {
  const ed = EDICOES.find((e) => e.slug === slug);
  const [rows, setRows] = useState(null), [tab, setTab] = useState("nao"), [msg, setMsg] = useState("");
  const load = async () => {
    setRows(null);
    const { data, error } = await supabase.rpc("admin_newsletter_readers", { p_slug: slug });
    if (error) setMsg(err(error));
    setRows(data || []);
  };
  useEffect(() => {
    load();
  }, []);
  const list = rows || [];
  const g = {
    leu: list.filter((x) => x.finished_at),
    meio: list.filter((x) => x.opened_at && !x.finished_at),
    nao: list.filter((x) => !x.opened_at)
  };
  const pct = list.length ? Math.round(g.leu.length / list.length * 100) : 0;
  const tabs = [["nao", "Não abriu", g.nao.length], ["meio", "Começou", g.meio.length], ["leu", "Leu tudo", g.leu.length]];
  const fmt = (d) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const lembrete = (x) => whatsappLink(x.phone, "Axé, " + String(x.name || "").split(" ")[0] + "! Saiu a " + ed.titulo + " no app do terreiro. Quando puder, dá uma lida: tem matéria sobre " + ed.capa.chamadas.map((c) => c.titulo.toLowerCase()).slice(0, 2).join(" e ") + ". 🙏");
  return <div className="rv-admin">
    <button className="btn" onClick={back}>← Revista</button>
    <div className="gira-admin-header" style={{ marginTop: 12 }}>
      <span className="eyebrow">QUEM LEU</span>
      <h2>{ed.titulo}</h2>
    </div>
    {msg && <div className="toast">{msg}</div>}
    {rows === null ? <span className="skeleton skeleton-card" /> : <>
      <div className="rv-admin-meter"><div><b>{pct}%</b><span>leram a edição inteira</span></div><button className="btn" aria-label="Atualizar" onClick={load}><RefreshCw size={15} /></button></div>
      <div className="rv-admin-bar"><i className="leu" style={{ width: (g.leu.length / (list.length || 1) * 100) + "%" }} /><i className="meio" style={{ width: (g.meio.length / (list.length || 1) * 100) + "%" }} /></div>
      <div className="fq-stats">{tabs.map(([k, l, n]) => <button key={k} className={"fq-stat" + (tab === k ? " is-on" : "")} onClick={() => setTab(k)}><b>{n}</b><span>{l}</span></button>)}</div>
      <div className="fq-list">{g[tab].map((x) => <div className="fq-row" key={x.profile_id}>
        <OrixaIcon name={x.orixa_symbol} size={32} />
        <div className="fq-main">
          <b>{x.name}</b>
          <small>{x.finished_at ? "Terminou em " + fmt(x.finished_at) : x.opened_at ? x.articles_read + " de " + x.articles_total + " matérias · abriu em " + fmt(x.opened_at) : "Ainda não abriu"}</small>
          {tab === "meio" && <div className="fq-bar"><i style={{ width: Math.round(x.articles_read / (x.articles_total || 1) * 100) + "%" }} /></div>}
        </div>
        {tab !== "leu" && lembrete(x) && <a className="fq-wa" href={lembrete(x)} target="_blank" rel="noopener">Lembrar</a>}
      </div>)}{!g[tab].length && <div className="empty">{tab === "nao" ? "Todo mundo já abriu. 🙏" : "Ninguém aqui ainda."}</div>}</div>
      <p className="muted small" style={{ marginTop: 12 }}>"Leu tudo" = passou por todas as matérias. O botão Lembrar abre o WhatsApp da pessoa com uma mensagem pronta (aparece para quem tem telefone no cadastro).</p>
    </>}
  </div>;
}
