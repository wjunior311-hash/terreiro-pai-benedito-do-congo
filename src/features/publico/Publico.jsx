// Página aberta do site (sem login): giras abertas, primeira vez, conteúdos abertos, sobre, onde estamos,
// "quero ser avisado" e o botão "Sou filho da casa" (login). Em 2027 entra o "Seja Membro".
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { contentSummary, coverStyle, readingMinutes, sanitizeContentHtml } from "../conteudos/conteudo.js";
import { maskTel } from "../comunidade/Comunidade.jsx";
import "./publico.css";
import { festaAtiva } from "../festa/festa.js";

const BASE = import.meta.env.BASE_URL;
const MARCA = BASE + "marca-casa.png";
const ENDERECO = "R. Irmã Maria Amélia, 147 - Vila Pirituba, São Paulo - SP, 05172-090";
const INSTAGRAM = "https://www.instagram.com/comunidade.tpbc/";
const WHATSAPP = "https://wa.me/5511963737297";
const MAPS = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(ENDERECO);
const WAZE = "https://waze.com/ul?q=" + encodeURIComponent(ENDERECO) + "&navigate=yes";
const MAPA_EMBED = "https://www.google.com/maps?q=" + encodeURIComponent(ENDERECO) + "&output=embed";
const TIPOS = { gira: "Gira", quintal: "Quintal Ancestral", evento: "Evento", desenvolvimento: "Gira", interna: "Gira" };

const diaMes = (q) => { const d = new Date(q); return { sem: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase(), dia: String(d.getDate()).padStart(2, "0"), mes: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase() }; };
const hora = (q) => new Date(q).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }).replace(":00", "h").replace(":", "h");
const msgErro = (e) => String(e?.message || e || "Algo deu errado. Tente de novo.").replace(/^.*?ERROR:\s*/i, "");
const rolar = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

function Vagas({ g }) {
  const pct = g.fill_pct || 0;
  const [cls, txt] = g.is_full ? ["cheio", g.waitlist ? "Lotada · lista de espera" : "Lotada"] : pct >= 85 ? ["pouca", "Últimas vagas"] : pct >= 50 ? ["", "Enchendo"] : ["", "Vagas abertas"];
  return <div className="pb-vagas"><span className={cls}>{txt}</span><div className={"pb-barra " + cls}><i style={{ width: Math.max(6, pct) + "%" }} /></div></div>;
}

function Artigo({ x, voltar }) {
  useEffect(() => { window.scrollTo({ top: 0 }); }, []);
  return <div className="pb">
    <div className="pb-top"><button type="button" className="pb-link" onClick={voltar}>← Voltar</button><img src={MARCA} alt="Terreiro Pai Benedito do Congo" /></div>
    <article className="pb-artigo">
      <div className="pb-artigo-capa" style={coverStyle(x)} />
      <h1>{x.title}</h1>
      <p className="pb-artigo-meta">{readingMinutes(x.body)} min de leitura</p>
      <div className="pb-artigo-corpo" dangerouslySetInnerHTML={{ __html: sanitizeContentHtml(x.body) || "<p>…</p>" }} />
    </article>
    <div className="pb-sec"><div className="pb-aviso-mini"><b>Gostou?</b> Venha conhecer a casa numa gira aberta.<button type="button" className="pb-btn terra" onClick={voltar}>Ver giras abertas</button></div></div>
  </div>;
}

