// Cartão visual da gira (agenda, início e gestão).
import { useEffect, useState } from "react";
import { CalendarDays, Check, X, ChevronRight } from "lucide-react";
import { dateTime, lineInfo, typeLabel } from "../lib/helpers.js";

export function UnifiedGiraCard({ g, mode = "agenda", onOpen, resp, answer, showGiraDescription, setShowGiraDescription }) {
  const cover = useReadableCover(g.art_path, g.cover_color || "#65745a");
  const d = new Date(g.starts_at);
  const style = { "--gira-cover-image": g.art_path ? 'url("' + g.art_path + '")' : "none", "--gira-cover-color": g.cover_color || "#65745a", "--gira-text-color": cover.color, "--gira-cover-overlay": cover.overlay };
  const dateBlock = <div className="unified-gira-date">
    <span className="unified-gira-day">{String(d.getDate()).padStart(2, "0")}</span>
    <span className="unified-gira-month">{d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase()}</span>
    <span className="unified-gira-time">{d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
    </div>;
  const content = <div className="unified-gira-visual">
    <div className="unified-gira-overlay" />
    <div className="unified-gira-info">
    <div className="unified-gira-topline">
    <span className="activity-tag">{typeLabel(g.activity_type)}</span>{mode === "home" && <span className="unified-gira-next">PRÓXIMA</span>}</div>
    <h3>{g.name}</h3>
    <p className="unified-gira-meta">
    <CalendarDays size={14} />{dateTime(g.starts_at)}</p>{g.entity_lines?.length > 0 && <div className="unified-gira-chips">{g.entity_lines.map((id) => {
    const x = lineInfo(id);
    return x ? <span className="unified-gira-chip" key={id}>{x[1]} {x[2]}</span> : null;
  })}</div>}<div className="unified-gira-footer">
    <span>{g.use_task_list ? "✓ Agenda de tarefas" : "Sem agenda de tarefas"}</span>{onOpen && <ChevronRight size={19} />}</div>
    </div>
    </div>;
  const card = <div className={"unified-gira-card unified-gira-" + mode + (g.art_path ? " has-cover" : " no-cover")} style={style}>{dateBlock}{content}</div>;
  if (mode === "home") return <div className="unified-gira-home-wrap">{card}<div className="unified-gira-presence">
    <strong>Você vai?</strong>
    <div className="choice">
    <button className={"btn " + (resp?.status === "going" ? "primary is-selected" : "")} onClick={() => answer("going")}>
    <Check size={15} />{resp?.status === "going" ? "Confirmado" : "Vou participar"}</button>
    <button className={"btn " + (resp?.status === "not_going" ? "is-selected not-going" : "")} onClick={() => answer("not_going")}>
    <X size={15} />{resp?.status === "not_going" ? "Não vou participar" : "Não vou"}</button>
    </div>{resp?.status && <span className="unified-gira-presence-status">✓ {resp.status === "going" ? "Presença confirmada" : "Você marcou que não vai"}</span>}</div>
    </div>;
  if (onOpen) return <button type="button" className="unified-gira-clickable" onClick={() => onOpen(g)}>{card}</button>;
  return card;
}

export function HomeNextGira({ gira, resp, answer, showGiraDescription, setShowGiraDescription }) {
  return <UnifiedGiraCard g={gira} mode="home" resp={resp} answer={answer} showGiraDescription={showGiraDescription} setShowGiraDescription={setShowGiraDescription} />;
}

export function useReadableCover(url, fallback = "#65745a") {
  const [style, setStyle] = useState({ color: "#fff", overlay: "rgba(22,28,21,.62)" });
  useEffect(() => {
    let active = true;
    const hexLuma = (v) => {
      const h = (v || fallback).replace("#", "");
      if (h.length !== 6) return 0.45;
      const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
      const f = (x) => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const apply = (l) => {
      const dark = l > 0.58;
      if (active) setStyle({ color: dark ? "#273128" : "#fff", overlay: dark ? "rgba(255,250,241,.48)" : "rgba(20,26,20,.58)" });
    };
    if (!url) {
      const l = hexLuma(fallback);
      if (active) setStyle({ color: l > 0.58 ? "#273128" : "#fff", overlay: "transparent" });
      return () => {
        active = false;
      };
    }
    ;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas"), ctx = c.getContext("2d", { willReadFrequently: true });
        c.width = 24;
        c.height = 24;
        ctx.drawImage(img, 0, 0, 24, 24);
        const px = ctx.getImageData(0, 0, 24, 24).data;
        let sum = 0, n = 0;
        for (let i = 0; i < px.length; i += 16) {
          const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
          const f = (x) => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
          sum += 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
          n++;
        }
        apply(sum / n);
      } catch (e) {
        apply(0.35);
      }
    };
    img.onerror = () => apply(0.35);
    img.src = url;
    return () => {
      active = false;
    };
  }, [url, fallback]);
  return style;
}

export function GiraAgendaCard({ g, onOpen }) {
  return <UnifiedGiraCard g={g} mode="agenda" onOpen={onOpen} />;
}
