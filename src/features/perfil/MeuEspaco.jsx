// Meu espaço novo: cartão de perfil personalizável, números da caminhada, próximo compromisso,
// atalhos e ajustes. Telas internas: Personalizar e Meu avatar (ateliê).
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ShieldCheck, LogOut, ArrowLeft } from "lucide-react";
import { supabase, APP_URL } from "../../lib/supabase.js";
import { err } from "../../lib/helpers.js";
import { OrixaIcon, ORIXAS, normalizeOrixa } from "../../orixaSymbols.jsx";
import { Finance, Profile, InstallApp } from "../eu/Eu.jsx";
import { AvisosOption } from "../avisos/AtivarAvisos.jsx";
import { hasAnyAdmin } from "../acesso.js";
import { useMemberFinance } from "../financeiro/regras.js";
import { Medalha, nomeInsignia } from "../insignias/Insignias.jsx";
import { PessoaAvatar, AvatarDesenho } from "./PessoaAvatar.jsx";
import { CORES_PERFIL } from "./perfil.js";
import { PELES, CAB_COR, CORES, FUNDOS, CABELOS, PANOS, OCULOS, BRINCOS, BARBAS, ROSTOS, ROUPAS, PADRAO, SELO_ROSTO, CAPAS } from "./avatarArte.js";
import "./perfil.css";

const nomeOrixa = (k) => (ORIXAS.find((x) => x[0] === normalizeOrixa(k)) || [])[1] || "";
const MSG_SITE = "Oi! 🙏🏾 O terreiro que eu frequento, o Terreiro Pai Benedito do Congo, agora tem um site! Lá você vê as giras abertas, faz sua inscrição em 1 minuto e tem um guia pra quem nunca foi numa gira. Dá uma olhada: ";

function useEstado(p) {
  const [st, setSt] = useState({ selos: 0, festa: false, badges: [] });
  const carregar = () => supabase.rpc("my_customization_state").then(({ data }) => data && setSt(data));
  useEffect(() => { carregar(); }, [p?.id]);
  return [st, carregar];
}

const filhoDe = (p) => {
  const o = nomeOrixa(p.orixa_symbol);
  if (!o) return "";
  return "Filho(a) de " + o;
};

