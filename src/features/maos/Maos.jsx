// Mãos da Egbé: vitrine de negócios, espetáculos e projetos dos filhos da casa.
// Mesma vitrine no app (filhos), na revista (bloco "maos") e no site aberto (só quem marcou "mostrar no site").
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { err } from "../../lib/helpers.js";
import "./maos.css";

export const TIPOS = { negocio: ["🛍️", "Negócio"], espetaculo: ["🎭", "Espetáculo"], projeto: ["🌱", "Projeto"] };
export const AREAS = ["Comida", "Beleza", "Artigos religiosos", "Artesanato", "Moda", "Saúde e bem-estar", "Arte e cultura", "Educação", "Serviços", "Outro"];
const FUNDOS = { negocio: "linear-gradient(135deg,#f7ead0,#e9c98f)", espetaculo: "linear-gradient(135deg,#2b241d,#5b3a2a)", projeto: "linear-gradient(135deg,#e7efe1,#a9c49a)" };
const dia = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "";
const linkSeguro = (u) => /^https?:\/\//i.test(u || "") ? u : u ? "https://" + u : "";

export function MaosCard({ m }) {
  const [ic, tipo] = TIPOS[m.kind] || TIPOS.negocio;
  const quando = m.kind === "espetaculo" || m.ends_on ? (m.starts_on && m.ends_on ? dia(m.starts_on) + " a " + dia(m.ends_on) : m.ends_on ? "Até " + dia(m.ends_on) : "") : "";
  const wa = m.whatsapp ? "https://wa.me/55" + String(m.whatsapp).replace(/^55(?=\d{10,11}$)/, "") : "";
  const principal = m.kind === "espetaculo" && m.link ? ["Ingressos", linkSeguro(m.link), "ing"] : m.kind === "projeto" && (wa || m.link) ? ["Quero ajudar", wa || linkSeguro(m.link), "wa"] : wa ? ["WhatsApp", wa, "wa"] : m.link ? ["Saiba mais", linkSeguro(m.link), "wa"] : null;
  return <article className="mx-card">
    <div className={"mx-foto" + (m.image ? " tem" : "")} style={m.image ? { backgroundImage: `url("${m.image}")` } : { background: FUNDOS[m.kind] }}>
      {!m.image && <span className="mx-ic">{ic}</span>}
      <span className="mx-tag">{ic} {tipo.toUpperCase()}{m.area ? " · " + m.area.toUpperCase() : ""}</span>
      {m.novo && <span className="mx-novo">NOVO</span>}
    </div>
    <div className="mx-tx">
      <h3>{m.name}</h3>
      {m.quem && <div className="mx-quem">{m.quem}, da casa</div>}
      <p>{m.about}</p>
      {(quando || m.place) && <div className="mx-meta">{quando && <span>📅 {quando}</span>}{m.place && <span>📍 {m.place}</span>}</div>}
      {m.offer && <div className="mx-mimo">🎁 {m.offer}</div>}
      <div className="mx-bts">
        {principal && <a className={"mx-bt " + principal[2]} href={principal[1]} target="_blank" rel="noopener noreferrer">{principal[0]}</a>}
        {m.instagram && <a className="mx-bt ig" href={"https://instagram.com/" + m.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>}
      </div>
    </div>
  </article>;
}

export function MaosVitrine({ itens, vazio }) {
  const [f, setF] = useState("todos");
  const lista = itens.filter((m) => f === "todos" || m.kind === f);
  if (!itens.length) return vazio || null;
  const tem = (k) => itens.some((m) => m.kind === k);
  return <div className="mx-vitrine">
    <div className="mx-chips" role="tablist">
      <button type="button" aria-pressed={f === "todos"} onClick={() => setF("todos")}>Todos</button>
      {Object.entries(TIPOS).filter(([k]) => tem(k)).map(([k, [ic, t]]) => <button key={k} type="button" aria-pressed={f === k} onClick={() => setF(k)}>{ic} {t === "Negócio" ? "Negócios" : t + "s"}</button>)}
    </div>
    {lista.map((m) => <MaosCard key={m.id} m={m} />)}
  </div>;
}

export function MaosTopo({ sub = "Negócios, espetáculos e projetos dos filhos da casa. Quando a gente fortalece um irmão, fortalece a casa toda." }) {
  return <div className="mx-hero"><div className="mx-eb">Ẹ̀MÍ ÌLÚ · SEÇÃO FIXA</div><h2>Mãos da <em>Egbé</em></h2><p>{sub}</p></div>;
}

// tela do app (filhos)
export function MaosTela({ go }) {
  const [itens, setItens] = useState(null), [form, setForm] = useState(false);
  const carregar = () => supabase.rpc("maos_list").then(({ data }) => setItens(data || []));
  useEffect(() => { carregar(); }, []);
  if (form) return <MeusTrabalhos voltar={() => { setForm(false); carregar(); }} />;
  return <div className="mx-tela">
    <MaosTopo />
    {itens === null ? <div className="hm-skeleton" style={{ height: 220, margin: 16 }} /> :
      <MaosVitrine itens={itens} vazio={<p className="mx-vazio">Ainda não tem ninguém na vitrine. Seja o primeiro! 🙌🏾</p>} />}
    <button type="button" className="mx-conv" onClick={() => setForm(true)}><b>Tem um negócio, espetáculo ou projeto?</b>Toque aqui para colocar o seu na Mãos da Egbé.</button>
  </div>;
}

// bloco da revista
export function MaosRevista() {
  const [itens, setItens] = useState(null);
  useEffect(() => { supabase.rpc("maos_list").then(({ data }) => setItens(data || [])); }, []);
  if (itens === null) return <div className="hm-skeleton" style={{ height: 160 }} />;
  return <MaosVitrine itens={itens} vazio={<p>Em breve, os trabalhos dos filhos da casa aparecem aqui.</p>} />;
}

const VAZIO = { kind: "negocio", name: "", about: "", area: "", whatsapp: "", instagram: "", link: "", place: "", starts_on: "", ends_on: "", offer: "", image: "", show_public: true };
const reduzir = (file) => new Promise((ok, bad) => {
  if (!file.type.startsWith("image/")) return bad(new Error("Envie uma foto, logo ou cartaz (imagem)."));
  const url = URL.createObjectURL(file), i = new Image();
  i.onload = () => { const s = Math.min(1, 900 / Math.max(i.width, i.height)), c = document.createElement("canvas"); c.width = Math.round(i.width * s); c.height = Math.round(i.height * s); const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(i, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c.toDataURL("image/jpeg", 0.72)); };
  i.onerror = () => { URL.revokeObjectURL(url); bad(new Error("Não foi possível ler a imagem.")); };
  i.src = url;
});
const SIT = { pendente: ["⏳ Esperando aprovação", "pend"], aprovado: ["✅ Na vitrine", "ok"], recusado: ["✏️ Precisa de ajuste", "ajuste"] };

// cadastro do próprio filho
export function MeusTrabalhos({ voltar }) {
  const [meus, setMeus] = useState(null), [f, setF] = useState(null), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const carregar = () => supabase.rpc("my_maos").then(({ data }) => { setMeus(data || []); if (!(data || []).length) setF({ ...VAZIO }); });
  useEffect(() => { carregar(); }, []);
  const set = (o) => setF((v) => ({ ...v, ...o }));
  const foto = async (e) => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; try { set({ image: await reduzir(file) }); } catch (x) { setMsg(x.message); } };
  const salvar = async (e) => {
    e.preventDefault(); setBusy(true); setMsg("");
    const { error } = await supabase.rpc("save_my_maos", { p: f });
    setBusy(false);
    if (error) return setMsg(err(error));
    setF(null); setMsg("Enviado! A gestão da casa vai olhar e te avisar quando estiver na vitrine. 🙌🏾"); carregar();
  };
  const remover = async (m) => { await supabase.rpc("remove_my_maos", { p_id: m.id }); carregar(); };
  const titulo = f?.kind === "espetaculo" ? "do espetáculo" : f?.kind === "projeto" ? "do projeto" : "do negócio";
  return <div className="mx-tela mx-form">
    <button type="button" className="btn" onClick={f && meus?.length ? () => setF(null) : voltar}><ArrowLeft size={15} /> {f && meus?.length ? "Meus cadastros" : "Mãos da Egbé"}</button>
    <h2 className="mx-h">{f ? (f.id ? "Editar cadastro" : "Colocar na Mãos da Egbé") : "Meus cadastros"}</h2>
    {msg && <div className="gw-warning">{msg}</div>}
    {!f && meus && <>
      {meus.map((m) => <div key={m.id} className="mx-meu">
        <MaosCard m={m} />
        <div className="mx-meu-sit"><span className={"mx-sit " + (SIT[m.status] || SIT.pendente)[1]}>{(SIT[m.status] || SIT.pendente)[0]}</span>
          {m.note && <small>Recado da gestão: {m.note}</small>}
          <span className="mx-meu-bts"><button type="button" className="btn sm" onClick={() => { setMsg(""); setF({ ...VAZIO, ...Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v ?? ""])), image: "" , _img: m.image }); }}>Editar</button>
            <button type="button" className="btn sm" onClick={() => remover(m)}>Tirar da vitrine</button></span></div>
      </div>)}
      <button type="button" className="btn primary mx-largo" onClick={() => { setMsg(""); setF({ ...VAZIO }); }}><Plus size={16} /> Cadastrar outro</button>
    </>}
    {f && <form onSubmit={salvar} className="mx-campos">
      <fieldset><legend>É um</legend><div className="mx-tipos">{Object.entries(TIPOS).map(([k, [ic, t]]) => <button key={k} type="button" aria-pressed={f.kind === k} onClick={() => set({ kind: k })}><span>{ic}</span>{t}</button>)}</div></fieldset>
      <label>Nome {titulo}<input className="input" maxLength={80} value={f.name} onChange={(e) => set({ name: e.target.value })} required /></label>
      <label>Em uma frase, o que é <small>{f.about.length}/120</small><textarea className="input" rows={2} maxLength={120} value={f.about} onChange={(e) => set({ about: e.target.value })} required /></label>
      <label>Área<select className="input" value={f.area} onChange={(e) => set({ area: e.target.value })}><option value="">Escolha</option>{AREAS.map((a) => <option key={a}>{a}</option>)}</select></label>
      <label>WhatsApp<input className="input" inputMode="tel" placeholder="(11) 90000-0000" value={f.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} /></label>
      <label>Instagram<input className="input" placeholder="@seuperfil" value={f.instagram} onChange={(e) => set({ instagram: e.target.value })} /></label>
      <label>{f.kind === "espetaculo" ? "Link dos ingressos" : f.kind === "projeto" ? "Link (site, vaquinha…)" : "Site ou link"} <small>opcional</small><input className="input" inputMode="url" value={f.link} onChange={(e) => set({ link: e.target.value })} /></label>
      <label>Onde<input className="input" maxLength={80} placeholder={f.kind === "espetaculo" ? "Teatro, cidade" : "Bairro, cidade, online, entrega…"} value={f.place} onChange={(e) => set({ place: e.target.value })} /></label>
      {f.kind !== "negocio" && <div className="mx-datas">
        <label>{f.kind === "espetaculo" ? "Estreia" : "Começa em"} <small>opcional</small><input className="input" type="date" value={f.starts_on} onChange={(e) => set({ starts_on: e.target.value })} /></label>
        <label>{f.kind === "espetaculo" ? "Última apresentação" : "Termina em"} {f.kind === "projeto" && <small>opcional</small>}<input className="input" type="date" value={f.ends_on} onChange={(e) => set({ ends_on: e.target.value })} required={f.kind === "espetaculo"} /></label>
        <p className="mx-nota">Depois da última data, sai da vitrine sozinho.</p>
      </div>}
      <label>Algo especial para os irmãos da casa? <small>opcional</small><input className="input" maxLength={80} placeholder="Ex.: 10% de desconto, meia-entrada" value={f.offer} onChange={(e) => set({ offer: e.target.value })} /></label>
      <div className="mx-foto-campo"><span>Foto, logo ou cartaz</span>
        {(f.image || f._img) && <img src={f.image || f._img} alt="" />}
        <label className="btn"><input type="file" accept="image/*" hidden onChange={foto} />{f.image || f._img ? "Trocar imagem" : "Escolher imagem"}</label></div>
      <label className="mx-check"><input type="checkbox" checked={!!f.show_public} onChange={(e) => set({ show_public: e.target.checked })} /> Mostrar também no site aberto da casa</label>
      <button className="btn primary mx-largo" disabled={busy}>{busy ? "Enviando…" : "Enviar para aprovação"}</button>
      <p className="mx-nota">A gestão da casa aprova antes de aparecer na vitrine.</p>
    </form>}
  </div>;
}