export function Publico({ onEntrar, logado = false }) {
  const [giras, setGiras] = useState(null), [conteudos, setConteudos] = useState([]), [lendo, setLendo] = useState(null), [guia, setGuia] = useState(false);
  const [form, setForm] = useState({ nome: "", tel: "" }), [enviando, setEnviando] = useState(false), [ok, setOk] = useState(false), [erro, setErro] = useState("");
  useEffect(() => {
    document.title = "Terreiro Pai Benedito do Congo";
    supabase.rpc("public_giras").then(({ data }) => setGiras(Array.isArray(data) ? data : []));
    supabase.rpc("public_contents").then(({ data }) => setConteudos(Array.isArray(data) ? data : []));
  }, []);
  const avisar = async (e) => {
    e.preventDefault();
    setErro("");
    if (form.nome.trim().length < 2) return setErro("Digite seu nome.");
    if (form.tel.replace(/\D/g, "").length < 10) return setErro("Digite seu WhatsApp com DDD.");
    setEnviando(true);
    const { error } = await supabase.rpc("public_interest_signup", { p_name: form.nome, p_phone: form.tel });
    setEnviando(false);
    if (error) return setErro(msgErro(error));
    setOk(true);
  };
  if (lendo) return <Artigo x={lendo} voltar={() => { setLendo(null); setTimeout(() => rolar("pb-conteudos"), 50); }} />;

  const festa = festaAtiva();
  return <div className={"pb" + (festa ? " pb-festa" : "")}>
    <div className="pb-top"><img src={MARCA} alt="Terreiro Pai Benedito do Congo" /><button type="button" className="pb-btn claro" onClick={onEntrar}>{logado ? "← Voltar para o app" : "Sou filho da casa"}</button></div>
    {festa && <div className="pb-faixa-festa">★ Eleições 2026 · Hoje é dia de festa na casa! ★</div>}

    <section className="pb-hero">
      <span className="pb-eyebrow ouro">Terreiro de Umbanda</span>
      <h1>As portas estão abertas pra você.</h1>
      <p>Venha para uma gira aberta, conheça a casa e sinta a força dos nossos guias.</p>
      <div className="pb-hero-acoes"><button type="button" className="pb-btn ouro" onClick={() => rolar("pb-giras")}>Ver giras abertas</button><button type="button" className="pb-btn vazado" onClick={() => rolar("pb-onde")}>Como chegar</button></div>
    </section>

    <section className="pb-sec" id="pb-giras">
      <div className="pb-sec-t"><h2>Próximas giras abertas</h2></div>
      {giras === null ? <div className="pb-card pb-skel" /> : giras.length ? giras.map((g) => {
        const d = diaMes(g.starts_at);
        return <div className="pb-card pb-gira" key={g.id}>
          <div className="pb-data"><small>{d.sem}</small><b>{d.dia}</b><small>{d.mes}</small></div>
          <div className="pb-gira-tx"><h3>{g.name}</h3><p>{hora(g.starts_at)} · {g.access === "assist" ? "poucas vagas de assistência" : (TIPOS[g.activity_type] || "Gira") + " aberta à comunidade"}</p>{g.description && <p className="pb-gira-resumo">{g.description}</p>}</div>
          <div className="pb-gira-rodape"><Vagas g={g} /><a className="pb-btn terra" href={BASE + "?comunidade=" + g.id}>{g.is_full ? (g.waitlist ? "Lista de espera" : "Ver") : "Confirmar presença"}</a></div>
        </div>;
      }) : <div className="pb-card pb-vazio"><span>🕯️</span><div><b>Nenhuma gira aberta agora</b><p>As próximas são divulgadas cerca de uma semana antes. Deixe seu contato mais abaixo que a gente avisa.</p></div></div>}
      {giras?.length > 0 && <a className="pb-minhas" href={BASE + "?comunidade"}>Já se inscreveu? Ver minhas inscrições →</a>}
    </section>

    <section className="pb-sec pb-sec-cheia">
      <div className="pb-primeira">
        <span className="pb-eyebrow terra">Primeira vez?</span><h2>Como é uma gira aberta</h2>
        <div className="pb-dicas">
          <div><span>👕</span><b>Roupa clara</b><small>De preferência branca ou clara, confortável e discreta.</small></div>
          <div><span>📝</span><b>Assine a lista</b><small>Ao chegar, assine a lista. O atendimento é por ordem de chegada.</small></div>
          <div><span>🙏🏾</span><b>Atendimento</b><small>Você conversa com uma entidade, com respeito e no seu tempo.</small></div>
          <div><span>📵</span><b>Sem fotos</b><small>Celular no silencioso durante a gira.</small></div>
        </div>
        {guia && <ul className="pb-guia">
          <li><b>Faça sua inscrição.</b> Nos preparamos para receber um número certo de pessoas, então só entra quem se inscreveu. A inscrição é individual.</li>
          <li><b>Vista-se com respeito.</b> Pode: calça, saia longa, camiseta, roupa clara. Evite: decote, roupa curta ou justa.</li>
          <li><b>Chegue no horário.</b> Se as entidades já tiverem encerrado os atendimentos, não vamos conseguir te atender.</li>
          <li><b>Não vai poder vir?</b> Cancele sua inscrição até 48 horas antes, para liberar a vaga para outra pessoa.</li>
        </ul>}
        <button type="button" className="pb-btn claro largo" onClick={() => setGuia(!guia)}>{guia ? "Fechar o guia" : "Ler o guia completo"}</button>
      </div>
    </section>

    {conteudos.length > 0 && <section className="pb-sec" id="pb-conteudos">
      <div className="pb-sec-t"><h2>Para conhecer a casa</h2></div>
      <div className="pb-cts">{conteudos.map((x) => <button type="button" className="pb-card pb-ct" key={x.id} onClick={() => setLendo(x)}>
        <span className="pb-ct-capa" style={coverStyle(x)} />
        <span className="pb-ct-tx"><b>{x.title}</b><small>{contentSummary(x)}</small><em>Ler →</em></span>
      </button>)}</div>
    </section>}

    <section className="pb-sec pb-sec-cheia">
      <div className="pb-sobre"><span className="pb-eyebrow ouro">Sobre a casa</span><h2>Terreiro Pai Benedito do Congo</h2><p>Uma casa de Umbanda de raízes africanas e indígenas, que acolhe quem chega com o coração aberto.</p><a href={INSTAGRAM} target="_blank" rel="noreferrer">Acompanhe no Instagram →</a></div>
    </section>

    <section className="pb-sec pb-sec-cheia" id="pb-onde">
      <div className="pb-sec-t pb-pad"><h2>Onde estamos</h2></div>
      <div className="pb-mapa">
        <iframe title="Mapa do terreiro" src={MAPA_EMBED} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        <div className="pb-mapa-tx"><b>R. Irmã Maria Amélia, 147</b><p>Vila Pirituba · São Paulo · CEP 05172-090</p>
          <div className="pb-mapa-bt"><a className="pb-btn claro" href={MAPS} target="_blank" rel="noreferrer">Google Maps</a><a className="pb-btn claro" href={WAZE} target="_blank" rel="noreferrer">Waze</a></div></div>
      </div>
    </section>

    <section className="pb-sec pb-sec-cheia">
      <form className="pb-avise" onSubmit={avisar} noValidate>
        <span className="pb-eyebrow marrom">Fique por dentro</span><h2>Quer saber das próximas giras?</h2>
        {ok ? <div className="pb-ok">✅ Pronto, {form.nome.trim().split(" ")[0]}! Vamos te avisar pelo WhatsApp quando abrir uma nova gira.</div> : <>
          <p>Deixe seu contato e avisamos quando abrir uma nova gira.</p>
          <input className="pb-input" placeholder="Seu nome" autoComplete="name" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} aria-label="Seu nome" />
          <input className="pb-input" placeholder="Seu WhatsApp" inputMode="tel" autoComplete="tel" value={form.tel} onChange={(e) => setForm({ ...form, tel: maskTel(e.target.value) })} aria-label="Seu WhatsApp" />
          {erro && <div className="pb-erro">{erro}</div>}
          <button className="pb-btn noite largo" type="submit" disabled={enviando}>{enviando ? "Enviando…" : "Quero ser avisado"}</button>
          <small>Usamos seu contato só para avisos da casa.</small>
        </>}
      </form>
    </section>

    <footer className="pb-rodape">
      <img src={MARCA} alt="" />
      <div className="pb-redes"><a href={INSTAGRAM} target="_blank" rel="noreferrer">📷 @comunidade.tpbc</a><a href={WHATSAPP} target="_blank" rel="noreferrer">💬 WhatsApp</a></div>
      <small>Terreiro de Umbanda Pai Benedito do Congo</small>
      <small>{ENDERECO}</small>
      <button type="button" className="pb-entrar" onClick={onEntrar}>{logado ? "← Voltar para o app" : "É filho da casa? Entrar →"}</button>
    </footer>
  </div>;
}