export function MeuEspaco({ p, go, logout, memberPreview = false, recarregar }) {
  const [tab, setTab] = useState("menu");
  const [estado, recarregarEstado] = useEstado(p);
  const fin = useMemberFinance(p);
  const [giras, setGiras] = useState(null), [prox, setProx] = useState(null);
  useEffect(() => {
    supabase.from("gira_responses").select("status,giras(id,name,starts_at,status,contribution_amount)").eq("profile_id", p.id).eq("status", "going").then(async ({ data }) => {
      const agora = new Date(), ano = agora.getFullYear();
      const g = (data || []).map((r) => r.giras).filter((x) => x && (x.status || "published") === "published");
      setGiras(g.filter((x) => new Date(x.starts_at) <= agora && new Date(x.starts_at).getFullYear() === ano).length);
      const futura = g.filter((x) => new Date(x.starts_at) >= new Date(agora.getTime() - 6 * 36e5)).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0];
      if (futura) {
        const { data: c } = await supabase.from("extra_charges").select("status").eq("gira_id", futura.id).eq("profile_id", p.id).neq("status", "not_applicable").limit(1);
        setProx({ ...futura, pago: c?.[0] ? c[0].status === "paid" : null });
      } else setProx(false);
    });
  }, [p.id]);
  const salvo = async () => { await recarregar?.(); recarregarEstado(); setTab("menu"); window.scrollTo({ top: 0 }); };
  if (tab === "profile") return <Profile p={p} back={() => setTab("menu")} />;
  if (tab === "finance") return <Finance p={p} back={() => setTab("menu")} />;
  if (tab === "personalizar") return <Personalizar p={p} estado={estado} voltar={() => setTab("menu")} abrirAvatar={() => setTab("avatar")} salvo={salvo} />;
  if (tab === "avatar") return <MeuAvatar p={p} estado={estado} voltar={() => setTab("personalizar")} salvo={salvo} />;

  const cor = p.cor || "";
  const abertos = fin.items.filter((x) => !x.proof), atrasado = abertos.some((x) => x.overdue);
  const mens = p.is_pai_de_santo ? null : !fin.loaded ? "…" : atrasado ? "Em atraso" : abertos.length ? "Em aberto" : "Em dia ✓";
  const anos = p.na_casa_desde ? new Date().getFullYear() - p.na_casa_desde : null;
  const compartilhar = async () => {
    try { if (navigator.share) { await navigator.share({ title: "Terreiro Pai Benedito do Congo", text: MSG_SITE, url: APP_URL }); return; } } catch (e) { return; }
    window.open("https://wa.me/?text=" + encodeURIComponent(MSG_SITE + APP_URL), "_blank");
  };
  const d = prox ? new Date(prox.starts_at) : null;
  return <div className="me2" style={cor ? { "--acc": cor } : undefined}>
    <section className="me2-perfil">
      <div className={"me2-capa capa-" + (p.capa || "casa")} />
      <div className="me2-topo">
        <span className="me2-av"><PessoaAvatar p={p} size={104} sempre /></span>
        <button type="button" className="me2-edit" onClick={() => setTab("personalizar")}>✎ Personalizar</button>
      </div>
      <div className="me2-info">
        <h2>{p.name}</h2>
        <p className="me2-filho">{[filhoDe(p), p.groups?.name ? "Grupo " + p.groups.name : ""].filter(Boolean).join(" · ")}</p>
        <div className="me2-chips">
          <span className="me2-chip acc">{p.is_pai_de_santo ? "Pai/Mãe da casa" : "Filho(a) da casa"}</span>
          {p.na_casa_desde && <span className="me2-chip">Na casa desde {p.na_casa_desde}{anos > 0 ? " · " + anos + (anos === 1 ? " ano" : " anos") : ""}</span>}
        </div>
        {p.frase && <p className="me2-frase">“{p.frase}”</p>}
        {p.vitrine?.length > 0 && <div className="me2-vitrine">{p.vitrine.map((b) => <span key={b} title={nomeInsignia(b)}><Medalha badge={b} level={1} size={44} /></span>)}<small>Minhas insígnias<br />em destaque</small></div>}
      </div>
    </section>

    <div className="me2-stats">
      <div><b>{giras ?? "…"}</b><small>{giras === 1 ? "gira este ano" : "giras este ano"}</small></div>
      <button type="button" onClick={() => go("insignias")}><b>{estado.selos}</b><small>insígnias</small></button>
      {mens ? <button type="button" className={atrasado ? "is-ruim" : abertos.length ? "is-meio" : "is-ok"} onClick={() => setTab("finance")}><b>{mens}</b><small>mensalidade</small></button>
        : <div><b>{estado.badges?.filter((b) => b.startsWith("emi:")).length || 0}</b><small>revistas lidas</small></div>}
    </div>

    <h3 className="me2-t">Meu próximo compromisso</h3>
    {prox === null ? <div className="me2-card hm-skeleton" style={{ height: 90 }} /> : prox ? <button type="button" className="me2-card me2-prox" onClick={() => go("giras")}>
      <span className="me2-data"><small>{d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase()}</small><b>{String(d.getDate()).padStart(2, "0")}</b><small>{d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase()}</small></span>
      <span className="me2-prox-tx"><b>{prox.name}</b><small>{d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small>
        <span className="me2-tags"><span>Presença confirmada</span>{prox.pago === true && <span>Pagamento ok</span>}{prox.pago === false && <span className="w">Falta pagar</span>}</span></span>
      <ChevronRight size={18} />
    </button> : <button type="button" className="me2-card me2-vazio" onClick={() => go("giras")}><span>🕯️</span><span><b>Nenhuma gira confirmada</b><small>Veja a agenda e confirme sua presença.</small></span><ChevronRight size={18} /></button>}

    <h3 className="me2-t">Minha vida na casa</h3>
    <div className="me2-grid">
      <button type="button" className="me2-card me2-tile" onClick={() => go("insignias")}><span className="ic i1">🏅</span><b>Insígnias</b><small>Missões e selos da caminhada</small></button>
      {!p.is_pai_de_santo && <button type="button" className="me2-card me2-tile" onClick={() => setTab("finance")}><span className="ic i2">💳</span><b>Financeiro</b><small>Mensalidades e contribuições</small></button>}
      <button type="button" className="me2-card me2-tile" onClick={() => go("giras")}><span className="ic i3">🗓️</span><b>Minhas giras</b><small>Presenças, turnos e tarefas</small></button>
      <button type="button" className="me2-card me2-tile" onClick={() => setTab("profile")}><span className="ic i4">🪪</span><b>Meus dados</b><small>Contato, aniversário e senha</small></button>
      {p.is_pai_de_santo && <button type="button" className="me2-card me2-tile" onClick={() => go("content")}><span className="ic i2">📖</span><b>Conteúdos</b><small>Textos, avisos e materiais</small></button>}
    </div>

    <div className="me2-card me2-site"><span className="ic">🌐</span><span><b>Site da casa</b><small>Mostre a casa pra quem quer conhecer</small></span>
      <span className="me2-site-bt"><a className="btn" href={APP_URL + "?site"}>Ver</a><button type="button" className="btn primary" onClick={compartilhar}>Compartilhar</button></span></div>

    <h3 className="me2-t">Ajustes</h3>
    <div className="me-options">{!memberPreview && hasAnyAdmin(p) && <button onClick={() => go("admin")}><ShieldCheck /><span><b>Gestão da casa</b><small>Pessoas, giras e conteúdos</small></span><ChevronRight /></button>}
      <AvisosOption /><InstallApp />
      <button onClick={logout}><LogOut /><span><b>Sair</b><small>Encerrar minha sessão</small></span><ChevronRight /></button>
    </div>
  </div>;
}

