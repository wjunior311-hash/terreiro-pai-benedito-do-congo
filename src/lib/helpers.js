// Funções e listas compartilhadas (tipos de gira, entidades, dinheiro, datas, erros).

export const types = { gira: "Gira normal", desenvolvimento: "Desenvolvimento", interna: "Gira interna", festa: "Festa", quintal: "Quintal Ancestral", evento: "Evento do terreiro", reuniao: "Reunião", outra: "Outra atividade" };

export const typeIcons = { gira: "🌿", desenvolvimento: "✨", interna: "🔒", festa: "🎉", quintal: "🌳", evento: "📅", reuniao: "🤝", outra: "○" };

export const entityLines = [["eres", "🧒🏿", "Erês / Crianças"], ["pretos_velhos", "☕", "Pretos-Velhos"], ["caboclos", "🌿", "Caboclos"], ["baianos", "🥁", "Baianos"], ["boiadeiros", "🐎", "Boiadeiros"], ["marinheiros", "⚓", "Marinheiros"], ["ciganos", "💃", "Ciganos"], ["malandros", "🎩", "Malandros"], ["exus", "🔱", "Exus"], ["pombagiras", "🌹", "Pombagiras"], ["exus_mirins", "🔥", "Exus-Mirins"]];

export const lineInfo = (id) => entityLines.find((x) => x[0] === id);

export const typeLabel = (k) => typeIcons[k] + " " + (types[k] || "Gira");

export const kinds = [["ensinamento", "Ensinamentos"], ["reflexao", "Reflexões"], ["senti", "O que senti"]];

export const groups = ["Decoração", "Cozinha", "Comunicação", "Manutenção", "Organização"];

export const money = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const financialEligible = (dob, referenceDate = /* @__PURE__ */ new Date(), isPaiDeSanto = false) => {
  if (isPaiDeSanto) return false;
  if (!dob) return true;
  const birth = /* @__PURE__ */ new Date(dob + "T12:00:00");
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const eighteenth = new Date(birth.getFullYear() + 18, birth.getMonth(), 1);
  return eighteenth <= monthStart;
};

export const dateTime = (s) => new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export const err = (e) => e?.message || "Não foi possível concluir.";

export const newId = () => {
  try {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  } catch (e) {
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : r & 3 | 8).toString(16);
  });
};

export const pad2 = (n) => String(n).padStart(2, "0");

// WhatsApp: mostra o telefone bonito e monta o link wa.me (grátis, abre o WhatsApp de quem clica).
export const phoneDigits = (v) => {
  const d = String(v || "").replace(/\D/g, "");
  if (!d) return "";
  return d.length === 10 || d.length === 11 ? "55" + d : d;
};
export const formatPhone = (v) => {
  const d = phoneDigits(v).replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v || "";
};
export const whatsappLink = (phone, text = "") => {
  const d = phoneDigits(phone);
  return d ? "https://wa.me/" + d + (text ? "?text=" + encodeURIComponent(text) : "") : null;
};
