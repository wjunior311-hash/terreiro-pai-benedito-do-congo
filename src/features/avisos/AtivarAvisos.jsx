// Passo a passo para ativar os avisos no celular (Android e iPhone).
import { useEffect, useState } from "react";
import { Bell, BellOff, ChevronRight, X, Share, PlusSquare, Smartphone, Check } from "lucide-react";
import { err } from "../../lib/helpers.js";
import { disablePush, enablePush, pushState } from "./push.js";

const DISMISS_KEY = "tpbc-avisos-adiado";
const dismissedRecently = () => {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - t < 14 * 864e5;
  } catch (e) {
    return false;
  }
};
const dismiss = () => {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch (e) { /* sem armazenamento */ }
};

export function usePushState() {
  const [state, setState] = useState(null);
  const refresh = () => pushState().then(setState).catch(() => setState("unsupported"));
  useEffect(() => {
    refresh();
  }, []);
  return [state, refresh];
}

export function AvisosGuide({ onClose, onChange }) {
  const [state, refresh] = usePushState(), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const on = async () => {
    setBusy(true);
    setMsg("");
    try {
      await enablePush();
      setMsg("Pronto! Os avisos da casa vão chegar neste celular.");
    } catch (e) {
      setMsg(err(e));
    }
    setBusy(false);
    refresh();
    onChange?.();
  };
  const off = async () => {
    setBusy(true);
    try {
      await disablePush();
    } catch (e) { /* segue */ }
    setBusy(false);
    refresh();
    onChange?.();
  };
  return <div className="modal-back" onClick={onClose}>
    <div className="modal av-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="av-title">
      <div className="row between"><h3 id="av-title" style={{ margin: 0 }}>Avisos no celular</h3><button className="btn" aria-label="Fechar" onClick={onClose}><X size={16} /></button></div>
      <p className="muted">Receba no celular, mesmo com o app fechado: gira publicada, escolha de turnos, troca de turno, mensalidade perto de vencer, leitura obrigatória e comentários nas suas publicações.</p>
      {state === null && <span className="skeleton skeleton-card" />}
      {state === "on" && <>
        <div className="av-ok"><Check size={18} /> Os avisos estão ativados neste celular.</div>
        <button className="btn" disabled={busy} onClick={off}><BellOff size={16} /> Desativar neste celular</button>
      </>}
      {state === "ready" && <>
        <ol className="av-steps"><li>Toque no botão abaixo.</li><li>Quando o celular perguntar, toque em <b>Permitir</b>.</li></ol>
        <button className="btn primary av-main" disabled={busy} onClick={on}><Bell size={17} /> {busy ? "Ativando…" : "Ativar avisos"}</button>
      </>}
      {state === "ios-install" && <>
        <p className="av-lead">No iPhone, os avisos só funcionam com o app na Tela de Início. É rapidinho:</p>
        <ol className="av-steps">
          <li>Abra este site no <b>Safari</b>.</li>
          <li>Toque em <b>Compartilhar</b> <Share size={15} className="av-ic" /> (o quadrado com a seta, embaixo da tela).</li>
          <li>Role e toque em <b>Adicionar à Tela de Início</b> <PlusSquare size={15} className="av-ic" />, depois em <b>Adicionar</b>.</li>
          <li>Feche o Safari e abra o <b>TPBC</b> pelo ícone novo <Smartphone size={15} className="av-ic" />.</li>
          <li>Volte aqui em <b>Meu espaço → Avisos no celular</b> e toque em <b>Ativar avisos</b>.</li>
        </ol>
      </>}
      {state === "ios-old" && <p className="av-lead">Este iPhone precisa estar no <b>iOS 16.4 ou mais novo</b> para receber avisos. Atualize em Ajustes → Geral → Atualização de Software e tente de novo.</p>}
      {state === "denied" && <>
        <p className="av-lead">Os avisos foram bloqueados neste aparelho. Para liberar:</p>
        <ol className="av-steps">
          <li><b>Android:</b> toque no cadeado ao lado do endereço (ou segure o ícone do TPBC → Informações do app) → <b>Notificações</b> → Permitir.</li>
          <li><b>iPhone:</b> Ajustes → <b>TPBC</b> → Notificações → Permitir.</li>
          <li>Volte aqui e toque em <b>Ativar avisos</b>.</li>
        </ol>
        <button className="btn" onClick={refresh}>Já liberei</button>
      </>}
      {state === "unsupported" && <p className="av-lead">Este navegador não recebe avisos. No Android, abra pelo <b>Chrome</b>; no iPhone, pelo <b>Safari</b> (e adicione à Tela de Início).</p>}
      {msg && <div className="toast">{msg}</div>}
    </div>
  </div>;
}

// Linha em "Meu espaço → Outras opções"
export function AvisosOption() {
  const [state, refresh] = usePushState(), [open, setOpen] = useState(false);
  return <>
    <button onClick={() => setOpen(true)}>
      {state === "on" ? <Bell /> : <BellOff />}
      <span>
        <b>Avisos no celular</b>
        <small>{state === "on" ? "Ativados neste celular" : "Receba os avisos mesmo com o app fechado"}</small>
      </span>
      <ChevronRight />
    </button>
    {open && <AvisosGuide onClose={() => setOpen(false)} onChange={refresh} />}
  </>;
}

// Convite discreto no Início (some quando ativa ou quando a pessoa toca em "Agora não")
export function AvisosHomeCard() {
  const [state, refresh] = usePushState(), [open, setOpen] = useState(false), [hidden, setHidden] = useState(dismissedRecently());
  if (!open && (hidden || !state || state === "on" || state === "unsupported")) return null;
  return <div className="av-card">
    <span className="av-card-icon"><Bell size={18} /></span>
    <span className="av-card-text"><b>Receba os avisos no celular</b><small>Gira nova, turnos, mensalidade e leituras, mesmo com o app fechado.</small></span>
    <span className="av-card-actions">
      <button className="btn primary" onClick={() => setOpen(true)}>Ativar</button>
      <button className="av-later" onClick={() => {
        dismiss();
        setHidden(true);
      }}>Agora não</button>
    </span>
    {open && <AvisosGuide onClose={() => setOpen(false)} onChange={refresh} />}
  </div>;
}