// ---------- Personalizar ----------
function Personalizar({ p, estado, voltar, abrirAvatar, salvo }) {
  const [f, setF] = useState({ avatar_mode: p.avatar_mode || "orixa", capa: p.capa || "casa", cor: p.cor || "", frase: p.frase || "", vitrine: p.vitrine || [], na_casa_desde: p.na_casa_desde || "" });
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const set = (o) => setF((v) => ({ ...v, ...o }));
  const anoAtual = new Date().getFullYear();
  const badges = estado.badges || [];
  const salvar = async () => {
    setBusy(true); setMsg("");
    const { error } = await supabase.rpc("save_my_customization", { p: { ...f, avatar: p.avatar || null, na_casa_desde: f.na_casa_desde ? +f.na_casa_desde : null } });
    setBusy(false);
    if (error) return setMsg(err(error));
    salvo();
  };
  const prev = { ...p, ...f };
  return <div className="me2 pz" style={f.cor ? { "--acc": f.cor } : undefined}>
    <button type="button" className="btn" onClick={voltar}><ArrowLeft size={15} /> Meu espaço</button>
    <h2 className="pz-h">Personalizar</h2>
    <div className="me2-perfil pz-prev"><div className={"me2-capa capa-" + f.capa} /><div className="pz-prev-row"><span className="me2-av"><PessoaAvatar p={prev} size={72} sempre /></span><span><b>{p.name}</b><small>{filhoDe(p)}</small></span></div></div>

    <section className="pz-sec"><h4>Sua imagem</h4><p>O símbolo do seu Orixá sempre aparece junto.</p>
      <div className="pz-seg">
        <button type="button" aria-pressed={f.avatar_mode === "orixa"} onClick={() => set({ avatar_mode: "orixa" })}><OrixaIcon name={p.orixa_symbol} size={54} />Só o Orixá</button>
        <button type="button" aria-pressed={f.avatar_mode === "avatar"} onClick={() => p.avatar ? set({ avatar_mode: "avatar" }) : abrirAvatar()}>
          {p.avatar ? <PessoaAvatar p={{ ...p, avatar_mode: "avatar" }} size={54} sempre /> : <span className="pz-novo">＋</span>}Avatar</button>
      </div>
      <button type="button" className="btn pz-largo" onClick={abrirAvatar}>{p.avatar ? "Editar meu avatar" : "Criar meu avatar"}</button>
    </section>

    <section className="pz-sec"><h4>Capa <small>libera uma nova a cada 5 insígnias</small></h4>
      <div className="pz-capas">{CAPAS.map(([v, l, n]) => { const trava = estado.selos < n; return <button type="button" key={v} className={"capa-" + v} aria-pressed={f.capa === v} disabled={trava} onClick={() => set({ capa: v })}><span>{l}</span>{trava && <i>🔒 {n} insígnias</i>}</button>; })}</div>
    </section>

    <section className="pz-sec"><h4>Minha cor</h4><p>Muda os destaques do seu Meu espaço.</p>
      <div className="pz-cores">{CORES_PERFIL.map(([c, l]) => <button type="button" key={l} aria-label={l} title={l} aria-pressed={f.cor === c} style={{ background: c || "var(--brand-ink)" }} onClick={() => set({ cor: c })} />)}</div>
    </section>

    <section className="pz-sec"><h4>Minha frase <small>{f.frase.length}/90</small></h4>
      <textarea id="pz-frase" className="pz-frase" maxLength={90} rows={2} placeholder="Um ponto, uma oração, um lema…" value={f.frase} onChange={(e) => set({ frase: e.target.value })} /></section>

    <section className="pz-sec"><h4>Vitrine de insígnias <small>escolha até 3</small></h4>
      {badges.length ? <div className="pz-ins">{badges.map((b) => { const on = f.vitrine.includes(b); return <button type="button" key={b} aria-pressed={on} onClick={() => set({ vitrine: on ? f.vitrine.filter((x) => x !== b) : f.vitrine.length < 3 ? [...f.vitrine, b] : f.vitrine })}><Medalha badge={b} level={1} size={46} /><small>{nomeInsignia(b)}</small></button>; })}</div>
        : <p>Quando você conquistar insígnias, escolhe aqui quais mostrar.</p>}
    </section>

    <section className="pz-sec"><h4>Na casa desde</h4>
      <select id="pz-ano" className="input" value={f.na_casa_desde} onChange={(e) => set({ na_casa_desde: e.target.value })}><option value="">Prefiro não mostrar</option>{Array.from({ length: anoAtual - 1979 }, (_, i) => anoAtual - i).map((a) => <option key={a} value={a}>{a}</option>)}</select></section>

    {msg && <div className="gw-warning">{msg}</div>}
    <button type="button" className="btn primary pz-salvar" disabled={busy} onClick={salvar}>{busy ? "Salvando…" : "Salvar"}</button>
  </div>;
}

