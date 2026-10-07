// Janela "Como pagar" com chave Pix e envio de comprovante.
import { useState } from "react";
import { Check, X, Upload } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { err, money } from "../../lib/helpers.js";
import { compressProof } from "./regras.js";

export function PayModal({ p, settings, items, onClose, onSent }) {
  const [copied, setCopied] = useState(false),
    [busy, setBusy] = useState(""),
    [msg, setMsg] = useState(""),
    [sent, setSent] = useState({});
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(settings.pix_key);
    } catch (e) {
      const t = document.createElement("textarea");
      t.value = settings.pix_key;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  const total = items.filter((x) => !x.proof && !sent[x.key]).reduce((n, x) => n + x.amount, 0);
  const upload = async (item, file) => {
    if (!file || busy) return;
    setBusy(item.key);
    setMsg("");
    try {
      const { blob, ext, type } = await compressProof(file);
      const path = p.id + "/" + Date.now() + "-" + item.key + "." + ext;
      const { error: ue } = await supabase.storage.from("comprovantes").upload(path, blob, { contentType: type, upsert: false });
      if (ue) throw ue;
      const { error } = await supabase.rpc("submit_payment_proof", { p_kind: item.kind, p_reference_month: item.kind === "monthly" ? item.ref : null, p_extra_charge_id: item.kind === "extra" ? item.id : null, p_file_path: path });
      if (error) {
        await supabase.storage.from("comprovantes").remove([path]);
        throw error;
      }
      if (item.proof?.file_path && item.proof.file_path !== path) supabase.storage.from("comprovantes").remove([item.proof.file_path]);
      setSent((v) => ({ ...v, [item.key]: true }));
      onSent && onSent();
    } catch (e) {
      setMsg(err(e));
    } finally {
      setBusy("");
    }
  };
  return <div className="modal-back" onClick={onClose}>
    <div className="modal fn-pay" role="dialog" aria-modal="true" aria-labelledby="fn-pay-title" onClick={(e) => e.stopPropagation()}>
  <div className="row between">
    <h3 id="fn-pay-title" style={{ margin: 0 }}>Como pagar</h3>
    <button className="btn" onClick={onClose} aria-label="Fechar">
    <X size={15} />
    </button>
    </div>
  {total > 0 && <div className="fn-total"><small>Total em aberto</small><b>{money(total)}</b></div>}
  <div className="fn-pix">
    <small>Chave Pix (e-mail)</small>
    <div className="fn-pix-row">
    <b>{settings.pix_key}</b>
    <button className="btn primary" onClick={copy}>{copied ? <>
    <Check size={14} /> Copiada</> : "Copiar chave"}</button>
    </div>{settings.pix_holder && <small className="muted">Titular: {settings.pix_holder}</small>}</div>
  <ol className="fn-steps">
    <li>Toque em <b>Copiar chave</b> e cole no app do seu banco, na opção Pix.</li>
    <li>Pague o valor exato de cada item abaixo.</li>
    <li>Volte aqui e toque em <b>Já paguei</b> para enviar o comprovante (foto ou print).</li>
    </ol>
  {msg && <div className="gw-warning">{msg}</div>}
  <div className="fn-items">{items.length ? items.map((x) => {
    const done = sent[x.key] || x.proof;
    return <div className={"fn-item" + (x.overdue && !done ? " is-overdue" : "")} key={x.key}>
      <div className="fn-item-text">
      <b>{x.description}</b>
      <small>{money(x.amount)} · {x.overdue && !done ? "em atraso" : x.dueText}</small>
      </div>
   {done ? <span className="fn-chip is-wait">{sent[x.key] ? "Enviado ✓" : "Em análise"}</span> : <label className={"btn" + (busy === x.key ? " is-busy" : "")}>
     <input type="file" accept="image/*,application/pdf" hidden disabled={!!busy} onChange={(e) => {
      upload(x, e.target.files?.[0]);
      e.target.value = "";
    }} />{busy === x.key ? "Enviando…" : <><Upload size={14} /> Já paguei</>}</label>}
   {x.proof && !sent[x.key] && <label className="fn-resend">
     <input type="file" accept="image/*,application/pdf" hidden disabled={!!busy} onChange={(e) => {
      upload(x, e.target.files?.[0]);
      e.target.value = "";
    }} />trocar comprovante</label>}
  </div>;
  }) : <p className="muted">Nenhum pagamento em aberto. Obrigado! 🙏</p>}</div>
  <p className="muted small" style={{ marginTop: 12 }}>Depois do envio, a gestão confere e você é avisado aqui no app.</p>
 </div></div>;
}