// gestão: aprovar
export function GestaoMaos() {
  const [lista, setLista] = useState(null), [msg, setMsg] = useState("");
  const carregar = () => supabase.rpc("admin_maos_list").then(({ data, error }) => { if (error) setMsg(err(error)); setLista(data || []); });
  useEffect(() => { carregar(); }, []);
  const mudar = async (m, st) => {
    let note = null;
    if (st === "recusado") { note = window.prompt("O que precisa ajustar? (a pessoa recebe este recado)"); if (note === null) return; }
    const { error } = await supabase.rpc("admin_maos_set", { p_id: m.id, p_status: st, p_note: note });
    if (error) return setMsg(err(error));
    setMsg(st === "aprovado" ? m.name + " está na vitrine." : "Pedido de ajuste enviado."); carregar();
  };
  const pend = (lista || []).filter((m) => m.status === "pendente");
  return <section className="mx-adm">
    <span className="eyebrow">COMUNICAÇÃO</span><h2>Mãos da Egbé</h2>
    <p className="muted">Negócios, espetáculos e projetos dos filhos. Aprove para aparecer no app, na revista e no site (quando a pessoa marcou).</p>
    {msg && <div className="gw-warning">{msg}</div>}
    {lista === null ? <div className="hm-skeleton" /> : !lista.length ? <p className="muted">Ninguém cadastrou ainda.</p> : <>
      {pend.length > 0 && <h3 className="mx-adm-t">Para aprovar ({pend.length})</h3>}
      {lista.map((m, i) => <div key={m.id}>
        {i === pend.length && pend.length > 0 && <h3 className="mx-adm-t">Já analisados</h3>}
        <div className="mx-meu">
          <MaosCard m={m} />
          <div className="mx-meu-sit"><span className={"mx-sit " + (SIT[m.status] || SIT.pendente)[1]}>{(SIT[m.status] || SIT.pendente)[0]}</span>
            <small>{m.quem_completo} · {m.show_public ? "também no site aberto" : "só para os filhos"}{m.ends_on && m.ends_on < new Date().toISOString().slice(0, 10) ? " · já encerrado" : ""}</small>
            {m.note && <small>Recado enviado: {m.note}</small>}
            <span className="mx-meu-bts">
              {m.status !== "aprovado" && <button type="button" className="btn primary sm" onClick={() => mudar(m, "aprovado")}>Aprovar</button>}
              {m.status !== "recusado" && <button type="button" className="btn sm" onClick={() => mudar(m, "recusado")}>Pedir ajuste</button>}
            </span></div>
        </div>
      </div>)}
    </>}
  </section>;
}

// site aberto
export function MaosPublico() {
  const [itens, setItens] = useState([]);
  useEffect(() => { supabase.rpc("public_maos").then(({ data }) => setItens(Array.isArray(data) ? data : [])); }, []);
  if (!itens.length) return null;
  return <section className="pb-sec" id="pb-maos">
    <div className="pb-sec-t"><h2>Mãos da Egbé</h2><p>Negócios, espetáculos e projetos de quem é da casa. Apoie!</p></div>
    <MaosVitrine itens={itens} />
  </section>;
}
