// Tema comemorativo temporário (eleições 2026): vermelho com estrelas até terça, 27/10, 12h.
// Some sozinho no horário, sem precisar publicar de novo.
import "./festa.css";
export const FESTA_ATE = new Date("2026-10-27T12:00:00-03:00");
export const festaAtiva = () => Date.now() < FESTA_ATE.getTime();
if (typeof document !== "undefined" && festaAtiva()) {
  document.documentElement.classList.add("tema-festa");
  const falta = FESTA_ATE.getTime() - Date.now();
  if (falta < 2147483647) setTimeout(() => document.documentElement.classList.remove("tema-festa"), falta);
}
