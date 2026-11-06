// راصد المبسّط – خدمة الإرسال من الخادم
// لكل مدرسة مزوّدها الخاص (يضبطه المدير من راصد ← «طريقة إرسال الرسائل»):
//   واتساب عبر بوابة: الواتس المباشر (smart-whats) أو UltraMsg أو Green-API (نص حر من رقم المدرسة)
//   رسائل نصية سعودية: تقنيات أو مسجات أو Unifonic
// واحتياطيًا على مستوى المنصة: Bird (قوالب واتساب الرسمي / SMS) إن ضُبطت أسراره.
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
  morn: { slug: "rased_morning", vars: ["school", "date"] },
  week: { slug: "rased_week",    vars: ["school", "date"] },
  thanks: { slug: "rased_thanks", vars: ["name", "school"] },
  nudge: { slug: "rased_nudge",  vars: ["name", "school"] },
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

  const { data: cf } = await sb.from("lite_send_cfg").select("wa,sms").eq("code", code).maybeSingle();
  const W = (cf && cf.wa) || {}, M = (cf && cf.sms) || {};
  const text = String(b.text || "").slice(0, 1500);
  const digits = to.slice(1);
  const v = b.vars || {}; v.school = v.school || sch.name;
  let channel = "", id = "", err = "";
  const addErr = (e: string) => { err = (err ? err + " · " : "") + e; };

  // 1) واتساب عبر بوابة المدرسة (QR)
  if (text && W.provider === "ultramsg" && W.instance && W.token) {
    try {
      const r = await fetch(`https://api.ultramsg.com/${encodeURIComponent(W.instance)}/messages/chat`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: W.token, to, body: text }).toString() });
      const j: any = await r.json().catch(() => ({}));
      if (r.ok && (j.sent === "true" || j.sent === true)) { channel = "whatsapp"; id = String(j.id || ""); } else addErr("UltraMsg: " + (j.error || j.message || r.status));
    } catch (e) { addErr("UltraMsg: " + e); }
  }
  if (!channel && text && W.provider === "greenapi" && W.instance && W.token) {
    try {
      const base = (W.url || "https://api.green-api.com").replace(/\/+$/, "");
      const r = await fetch(`${base}/waInstance${encodeURIComponent(W.instance)}/sendMessage/${encodeURIComponent(W.token)}`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: digits + "@c.us", message: text }) });
      const j: any = await r.json().catch(() => ({}));
      if (r.ok && j.idMessage) { channel = "whatsapp"; id = String(j.idMessage); } else addErr("Green-API: " + (j.message || r.status));
    } catch (e) { addErr("Green-API: " + e); }
  }
  if (!channel && text && W.provider === "smartwhats" && W.token) {
    try {
      const base = (W.url || "https://wa.smart-whats.com").replace(/\/+$/, "");
      const r = await fetch(`${base}/api/messages`, { method: "POST", headers: { "X-API-Key": W.token, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ phone: digits, message: text, text }) });
      const j: any = await r.json().catch(() => ({}));
      if (r.ok && j.success !== false && !j.error) { channel = "whatsapp"; id = String(j.id || j.message_id || j.data?.id || ""); } else addErr("الواتس المباشر: " + (j.message || j.error || r.status));
    } catch (e) { addErr("الواتس المباشر: " + e); }
  }
  // 2) رسائل نصية عبر مزوّد سعودي للمدرسة
  if (!channel && text && M.provider === "taqnyat" && M.token && M.sender) {
    try {
      const r = await fetch("https://api.taqnyat.sa/v1/messages", { method: "POST", headers: { Authorization: "Bearer " + M.token, "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: [digits], body: text, sender: M.sender }) });
      const j: any = await r.json().catch(() => ({}));
      if (r.status === 201 || j.statusCode === 201) { channel = "sms"; id = String(j.messageId || ""); } else addErr("Taqnyat: " + (j.message || r.status));
    } catch (e) { addErr("Taqnyat: " + e); }
  }
  if (!channel && text && M.provider === "msegat" && M.user && M.token && M.sender) {
    try {
      const r = await fetch("https://www.msegat.com/gw/sendsms.php", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: M.user, numbers: digits, userSender: M.sender, apiKey: M.token, msg: text, msgEncoding: "UTF8" }) });
      const j: any = await r.json().catch(() => ({}));
      if (String(j.code) === "1" || String(j.code) === "M0000") { channel = "sms"; } else addErr("Msegat: " + (j.message || j.code || r.status));
    } catch (e) { addErr("Msegat: " + e); }
  }
  if (!channel && text && M.provider === "unifonic" && M.token && M.sender) {
    try {
      const r = await fetch("https://el.cloud.unifonic.com/rest/SMS/messages", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ AppSid: M.token, SenderID: M.sender, Body: text, Recipient: digits }).toString() });
      const j: any = await r.json().catch(() => ({}));
      if (j.success === true || j.success === "true") { channel = "sms"; id = String(j.data?.MessageID || ""); } else addErr("Unifonic: " + (j.message || j.errorCode || r.status));
    } catch (e) { addErr("Unifonic: " + e); }
  }

  // 3) احتياطي المنصة: Bird (إن ضُبطت أسراره)
  const KEY = Deno.env.get("BIRD_API_KEY");
  const host = KEY && (KEY.startsWith("bk_eu1_") || KEY.startsWith("bm_eu1_")) ? "https://eu1.platform.bird.com" : "https://us1.platform.bird.com";
  const H = { Authorization: "Bearer " + KEY, "Content-Type": "application/json" };
  const WA = KEY && Deno.env.get("BIRD_WA_FROM"), SMS = KEY && Deno.env.get("BIRD_SMS_FROM");
  if (!channel && !W.provider && !M.provider && !KEY) return json({ err: "not_configured" });

  if (!channel && WA) {
    const t = TPL[kind];
    const r = await fetch(host + "/v1/whatsapp/messages", { method: "POST", headers: { ...H, "Idempotency-Key": "rased/" + code + "/" + (dkey !== "-" ? dkey : crypto.randomUUID()) },
      body: JSON.stringify({ to, from: WA, template: { slug: t.slug, language: "ar", components: [{ type: "body", parameters: t.vars.map((n) => ({ type: "text", name: n, text: clip(v[n]) })) }] } }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { channel = "whatsapp"; id = j.id || ""; } else addErr("Bird WA: " + (j?.code || j?.error?.code || r.status));
  }
  if (!channel && SMS && text) {
    const r = await fetch(host + "/v1/sms/messages", { method: "POST", headers: H,
      body: JSON.stringify({ to, from: SMS, category: "transactional", text: text.slice(0, 600) }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { channel = "sms"; id = j.id || ""; } else addErr("Bird SMS: " + (j?.code || r.status));
  }
  if (!channel && !err) err = "no_channel";
  await sb.from("lite_send_log").insert({ code, kind, dkey: dkey === "-" ? null : dkey, to_tail: to.slice(-4), channel: channel || null, ok: !!channel, err: channel ? null : (err || null), msg_id: id || null });
  return channel ? json({ ok: true, channel, id }) : json({ err: "send", detail: err });
});