// ---------- Meu avatar (ateliê) ----------
const LIGA = { barba: "cheia", oculos: "redondo", brinco: "argola" };
function MeuAvatar({ p, estado, voltar, salvo }) {
  const [s, setS] = useState({ ...PADRAO, ...(p.avatar || {}) });
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), [aviso, setAviso] = useState("");
  const travado = (k, v) => k === "rosto" && estado.selos < (SELO_ROSTO[v] || 0) ? (SELO_ROSTO[v] + " insígnias") : k === "oculos" && v === "sol" && !estado.festa ? "festa" : "";
  const escolher = (k, v) => { const t = travado(k, v); if (t) { setAviso(t === "festa" ? "🎉 Libera para quem confirmar presença na Festa da Abundância." : "🔒 Libera quando você tiver " + t + ". Você tem " + estado.selos + "."); setTimeout(() => setAviso(""), 2800); return; } setS((x) => ({ ...x, [k]: v })); };
  const salvar = async () => {
    setBusy(true); setMsg("");
    const cfg = { ...s }; delete cfg.orixa; delete cfg.capa;
    const { error } = await supabase.rpc("save_my_customization", { p: { avatar_mode: "avatar", avatar: cfg, capa: p.capa || "casa", cor: p.cor || "", frase: p.frase || "", vitrine: p.vitrine || [], na_casa_desde: p.na_casa_desde || null } });
    setBusy(false);
    if (error) return setMsg(err(error));
    salvo();
  };
  const Th = ({ k, v, label, mudo, cfg }) => { const t = travado(k, v); return <button type="button" className={"av-th" + (t ? " is-lock" : "") + (t === "festa" ? " is-festa" : "")} aria-pressed={String(s[k]) === String(v)} aria-label={label} title={label} onClick={() => escolher(k, v)}>
    <AvatarDesenho cfg={{ ...s, ...cfg, [k]: v }} />{!mudo && <span className="nm">{label}</span>}{t && <span className="tranca">{t === "festa" ? "Confirme presença na Festa da Abundância" : "🔒 " + t}</span>}</button>; };
  const Sw = ({ k, v, cor, label }) => <button type="button" className="av-sw" aria-label={label} title={label} aria-pressed={String(s[k]) === String(v)} style={{ background: cor }} onClick={() => escolher(k, v)} />;
  const Tg = ({ on, label, onClick }) => <button type="button" className="av-tg" aria-pressed={on} onClick={onClick}>{label}</button>;
  const liga = (k, on) => setS((x) => ({ ...x, [k]: on ? (x[k] || LIGA[k]) : "" }));
  return <div className="me2 at">
    <button type="button" className="btn" onClick={voltar}><ArrowLeft size={15} /> Personalizar</button>
    <div className="at-palco"><span className="pa at-big"><AvatarDesenho cfg={s} /><span className="pa-selo"><OrixaIcon name={p.orixa_symbol} size={64} /></span></span>
      <button type="button" className="btn primary" disabled={busy} onClick={salvar}>{busy ? "Salvando…" : "Usar este avatar"}</button>
      {msg && <div className="gw-warning">{msg}</div>}</div>
    {aviso && <div className="at-aviso" role="status">{aviso}</div>}
    <section className="pz-sec"><h4>Expressão <small>a Sorridente já vem liberada</small></h4><div className="av-ths">{ROSTOS.map(([v, l]) => <Th key={v} k="rosto" v={v} label={l} />)}</div></section>
    <section className="pz-sec"><h4>Tom de pele</h4><div className="av-lin">{PELES.map((c, i) => <Sw key={c} k="pele" v={i} cor={c} label={"Tom " + (i + 1)} />)}</div></section>
    <section className="pz-sec"><h4>Cabelo</h4><p>Aparece quando não tem pano de cabeça.</p><div className="av-ths">{CABELOS.map(([v, l]) => <Th key={v} k="cabelo" v={v} label={l} mudo cfg={{ pano: "" }} />)}</div>
      <div className="av-sub">Cor do cabelo e da barba</div><div className="av-lin">{CAB_COR.map(([c, l]) => <Sw key={c} k="cabeloCor" v={c} cor={c} label={l} />)}</div></section>
    <section className="pz-sec"><h4>Pano de cabeça</h4><div className="av-ths">{PANOS.map(([v, l]) => <Th key={v || "sem"} k="pano" v={v} label={l} mudo />)}</div>
      {s.pano && <><div className="av-sub">Tecido</div><div className="av-tgs"><Tg on={!s.panoListrado} label="Liso" onClick={() => setS((x) => ({ ...x, panoListrado: false }))} /><Tg on={!!s.panoListrado} label="Listrado" onClick={() => setS((x) => ({ ...x, panoListrado: true }))} /></div>
        <div className="av-sub">Cor do pano</div><div className="av-lin">{CORES.map((c) => <Sw key={c} k="panoCor" v={c} cor={c} label={c} />)}</div>
        {s.panoListrado && s.pano !== "croche" && <><div className="av-sub">Cor da listra</div><div className="av-lin">{CORES.map((c) => <Sw key={c} k="listra" v={c} cor={c} label={c} />)}</div></>}</>}</section>
    <section className="pz-sec"><h4>Roupa</h4><div className="av-ths">{ROUPAS.map(([v, l]) => <Th key={v} k="roupa" v={v} label={l} />)}</div>
      {s.roupa !== "branca" && <><div className="av-sub">Cor da roupa</div><div className="av-lin">{CORES.map((c) => <Sw key={c} k="roupaCor" v={c} cor={c} label={c} />)}</div></>}
      {s.roupa === "estampada" && <><div className="av-sub">Cor da estampa</div><div className="av-lin">{CORES.map((c) => <Sw key={c} k="estampaCor" v={c} cor={c} label={c} />)}</div></>}</section>
    <section className="pz-sec"><h4>Fio de contas</h4><div className="av-tgs"><Tg on={!s.semContas} label="Com fio" onClick={() => setS((x) => ({ ...x, semContas: false }))} /><Tg on={!!s.semContas} label="Sem fio" onClick={() => setS((x) => ({ ...x, semContas: true }))} /></div>
      {!s.semContas && <><div className="av-sub">Cor 1</div><div className="av-lin">{CORES.map((c) => <Sw key={c} k="conta1" v={c} cor={c} label={c} />)}</div><div className="av-sub">Cor 2</div><div className="av-lin">{CORES.map((c) => <Sw key={c} k="conta2" v={c} cor={c} label={c} />)}</div></>}</section>
    <section className="pz-sec"><h4>Detalhes</h4>
      <div className="av-sub">Barba</div><div className="av-tgs"><Tg on={!s.barba} label="Sem barba" onClick={() => liga("barba", false)} /><Tg on={!!s.barba} label="Com barba" onClick={() => liga("barba", true)} /></div>
      {s.barba && <div className="av-ths">{BARBAS.map(([v, l]) => <Th key={v} k="barba" v={v} label={l} />)}</div>}
      <div className="av-sub">Óculos</div><div className="av-tgs"><Tg on={!s.oculos} label="Sem óculos" onClick={() => liga("oculos", false)} /><Tg on={!!s.oculos} label="Com óculos" onClick={() => liga("oculos", true)} /></div>
      {s.oculos && <div className="av-ths">{OCULOS.map(([v, l]) => <Th key={v} k="oculos" v={v} label={l} />)}</div>}
      <div className="av-sub">Brincos</div><div className="av-tgs"><Tg on={!s.brinco} label="Sem brincos" onClick={() => liga("brinco", false)} /><Tg on={!!s.brinco} label="Com brincos" onClick={() => liga("brinco", true)} /></div>
      {s.brinco && <><div className="av-ths">{BRINCOS.map(([v, l]) => <Th key={v} k="brinco" v={v} label={l} cfg={{ brincoLado: "ambos", pano: "" }} />)}</div>
        <div className="av-sub">Em qual orelha (olhando a imagem)</div><div className="av-tgs">{[["esq", "Esquerda"], ["dir", "Direita"], ["ambos", "As duas"]].map(([v, l]) => <Tg key={v} on={(s.brincoLado || "ambos") === v} label={l} onClick={() => setS((x) => ({ ...x, brincoLado: v }))} />)}</div></>}</section>
    <section className="pz-sec"><h4>Fundo</h4><div className="av-lin">{FUNDOS.map((c) => <Sw key={c} k="fundo" v={c} cor={c} label={c} />)}</div></section>
    <button type="button" className="btn primary pz-salvar" disabled={busy} onClick={salvar}>{busy ? "Salvando…" : "Usar este avatar"}</button>
  </div>;
}
