// Regras de texto dos conteúdos (limpeza do HTML, resumo, tempo de leitura).

export const CONTENT_TAGS = ["Banhos", "Ensinamentos", "Recados dos Pais da Casa", "Macumbas de Terreiro"];

export const CONTENT_COLORS = ["#65745A", "#8B6F47", "#A65D4A", "#8A6A8F", "#55758A", "#B78A3D", "#7B5B45", "#6F7F76"];

export const CONTENT_EMOJIS = ["🙏", "🌿", "✨", "🕯️", "🌸", "💧", "🔥", "🌙", "☀️", "⭐", "❤️", "🤍", "🌊", "🍃", "🪶", "📿", "🥁", "⚠️", "📌", "✅"];

export const ALLOWED_TAGS = { P: 1, BR: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, H2: 1, H3: 1, UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, A: 1, DIV: 1, SPAN: 1 };

export function sanitizeContentHtml(html) {
  const src = String(html || "");
  if (!/<[a-z][\s\S]*>/i.test(src)) return src.split(/\n\n+/).map((x) => "<p>" + x.replace(/&/g, "&amp;").replace(/</g, "&lt;").split("\n").join("<br>") + "</p>").join("");
  const box = document.createElement("div");
  box.innerHTML = src;
  const walk = (node) => {
    [...node.childNodes].forEach((ch) => {
      if (ch.nodeType === 1) {
        if (!ALLOWED_TAGS[ch.tagName]) {
          if (["SCRIPT", "STYLE", "IFRAME", "OBJECT"].includes(ch.tagName)) {
            ch.remove();
            return;
          }
          walk(ch);
          ch.replaceWith(...ch.childNodes);
          return;
        }
        const href = ch.tagName === "A" ? ch.getAttribute("href") : null;
        [...ch.attributes].forEach((a) => ch.removeAttribute(a.name));
        if (ch.tagName === "DIV") {
          const p = document.createElement("p");
          p.append(...ch.childNodes);
          ch.replaceWith(p);
          walk(p);
          return;
        }
        if (ch.tagName === "A") {
          if (href && /^https?:\/\//i.test(href)) {
            ch.setAttribute("href", href);
            ch.setAttribute("target", "_blank");
            ch.setAttribute("rel", "noopener noreferrer");
          } else {
            ch.replaceWith(...ch.childNodes);
            return;
          }
        }
        walk(ch);
      } else if (ch.nodeType !== 3) ch.remove();
    });
  };
  walk(box);
  return box.innerHTML;
}

export const contentPlain = (html) => {
  const d = document.createElement("div");
  d.innerHTML = sanitizeContentHtml(html).replace(/<\/(p|h2|h3|li|blockquote)>/g, "</$1> ").replace(/<br>/g, " ");
  return String(d.textContent || "").replace(/\s+/g, " ").trim();
};

export const readingMinutes = (html) => Math.max(1, Math.round(contentPlain(html).split(" ").filter(Boolean).length / 200));

export const contentSummary = (x) => x.summary?.trim() || ((t) => t.length > 140 ? t.slice(0, 140).trim() + "…" : t)(contentPlain(x.body));

export const coverStyle = (x) => x.cover_url ? { backgroundImage: 'url("' + x.cover_url + '")' } : { background: x.cover_color || "#65745A" };

// Conteúdo "em abas": cada Título (H2) vira um botão. O que vem antes do
// primeiro título é a abertura, mostrada sempre.
export function splitContentTabs(html) {
  const box = document.createElement("div");
  box.innerHTML = sanitizeContentHtml(html);
  const intro = document.createElement("div");
  const tabs = [];
  [...box.childNodes].forEach((n) => {
    if (n.nodeType === 1 && n.tagName === "H2") {
      tabs.push({ title: (n.textContent || "").trim() || "Parte " + (tabs.length + 1), box: document.createElement("div") });
      return;
    }
    (tabs.length ? tabs[tabs.length - 1].box : intro).appendChild(n.cloneNode(true));
  });
  return { intro: intro.innerHTML.trim(), tabs: tabs.map((t) => ({ title: t.title, html: t.box.innerHTML })) };
}

export const isDraft = (x) => Boolean(x?.is_draft);
