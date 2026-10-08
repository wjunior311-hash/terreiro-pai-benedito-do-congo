// Estrutura do app: login, cabeçalho, telas e menu inferior.
import { useEffect, useState } from "react";
import { Home as HomeIcon, CalendarDays, Leaf, UserRound, BookOpen, ShieldCheck, Eye as EyeIcon, ArrowLeft } from "lucide-react";
import { supabase } from "./lib/supabase.js";
import { OrixaIcon, ORIXAS } from "./orixaSymbols.jsx";
import { TERREIRO_LOGO } from "./logoData.js";
import { createRoot } from "react-dom/client";
import { err, groups } from "./lib/helpers.js";
import { Field } from "./components/ui.jsx";
import { hasAnyAdmin } from "./features/acesso.js";
import { Home } from "./features/inicio/Inicio.jsx";
import { Giras } from "./features/agenda/Agenda.jsx";
import { Community } from "./features/mural/Mural.jsx";
import { HouseContent } from "./features/conteudos/Conteudos.jsx";
import { ContactParents, Me } from "./features/eu/Eu.jsx";
import { Admin } from "./features/gestao/Gestao.jsx";
import { refreshPushSubscription } from "./features/avisos/push.js";
import { RevistaTela } from "./features/revista/Revista.jsx";
import "./styles.css";
import "./app.css";
import "./tema.css";

const SCREEN_TITLES = { home: "Início", giras: "Agenda", community: "Mural", content: "Conteúdos", me: "Meu espaço", contact: "Falar com os Pais", admin: "Gestão da Casa", revista: "Ẹ̀mí Ìlú" };
const SCREEN_PARENT = { contact: "me", admin: "me", revista: "home" };

export function App() {
  const [session, setSession] = useState(null),
    [profile, setProfile] = useState(null),
    [loading, setLoading] = useState(true),
    [screen, setScreen] = useState(() => {
      // aviso do celular abre direto na tela certa (?tela=giras)
      const t = new URLSearchParams(window.location.search).get("tela");
      return SCREEN_TITLES[t] ? t : "home";
    }),
    [memberPreview, setMemberPreview] = useState(false),
    [scrolled, setScrolled] = useState(false),
    [muralDraft, setMuralDraft] = useState(null);
  const loadProfile = async (u) => {
    if (!u) {
      setProfile(null);
      return;
    }
    await supabase.rpc("record_profile_seen");
    const { data } = await supabase.from("profiles").select("*,groups(name)").eq("id", u.id).maybeSingle();
    if (!data) {
      setProfile(null);
      return;
    }
    const { data: perms, error: pe } = await supabase.rpc("my_admin_permissions");
    setProfile(pe ? data : { ...data, perms: perms || [] });
    refreshPushSubscription();
  };
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session?.user);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      loadProfile(s?.user);
    });
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("tela")) window.history.replaceState(null, "", window.location.pathname);
    const onMsg = (e) => {
      if (e.data?.type !== "abrir") return;
      try {
        const t = new URL(e.data.url).searchParams.get("tela");
        if (SCREEN_TITLES[t]) setScreen(t);
      } catch (x) { /* ignora */ }
    };
    navigator.serviceWorker?.addEventListener("message", onMsg);
    return () => navigator.serviceWorker?.removeEventListener("message", onMsg);
  }, []);
  if (loading) return <div className="auth">
    <div className="card">
    <h2>Terreiro Pai Benedito do Congo</h2>
    <p className="muted">Carregando…</p>
    </div>
    </div>;
  if (!session) return <Auth />;
  if (!profile) return <div className="auth"><div className="card">Seu cadastro está sendo carregado…</div></div>;
  const logout = async () => {
    await supabase.auth.signOut();
    setScreen("home");
  };
  const go = (s, payload) => {
    setMuralDraft(payload?.muralDraft || null);
    setScreen(s);
  };
  const canPreview = hasAnyAdmin(profile);
  const parent = SCREEN_PARENT[screen];
  return <div className="app">
<header className={"hdr" + (scrolled ? " scrolled" : "")}>
  {parent && <button className="hdr-back" aria-label="Voltar" onClick={() => setScreen(parent)}><ArrowLeft size={22} /></button>}
  <div className="hdr-title">
    {screen === "home" && <small>Terreiro Pai Benedito do Congo</small>}
    <h1>{SCREEN_TITLES[screen] || "Início"}</h1>
  </div>
  <div className="hdr-actions">
    {canPreview && <button className={"hdr-preview " + (memberPreview ? "member" : "admin")} aria-label={memberPreview ? "Voltar para a visão de administrador" : "Ver como membro"} onClick={() => {
    setMemberPreview(!memberPreview);
    setScreen("home");
  }}><EyeIcon size={16} /><span>{memberPreview ? "Voltar p/ ADM" : "Ver como membro"}</span></button>}
    <button className="hdr-me" aria-label="Meu espaço" onClick={() => setScreen("me")}><OrixaIcon name={profile.orixa_symbol} size={28} /></button>
  </div>
</header>
{canPreview && memberPreview && <div className="preview-banner">
  <EyeIcon size={15} /> Você está vendo como membro</div>}
