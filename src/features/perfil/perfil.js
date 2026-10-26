// Meu espaço personalizado — liga sozinho na quarta, 28/10/2026, à 0h.
// Antes disso dá para ver a prévia abrindo o app com ?previa-perfil (fica guardado neste aparelho).
export const NOVO_MEU_ESPACO_DESDE = new Date("2026-10-28T00:00:00-03:00");
try {
  const q = new URLSearchParams(window.location.search);
  if (q.has("previa-perfil")) localStorage.setItem("tpbc-previa-perfil", q.get("previa-perfil") === "0" ? "" : "1");
} catch (e) { /* ok */ }
export const novoMeuEspaco = () => {
  if (Date.now() >= NOVO_MEU_ESPACO_DESDE.getTime()) return true;
  try { return localStorage.getItem("tpbc-previa-perfil") === "1"; } catch (e) { return false; }
};

// cor de destaque escolhida pela pessoa (paleta inspirada nas cores dos Orixás)
export const CORES_PERFIL = [["", "Da casa"], ["#a8741a", "Dourado"], ["#2b6cb0", "Azul"], ["#3f7a5a", "Verde"], ["#c8102e", "Vermelho"], ["#7b3fa0", "Roxo"], ["#1d3d6b", "Azul-marinho"], ["#c4573a", "Terracota"], ["#352f28", "Terra escura"]];
