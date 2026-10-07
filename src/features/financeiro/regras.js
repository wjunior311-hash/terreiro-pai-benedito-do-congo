// Regras do financeiro (quem paga, atraso, itens em aberto) e dados do membro.
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase.js";

export const FIN_DEFAULTS = { monthly_amount: 40, due_day: 20, reminder_days: 5, pix_key: "pixtpbc@gmail.com", pix_holder: "" };

export const ymOf = (d) => {
  const x = d instanceof Date ? d : /* @__PURE__ */ new Date(String(d).slice(0, 10) + "T12:00:00");
  return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0");
};

export const ymAdd = (ym, n) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return ymOf(d);
};

export const ymLabel = (ym, withYear = true) => (/* @__PURE__ */ new Date(ym + "-01T12:00:00")).toLocaleDateString("pt-BR", withYear ? { month: "long", year: "numeric" } : { month: "long" });

export const upperFirst = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;

export function useFinanceSettings() {
  const [s, setS] = useState(FIN_DEFAULTS);
  const reload = async () => {
    const { data } = await supabase.from("finance_settings").select("*").eq("id", 1).maybeSingle();
    if (data) setS({ ...FIN_DEFAULTS, ...data });
  };
  useEffect(() => {
    reload();
  }, []);
  return [s, reload];
}

export function payerMode(p) {
  return p?.is_financial_payer === false ? "never" : p?.financial_start_month ? "from" : "always";
}

export function paysInMonth(p, ym) {
  if (!p || p.is_active === false || p.is_pai_de_santo || p.is_financial_payer === false) return false;
  const start = p.financial_start_month ? String(p.financial_start_month).slice(0, 7) : "";
  if (start && ym < start) return false;
  if (p.date_of_birth) {
    const b = /* @__PURE__ */ new Date(p.date_of_birth + "T12:00:00");
    const adult = ymOf(new Date(b.getFullYear() + 18, b.getMonth(), 1));
    if (ym < adult) return false;
  }
  return true;
}

export function isMonthOverdue(ym, settings, today = /* @__PURE__ */ new Date()) {
  const cur = ymOf(today);
  return ym < cur || ym === cur && today.getDate() >= settings.due_day;
}

export function memberOpenItems(p, dues, charges, proofs, settings, today = /* @__PURE__ */ new Date()) {
  const cur = ymOf(today), items = [], pendingMonthly = {}, pendingExtra = {};
  (proofs || []).filter((x) => x.status === "pending").forEach((x) => {
    if (x.kind === "monthly") pendingMonthly[String(x.reference_month).slice(0, 7)] = x;
    else pendingExtra[x.extra_charge_id] = x;
  });
  const months = new Set((dues || []).filter((d) => d.status === "unpaid").map((d) => String(d.reference_month).slice(0, 7)));
  if (paysInMonth(p, cur) && !(dues || []).some((d) => String(d.reference_month).slice(0, 7) === cur && d.status !== "unpaid")) months.add(cur);
  [...months].filter((m) => m <= cur && paysInMonth(p, m)).sort().forEach((m) => items.push({ key: "m" + m, kind: "monthly", ref: m + "-01", ym: m, description: "Mensalidade de " + ymLabel(m, m.slice(0, 4) !== String(today.getFullYear())), amount: Number(settings.monthly_amount), overdue: isMonthOverdue(m, settings, today), dueText: "vence dia " + settings.due_day + "/" + m.slice(5, 7), proof: pendingMonthly[m] }));
  (charges || []).filter((c) => c.status !== "paid" && c.status !== "not_applicable").forEach((c) => items.push({ key: "e" + c.id, kind: "extra", id: c.id, description: c.description, amount: Number(c.amount), overdue: !!c.due_date && /* @__PURE__ */ new Date(c.due_date + "T23:59:59") < today, dueText: c.due_date ? "vence " + (/* @__PURE__ */ new Date(c.due_date + "T12:00:00")).toLocaleDateString("pt-BR") : "sem vencimento", proof: pendingExtra[c.id] }));
  return items;
}

export async function compressProof(file) {
  if (file.type === "application/pdf") {
    if (file.size > 1.5 * 1024 * 1024) throw new Error("O PDF é grande demais (máx. 1,5 MB). Envie uma foto ou print do comprovante.");
    return { blob: file, ext: "pdf", type: "application/pdf" };
  }
  if (!file.type.startsWith("image/")) throw new Error("Envie uma foto, print ou PDF do comprovante.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, bad) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => bad(new Error("Não foi possível ler a imagem."));
      i.src = url;
    });
    const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.72));
    return { blob, ext: "jpg", type: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function useMemberFinance(p) {
  const [settings] = useFinanceSettings();
  const [data, setData] = useState({ dues: [], charges: [], proofs: [], loaded: false });
  const load = async () => {
    if (!p?.id) return;
    const now = /* @__PURE__ */ new Date();
    if (paysInMonth(p, ymOf(now))) {
      await supabase.rpc("sync_my_monthly_dues", { p_reference_month: ymOf(now) + "-01" });
    }
    const [{ data: d }, { data: c }, { data: pr }] = await Promise.all([supabase.from("monthly_dues").select("reference_month,status").eq("profile_id", p.id), supabase.from("extra_charges").select("id,description,amount,status,due_date,created_at").eq("profile_id", p.id).order("created_at", { ascending: false }), supabase.from("payment_proofs").select("id,kind,reference_month,extra_charge_id,description,amount,status,reject_reason,reviewed_at,member_seen_at,file_path,created_at").eq("profile_id", p.id).order("created_at", { ascending: false }).limit(50)]);
    setData({ dues: d || [], charges: c || [], proofs: pr || [], loaded: true });
  };
  useEffect(() => {
    load();
  }, [p?.id]);
  const items = memberOpenItems(p, data.dues, data.charges, data.proofs, settings);
  const reviewed = data.proofs.filter((x) => x.status !== "pending" && !x.member_seen_at && x.reviewed_at && Date.now() - new Date(x.reviewed_at) < 30 * 864e5);
  return { settings, items, reviewed, reload: load, loaded: data.loaded, dues: data.dues, charges: data.charges, proofs: data.proofs };
}
