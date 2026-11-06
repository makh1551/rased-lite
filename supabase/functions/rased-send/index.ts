// راصد المبسّط – إرسال رسائل واتساب الرسمي (أو SMS احتياطيًا) عبر Bird
// المفتاح السري لا يغادر الخادم. الطلب يُقبل فقط برمز مدرسة ورمز دخول صحيحين وباقة احترافية سارية.
// المتغيرات السرية (تُضبط من لوحة Supabase ← Edge Functions ← Secrets):
//   BIRD_API_KEY       مفتاح Bird (bk_us1_... أو bk_eu1_...) بصلاحية whatsapp:write و sms:write
//   BIRD_WA_FROM       رقم واتساب المرسل المربوط في Bird (+9665...) – اختياري إن استُخدم SMS فقط
//   BIRD_SMS_FROM      اسم المرسل المسجّل للرسائل النصية – اختياري
//   RASED_DAILY_MAX    الحد اليومي لكل مدرسة (افتراضي 150)
// إعداد وتطوير: عبدالمجيد السيد · 0561955430
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

// قوالب واتساب (فئة utility) – تُنشأ وتُعتمد في Bird بهذه الأسماء والمتغيرات
const TPL: Record<string, { slug: string; vars: string[] }> = {
  rem:  { slug: "rased_reminder", vars: ["name", "period", "class", "time", "school"] },
  pre:  { slug: "rased_before",   vars: ["name", "period", "class", "time", "school"] },
  esc:  { slug: "rased_followup", vars: ["name", "period", "class", "time", "school"] },
  rep:  { slug: "rased_day",      vars: ["school", "date", "ok", "late", "bad", "pct"] },
  test: { slug: "rased_test",     vars: ["school"] },
};

function e164(p: string): string {
  let d = String(p || "").replace(/[٠-٩]/g, (x) => String("٠١٢٣٤٥٦٧٨٩".indexOf(x))).replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("05") && d.length === 10) d = "966" + d.slice(1);
  else if (d.startsWith("5") && d.length === 9) d = "966" + d;
  return /^9665\d{8}$/.test(d) ? "+" + d : "";
}
const clip = (v: unknown, n = 60) => String(v ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s{4,}/g, "   ").trim().slice(0, n) || "-";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ err: "method" }, 405);
  let b: any; try { b = await req.json(); } catch { return json({ err: "body" }, 400); }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const code = String(b.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const kind = String(b.kind || "");
  if (!TPL[kind]) return json({ err: "kind" });

  // الصلاحية والباقة
  const { data: role } = await sb.rpc("lite_role", { p_code: code, p_key: String(b.key || "") });
  if (role !== "mgr" && role !== "fol") return json({ err: role || "bad" });
  const { data: sch } = await sb.from("lite_schools").select("plan,plan_until,name").eq("code", code).maybeSingle();
  const today = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
  if (!sch || !["pro", "trial"].includes(sch.plan) || sch.plan_until < today) return json({ err: "plan" });

  const to = e164(b.to); if (!to) return json({ err: "phone" });
  const max = +(Deno.env.get("RASED_DAILY_MAX") || 150);
  const { count } = await sb.from("lite_send_log").select("id", { count: "exact", head: true }).eq("code", code).eq("ok", true).gte("at", today + "T00:00:00+03:00");
  if ((count || 0) >= max) return json({ err: "quota" });
  // منع التكرار: نفس المفتاح لا يُرسل مرتين
  const dkey = clip(b.dkey || "", 120);
  if (dkey !== "-") { const { data: dup } = await sb.from("lite_send_log").select("id").eq("code", code).eq("dkey", dkey).eq("ok", true).limit(1); if (dup && dup.length) return json({ ok: true, dup: true }); }

  const KEY = Deno.env.get("BIRD_API_KEY"); if (!KEY) return json({ err: "not_configured" });
  const host = KEY.startsWith("bk_eu1_") || KEY.startsWith("bm_eu1_") ? "https://eu1.platform.bird.com" : "https://us1.platform.bird.com";
  const H = { Authorization: "Bearer " + KEY, "Content-Type": "application/json" };
  const v = b.vars || {}; v.school = v.school || sch.name;
  const WA = Deno.env.get("BIRD_WA_FROM"), SMS = Deno.env.get("BIRD_SMS_FROM");
  let channel = "", id = "", err = "";

  if (WA) {
    const t = TPL[kind];
    const r = await fetch(host + "/v1/whatsapp/messages", { method: "POST", headers: { ...H, "Idempotency-Key": "rased/" + code + "/" + (dkey !== "-" ? dkey : crypto.randomUUID()) },
      body: JSON.stringify({ to, from: WA, template: { slug: t.slug, language: "ar", components: [{ type: "body", parameters: t.vars.map((n) => ({ type: "text", name: n, text: clip(v[n]) })) }] } }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { channel = "whatsapp"; id = j.id || ""; } else err = j?.code || j?.error?.code || ("WA " + r.status);
  }
  if (!channel && SMS && b.text) {
    const r = await fetch(host + "/v1/sms/messages", { method: "POST", headers: H,
      body: JSON.stringify({ to, from: SMS, category: "transactional", text: String(b.text).slice(0, 600) }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { channel = "sms"; id = j.id || ""; err = ""; } else err = (err ? err + " · " : "") + (j?.code || ("SMS " + r.status));
  }
  if (!channel && !err) err = "no_channel";
  await sb.from("lite_send_log").insert({ code, kind, dkey: dkey === "-" ? null : dkey, to_tail: to.slice(-4), channel: channel || null, ok: !!channel, err: err || null, msg_id: id || null });
  return channel ? json({ ok: true, channel, id }) : json({ err: "send", detail: err });
});
