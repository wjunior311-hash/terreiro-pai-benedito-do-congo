// Gestão → Comunicação → Interessados: quem deixou o contato no site ("Quer saber das próximas giras?")
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { err, whatsappLink } from "../../lib/helpers.js";

const tel = (t) => { const x = String(t || ""); return x.length === 11 ? "(" + x.slice(0, 2) + ") " + x.slice(2, 7) + "-" + x.slice(7) : x.length === 10 ? "(" + x.slice(0, 2) + ") " + x.slice(2, 6) + "-" + x.slice(6) : x; };

export function GestaoInteressados() {
  const [rows, setRows] = useState(null), [msg, setMsg] = useState("");
  useEffect(() => { supabase.rpc("admin_public_interest").then(({ data, error }) => { if (error) setMsg(err(error)); setRows(data || []); }); }, []);
  const baixar = () => {
    const linhas = [["Nome", "WhatsApp", "Deixou o contato em"], ...(rows || []).map((r) => [r.name, tel(r.phone), new Date(r.created_at).toLocaleDateString("pt-BR")])];
    const csv = "﻿" + linhas.map((l) => l.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "interessados-site.csv";
    document.body.appendChild(a); a.click(); a.remove();
  };
  return <div className="la-adm">
    <div className="la-head"><span className="eyebrow">SITE ABERTO</span><h3>Interessados</h3><p className="muted small">Quem deixou nome e WhatsApp no site para ser avisado das próximas giras.</p></div>
    {msg && <div className="gw-warning">{msg}</div>}
    {!rows ? <div className="hm-skeleton" /> : !rows.length ? <div className="mu-empty">Ninguém deixou o contato ainda.</div> : <>
      <div className="in-resumo" style={{ gridTemplateColumns: "1fr" }}><div><b>{rows.length}</b><small>{rows.length === 1 ? "pessoa interessada" : "pessoas interessadas"}</small></div></div>
      <button className="btn primary la-baixar" onClick={baixar}>Baixar planilha ({rows.length})</button>
      <div className="cw-adm-opt"><ul>{rows.map((r) => <li key={r.id}><span style={{ flex: 1 }}>{r.name}<small> · {tel(r.phone)} · {new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</small></span><a className="cw-wa" href={whatsappLink(r.phone.length <= 11 ? "55" + r.phone : r.phone, "Axé, " + r.name.split(" ")[0] + "! 🙏🏾 Aqui é do Terreiro Pai Benedito do Congo.")} target="_blank" rel="noreferrer">WhatsApp</a></li>)}</ul></div>
    </>}
  </div>;
}
