// Lista de acesso de eventos: quem pagou envia nome completo + RG; a gestão baixa a planilha.
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase, APP_URL } from "../../lib/supabase.js";
import { err, whatsappLink } from "../../lib/helpers.js";
import { OrixaIcon } from "../../orixaSymbols.jsx";

export function useAccessDocs() {
  const [rows, setRows] = useState([]);
  const load = async () => {
    const { data } = await supabase.rpc("my_access_docs");
    setRows(Array.isArray(data) ? data : []);
  };
  useEffect(() => { load(); }, []);
  return [rows, load];
}

export function AccessDocModal({ item, onClose, onSaved }) {
  const [nome, setNome] = useState(item.full_name || ""), [rg, setRg] = useState(""), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const salvar = async () => {
    setBusy(true); setMsg("");
    const { error } = await supabase.rpc("save_access_doc", { p_gira: item.gira_id, p_full_name: nome, p_rg: rg });
    setBusy(false);
    if (error) return setMsg(err(error));
    onSaved();
  };
  return <div className="modal-back" onClick={onClose}>
    <div className="modal la-modal" role="dialog" aria-modal="true" aria-labelledby="la-title" onClick={(e) => e.stopPropagation()}>
      <div className="row between">
        <h3 id="la-title" style={{ margin: 0 }}>Lista de acesso</h3>
        <button className="btn" onClick={onClose} aria-label="Fechar"><X size={15} /></button>
      </div>
      <p className="muted small">{item.gira}: o local pede a lista com nome completo e RG de quem vai. Só a gestão da casa vê esses dados, e o RG é apagado depois do evento.</p>
      <label className="la-field">Nome completo
        <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" placeholder="Como está no documento" />
      </label>
      <label className="la-field">RG
        <input className="input" value={rg} onChange={(e) => setRg(e.target.value)} inputMode="text" placeholder="Ex.: 12.345.678-9" />
      </label>
      {msg && <div className="gw-warning">{msg}</div>}
      <button className="btn primary la-send" disabled={busy || !nome.trim() || !rg.trim()} onClick={salvar}>{busy ? "Enviando…" : "Enviar meus dados"}</button>
    </div>
  </div>;
}

const dataBR = (iso) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

export function GestaoListaAcesso() {
  const [giras, setGiras] = useState(null), [sel, setSel] = useState(""), [rows, setRows] = useState(null), [msg, setMsg] = useState("");
  useEffect(() => {
    supabase.rpc("admin_access_doc_giras").then(({ data, error }) => {
      if (error) setMsg(err(error));
      const g = Array.isArray(data) ? data : [];
      setGiras(g);
      if (g[0]) setSel(g[0].id);
    });
  }, []);
  useEffect(() => {
    if (!sel) return;
    setRows(null);
    supabase.rpc("admin_access_docs", { p_gira: sel }).then(({ data, error }) => { if (error) setMsg(err(error)); setRows(data || []); });
  }, [sel]);
  if (!giras) return <div className="hm-skeleton" style={{ marginTop: 14 }} />;
  if (!giras.length) return <div className="mu-empty">Nenhum evento pedindo lista de acesso.</div>;
  const g = giras.find((x) => x.id === sel);
  const enviados = (rows || []).filter((r) => r.full_name), faltam = (rows || []).filter((r) => !r.full_name);
  const baixar = () => {
    const linhas = [["Nº", "Nome completo", "RG"]];
    enviados.slice().sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR")).forEach((r, i) => linhas.push([i + 1, r.full_name, r.rg || ""]));
    const csv = "﻿" + linhas.map((l) => l.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "lista-de-acesso-" + (g?.name || "evento").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-") + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
  };
  return <div className="la-adm">
    {giras.length > 1 && <select className="select" value={sel} onChange={(e) => setSel(e.target.value)}>{giras.map((x) => <option key={x.id} value={x.id}>{x.name} · {dataBR(x.starts_at)}</option>)}</select>}
    <div className="la-head">
      <div><span className="eyebrow">LISTA DE ACESSO</span><h3>{g?.name}</h3><p className="muted small">Quem pagou envia nome completo e RG pelo app. Os RGs são apagados 1 dia depois do evento.</p></div>
    </div>
    {msg && <div className="gw-warning">{msg}</div>}
    {!rows ? <div className="hm-skeleton" /> : <>
      <div className="in-resumo">
        <div><b>{rows.length}</b><small>pagaram</small></div>
        <div><b>{enviados.length}</b><small>enviaram</small></div>
        <div><b>{faltam.length}</b><small>faltam</small></div>
      </div>
      <button className="btn primary la-baixar" disabled={!enviados.length} onClick={baixar}>Baixar planilha ({enviados.length})</button>
      {faltam.length > 0 && <details className="cw-adm-opt is-falta" open>
        <summary>Ainda não enviaram <b>{faltam.length}</b></summary>
        <ul>{faltam.map((r) => {
          const wa = r.phone && whatsappLink(r.phone, "Axé, " + (r.name || "").split(" ")[0] + "! 🙏🏾 Para a lista de acesso da " + g?.name + ", falta você enviar seu nome completo e RG pelo app. É rapidinho, aparece no Início: " + APP_URL);
          return <li key={r.profile_id}><OrixaIcon name={r.orixa_symbol} size={20} /> {r.name}{wa && <a className="cw-wa" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}</li>;
        })}</ul>
      </details>}
      {enviados.length > 0 && <details className="cw-adm-opt">
        <summary>Já enviaram <b>{enviados.length}</b></summary>
        <ul>{enviados.map((r) => <li key={r.profile_id}><OrixaIcon name={r.orixa_symbol} size={20} /> {r.full_name}<small> · RG {r.rg || "apagado"}</small></li>)}</ul>
      </details>}
    </>}
  </div>;
}
