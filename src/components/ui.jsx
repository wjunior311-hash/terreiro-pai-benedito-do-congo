// Componentes pequenos reutilizados em várias telas.
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

export function Shortcut({ icon: Icon, text, onClick }) {
  return <button className="shortcut" onClick={onClick}><Icon /><b>{text}</b></button>;
}

export function Notice() {
  const [n, setN] = useState(null);
  useEffect(() => {
    supabase.from("notices").select("*").eq("published", true).order("starts_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => setN(data));
  }, []);
  return n ? <div className="card notice">
    <span className="eyebrow">AVISO DA CASA</span>
    <b>{n.title}</b>
    <p>{n.body}</p>
    </div> : null;
}

export const FieldError = ({ msg }) => msg ? <p className="gw-field-error" role="alert">{msg}</p> : null;
