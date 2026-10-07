// Avisos no celular: detectar o aparelho, pedir permissão e registrar no Supabase.
import { supabase } from "../../lib/supabase.js";

export const VAPID_PUBLIC_KEY = "BOJ17FHI2ZQ9rJBSy-ZkYykf8rApFixOiwwRpiGaRLjM5f0BiypVBPpc7_eDW3p1mAvJGaPDqT0qsAd3fsBqCsk";

const ua = () => (typeof navigator !== "undefined" ? navigator.userAgent || "" : "");
export const isIOS = () => /iPhone|iPad|iPod/i.test(ua()) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
export const iosVersion = () => {
  const m = ua().match(/OS (\d+)_(\d+)/);
  return m ? Number(m[1]) + Number(m[2]) / 100 : null;
};

// Em que situação está este aparelho?
//  "unsupported"  navegador sem avisos
//  "ios-old"      iPhone abaixo do iOS 16.4
//  "ios-install"  iPhone: precisa adicionar à Tela de Início primeiro
//  "denied"       a pessoa bloqueou os avisos
//  "ready"        pode ativar com um toque
//  "on"           já está ativado neste aparelho
export async function pushState() {
  if (isIOS()) {
    const v = iosVersion();
    if (v !== null && v < 16.04) return "ios-old";
    if (!isStandalone()) return "ios-install";
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    if (sub && Notification.permission === "granted") return "on";
  } catch (e) { /* segue */ }
  return "ready";
}

const keyBytes = (b64) => {
  const pad = "=".repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export async function enablePush() {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error(perm === "denied" ? "Os avisos foram bloqueados neste aparelho." : "Você não autorizou os avisos.");
  const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js"));
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
  const j = sub.toJSON();
  const { error } = await supabase.rpc("save_push_subscription", { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_user_agent: ua() });
  if (error) throw error;
  return true;
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && await reg.pushManager.getSubscription();
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}

// Se já está ativado, reenvia para o banco (caso a pessoa tenha trocado de conta no mesmo aparelho).
export async function refreshPushSubscription() {
  try {
    if (!("serviceWorker" in navigator) || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    if (!sub) return;
    const j = sub.toJSON();
    await supabase.rpc("save_push_subscription", { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_user_agent: ua() });
  } catch (e) { /* silencioso */ }
}