<main className="content"><div className="screen" key={screen}>
  {screen === "home" && <Home p={profile} go={go} memberPreview={memberPreview} />}
  {screen === "giras" && <Giras p={profile} />}
  {screen === "revista" && <RevistaTela p={profile} />}
  {screen === "community" && <Community p={profile} draft={muralDraft} />}
  {screen === "content" && <HouseContent p={profile} back={() => setScreen("home")} />} 
  {screen === "me" && <Me p={profile} go={setScreen} logout={logout} memberPreview={memberPreview} />} {screen === "contact" && <ContactParents back={() => setScreen("home")} />}
  {screen === "admin" && !memberPreview && hasAnyAdmin(profile) && <Admin p={profile} />}
</div></main>
<nav className="bottom">
  <div className="bottom-inner">{[["home", "Início", HomeIcon], ["giras", "Agenda", CalendarDays], ["community", "Mural", Leaf], ["content", "Conteúdos", BookOpen], ["me", "Meu espaço", UserRound]].map(([id, label, Icon]) => <button key={id} className={screen === id ? "active" : ""} onClick={() => setScreen(id)}>
  <Icon size={20} />{label}</button>)}</div>
  </nav>
</div>;
}

export function Auth() {
  const [register, setRegister] = useState(false),
    [code, setCode] = useState(""),
    [invite, setInvite] = useState(null),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [dob, setDob] = useState(""),
    [orixa, setOrixa] = useState(""),
    [group, setGroup] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const normalizeCode = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const validate = async () => {
    const raw = code.trim();
    if (!raw) {
      setInvite(null);
      setMessage("Digite o código de convite.");
      return;
    }
    const { data: statusError } = await supabase.rpc("get_invitation_status", { p_code: raw });
    const status = statusError || "not_found";
    if (status !== "active") {
      setInvite(null);
      setMessage(status === "used" ? "Este convite já foi utilizado." : status === "expired" ? "Este convite expirou." : status === "revoked" ? "Este convite foi revogado." : "Código de convite não encontrado.");
      return;
    }
    const { data, error } = await supabase.rpc("validate_invitation", { p_code: raw });
    if (error || !data?.length) {
      setInvite(null);
      setMessage("Não foi possível validar este convite.");
      return;
    }
    setInvite(data[0]);
    setName(data[0].intended_name || "");
    setEmail(data[0].intended_email || "");
    setMessage("Convite válido.");
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (register) {
        if (!invite) {
          await validate();
          return;
        }
        if (!dob || !orixa || !group) throw new Error("Preencha data de nascimento, Orixá e grupo.");
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, invite_code: normalizeCode(code), date_of_birth: dob, orixa_symbol: orixa, group_name: group } } });
        if (error) throw error;
        setMessage(data.session ? "Conta criada. Entrando na casa…" : "Conta criada. Agora você já pode entrar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error('E-mail ou senha incorretos. Se você ainda não criou sua conta, use "Tenho um código de convite".');
      }
    } catch (e2) {
      setMessage(err(e2));
    } finally {
      setBusy(false);
    }
  };
  return <div className="auth">
    <div className="card">
    <div className="row">
    <img src={TERREIRO_LOGO} alt="Terreiro Pai Benedito do Congo" className="logo" />
    <span className="eyebrow">Terreiro Pai Benedito do Congo</span>
    </div>
    <h1>{register ? "Entre para a casa." : "Bem-vindo de volta."}</h1>{message && <div className="toast">{message}</div>}<form onSubmit={submit}>{register && <>
    <Field label="Nome">
    <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
    </Field>
    <Field label="Código de convite">
    <div className="row">
    <input className="input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
    <button className="btn" type="button" onClick={validate}>Validar</button>
    </div>
    </Field>{invite && <div className="toast">
    <ShieldCheck size={15} /> Convite para {invite.role}</div>}<Field label="Data de nascimento">
    <input className="input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
    </Field>
    <Field label="Orixá">
    <select className="select" value={orixa} onChange={(e) => setOrixa(e.target.value)} required>
    <option value="">Escolha</option>{ORIXAS.map(([v, l]) => <option value={v} key={v}>{l}</option>)}</select>
    </Field>
    <Field label="Grupo">
    <select className="select" value={group} onChange={(e) => setGroup(e.target.value)} required>
    <option value="">Escolha</option>{groups.filter((x) => x !== "Organização").map((x) => <option key={x}>{x}</option>)}<option>Ainda não estou em nenhum grupo</option>
    </select>
    </Field>
    </>}<Field label="E-mail">
    <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
    </Field>
    <Field label="Senha">
    <input className="input" type="password" minLength="6" value={password} onChange={(e) => setPassword(e.target.value)} required />
    </Field>
    <button className="btn primary" style={{ width: "100%" }} disabled={busy}>{busy ? "Aguarde…" : register ? "Criar minha conta" : "Entrar"}</button>
    </form>
    <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={() => {
    setRegister(!register);
    setMessage("");
    setInvite(null);
  }}>{register ? "Já tenho uma conta" : "Tenho um código de convite"}</button></div></div>;
}

createRoot(document.getElementById("root")).render(<App />);
