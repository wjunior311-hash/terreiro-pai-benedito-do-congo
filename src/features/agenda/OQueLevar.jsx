// "O que vou levar": lista de itens da gira (ex.: café coletivo). Cada pessoa escolhe N itens.
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { err } from "../../lib/helpers.js";

export function OQueLevar({ gira, going }) {
  const [itens, setItens] = useState(null), [busy, setBusy] = useState(""), [msg, setMsg] = useState("");
  const max = gira.bring_per_person || 0;
  const carregar = () => supabase.rpc("gira_bring_list", { p_gira: gira.id }).then(({ data }) => setItens(Array.isArray(data) ? data : []));
  useEffect(() => { carregar(); }, [gira.id]);
  if (!itens || !itens.length) return null;
  const meus = itens.filter((i) => i.mine).length;
  const completo = max > 0 && meus >= max;
  const tocar = async (i) => {
    setBusy(i.id); setMsg("");
    const { error } = await supabase.rpc("gira_bring_toggle", { p_item: i.id, p_take: !i.mine });
    setBusy("");
    if (error) setMsg(err(error));
    carregar();
  };
  const grupos = [];
  itens.forEach((i) => { let g = grupos.find((x) => x.nome === i.category); if (!g) grupos.push(g = { nome: i.category, itens: [] }); g.itens.push(i); });
  const faltam = itens.reduce((n, i) => n + Math.max(0, i.slots - i.taken), 0);
  return <div className="card ol-card" id="o-que-levar">
    <span className="eyebrow">O QUE VOU LEVAR</span>
    <h3>Cada um traz um pouquinho</h3>
    {max > 0 && <div className={"ol-regra" + (completo ? " is-ok" : "")}>
      {completo ? <b>✅ Pronto! Você escolheu seus {max} itens.</b> : <b>Cada pessoa escolhe {max} itens para levar.</b>}
      <small>{completo ? "Para trocar, toque em um dos seus itens para desmarcar e escolha outro." : going ? "Você escolheu " + meus + " de " + max + ". Quem não escolher, combina com a gestão uma contribuição para o almoço." : "Confirme sua presença para escolher. Quem não escolher, combina com a gestão uma contribuição para o almoço."}</small>
    </div>}
    {msg && <div className="gw-warning">{msg}</div>}
    {grupos.map((g) => <div className="ol-grupo" key={g.nome}>
      {g.nome && <div className="ol-grupo-t">{g.nome}</div>}
      {g.itens.map((i) => {
        const cheio = i.taken >= i.slots && !i.mine;
        const bloqueado = !going || cheio || (completo && !i.mine);
        return <div className={"ol-item" + (i.mine ? " is-mine" : "") + (i.taken >= i.slots ? " is-full" : "")} key={i.id}>
          <div className="ol-txt">
            <b>{i.name}</b>
            <small>{i.portion}{i.portion ? " · " : ""}{i.taken >= i.slots ? "completo" : i.taken + " de " + i.slots + (i.slots === 1 ? " pessoa" : " pessoas")}</small>
            {(i.mine || i.who.length > 0) && <small className="ol-who">👤 {[...(i.mine ? ["Você"] : []), ...i.who].join(", ")}</small>}
          </div>
          <button className={"btn " + (i.mine ? "" : "primary")} disabled={busy === i.id || (!i.mine && bloqueado)} onClick={() => tocar(i)}>{i.mine ? "Desmarcar" : cheio ? "Completo" : "Eu levo"}</button>
        </div>;
      })}
    </div>)}
    {faltam > 0 && <p className="muted small ol-falta">Ainda faltam {faltam} {faltam === 1 ? "lugar" : "lugares"} na lista.</p>}
  </div>;
}
