// Função "enviar-avisos": pega os avisos pendentes da fila e manda para os celulares.
// Configurações (Edge Functions → enviar-avisos → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, PUSH_SECRET
// "Enforce JWT verification" deve ficar DESLIGADO (a função confere o PUSH_SECRET).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE = "https://wjunior311-hash.github.io/terreiro-pai-benedito-do-congo/";

Deno.serve(async (req) => {
  if (req.headers.get("x-push-secret") !== Deno.env.get("PUSH_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  webpush.setVapidDetails("mailto:pixtpbc@gmail.com", Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);

  let total = 0;
  for (let round = 0; round < 5; round++) {
    const { data: jobs, error } = await sb.rpc("push_claim_batch", { p_limit: 300 });
    if (error) return new Response("erro na fila: " + error.message, { status: 500 });
    if (!jobs?.length) break;
    const ids = [...new Set(jobs.map((j: any) => j.profile_id))];
    const { data: subs } = await sb.from("push_subscriptions").select("id,profile_id,endpoint,p256dh,auth").in("profile_id", ids);
    const byProfile: Record<string, any[]> = {};
    (subs || []).forEach((s: any) => (byProfile[s.profile_id] ??= []).push(s));

    await Promise.all(jobs.map(async (job: any) => {
      const list = byProfile[job.profile_id] || [];
      let ok = 0, lastErr: string | null = list.length ? null : "sem celular ativado";
      const payload = JSON.stringify({ title: job.title, body: job.body || "", url: SITE + (job.url || ""), tag: job.tag || undefined });
      for (const s of list) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24, urgency: "normal" });
          ok++;
          await sb.from("push_subscriptions").update({ last_ok_at: new Date().toISOString() }).eq("id", s.id);
        } catch (e: any) {
          lastErr = String(e?.statusCode || "") + " " + String(e?.body || e?.message || e).slice(0, 200);
          // celular desinstalou o app ou desativou os avisos: remove
          if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
      await sb.rpc("push_report", { p_id: job.id, p_devices: ok, p_error: lastErr });
      total += ok;
    }));
    if (jobs.length < 300) break;
  }
  return new Response(JSON.stringify({ enviados: total }), { headers: { "Content-Type": "application/json" } });
});
