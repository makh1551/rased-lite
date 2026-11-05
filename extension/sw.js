/* راصد الآلي – الجدولة والفحص (Service Worker)
   إعداد وتطوير: عبدالمجيد السيد · 0561955430 */
const OFF = [3, 7, 18];        // الفحوص: بعد 3 ثم 7 ثم 18 دقيقة من بداية الحصة
const PRE_MIN = 10;            // فحص الروابط قبل الحصة بعشر دقائق
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const wdOf = s => { const [a, b, c] = s.split('-').map(Number); const g = new Date(a, b - 1, c).getDay(); return g <= 4 ? g : -1; };
const atTime = (date, t, add) => { const [a, b, c] = date.split('-').map(Number); const [h, m] = t.split(':').map(Number); return new Date(a, b - 1, c, h, m + add, 0).getTime(); };
const mk = (d, p, c) => `${d}|${p}|${c}`;
const getCfg = async () => (await chrome.storage.local.get('cfg')).cfg;
const notify = (id, title, message) => chrome.notifications.create(id, { type: 'basic', iconUrl: 'icon128.png', priority: 2, title, message });

function plan(cfg, date) {
  const d = wdOf(date); if (d < 0 || !cfg) return [];
  const sk = new Set((cfg.auto && cfg.auto.sk) || []); const out = [];
  for (let p = 1; p <= 7; p++) {
    if (sk.has(d + '-' + p)) continue;
    const rows = cfg.rows.filter(r => r.d === d && r.p === p); const t = cfg.times[p - 1];
    if (!rows.length || !t) continue;
    out.push({ p, rows, linked: rows.filter(r => r.l), start: atTime(date, t[0], 0), end: atTime(date, t[1], 0) });
  }
  return out;
}

/* ---------- الجدولة ---------- */
async function schedule() {
  const all = await chrome.alarms.getAll();
  await Promise.all(all.filter(a => /^(chk|pre)\|/.test(a.name)).map(a => chrome.alarms.clear(a.name)));
  chrome.alarms.create('tick', { periodInMinutes: 30 });
  chrome.alarms.create('watch', { periodInMinutes: 5 });
  chrome.alarms.create('upd', { periodInMinutes: 360 });
  prune();
  const cfg = await getCfg();
  if (cfg && cfg.auto && cfg.auto.on) {
    const date = ymd(new Date()), now = Date.now();
    for (const P of plan(cfg, date)) {
      if (!P.linked.length) continue;
      OFF.forEach((o, i) => { const w = P.start + o * 60e3; if (w > now) chrome.alarms.create(`chk|${date}|${P.p}|${i + 1}`, { when: w }); });
      const w = P.start - PRE_MIN * 60e3; if (w > now) chrome.alarms.create(`pre|${date}|${P.p}`, { when: w });
    }
  }
  watch();
}
chrome.runtime.onInstalled.addListener(() => { schedule(); openApp(); checkUpdate(); });
chrome.runtime.onStartup.addListener(() => { schedule(); checkUpdate(); });
chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.cfg) schedule(); });
chrome.alarms.onAlarm.addListener(a => {
  if (a.name === 'tick') return schedule();
  if (a.name === 'watch') return watch();
  if (a.name === 'upd') return checkUpdate();
  const [kind, date, p, n] = a.name.split('|');
  if (kind === 'chk') enqueue({ date, p: +p, n: +n });
  if (kind === 'pre') enqueue({ pre: true, date, p: +p });
});
chrome.action.onClicked.addListener(() => openApp());
chrome.notifications.onClicked.addListener(() => openApp());
chrome.runtime.onMessage.addListener((m, s, send) => {
  if (!m) return;
  if (m.cmd === 'runNow') { enqueue({ date: m.date, p: +m.p, force: true }); send({ ok: 1 }); }
  if (m.cmd === 'test') { enqueue({ test: true, link: m.link, teacher: m.teacher }); send({ ok: 1 }); }
});

async function openApp() {
  const url = chrome.runtime.getURL('app.html');
  const tabs = (await chrome.tabs.query({})).filter(t => (t.url || '').startsWith(url));
  if (tabs[0]) { await chrome.tabs.update(tabs[0].id, { active: true }); chrome.windows.update(tabs[0].windowId, { focused: true }); }
  else chrome.tabs.create({ url });
}
async function prune() {
  if (!chrome.storage.local.getKeys) return;
  const keys = await chrome.storage.local.getKeys();
  const lim = ymd(new Date(Date.now() - 45 * 864e5));
  const old = keys.filter(k => /^(res|img|pre):/.test(k) && k.slice(4, 14) < lim);
  if (old.length) chrome.storage.local.remove(old);
}

/* ---------- التحديثات من GitHub ---------- */
const UPD_URL = 'https://makh1551.github.io/rased-lite/version.json';
const newer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
async function checkUpdate() {
  try {
    const v = await (await fetch(UPD_URL + '?t=' + Date.now(), { cache: 'no-store' })).json();
    const cur = chrome.runtime.getManifest().version;
    if (v && v.version && newer(v.version, cur)) {
      const { upd } = await chrome.storage.local.get('upd');
      await chrome.storage.local.set({ upd: { ...v, current: cur, checked: hm(new Date()) } });
      if (!upd || upd.version !== v.version) notify('upd|' + v.version, `راصد · تحديث جديد ${v.version}`, (v.notes || 'نسخة جديدة متاحة') + ' – افتح راصد للتحديث.');
    } else await chrome.storage.local.remove('upd');
  } catch (e) { }
}

/* ---------- المراقبة: منع النوم + الفحص التعويضي + تنبيه الأعطال ---------- */
async function watch() {
  const cfg = await getCfg(); const date = ymd(new Date()); const now = Date.now();
  const on = !!(cfg && cfg.auto && cfg.auto.on); const P = on ? plan(cfg, date) : [];
  try {
    if (P.length && now >= P[0].start - 15 * 60e3 && now <= P[P.length - 1].end + 25 * 60e3) chrome.power.requestKeepAwake('display');
    else chrome.power.releaseKeepAwake();
  } catch (e) { }
  if (!P.length) return;
  const key = 'res:' + date; const res = (await chrome.storage.local.get(key))[key] || {};
  const { missN = [] } = await chrome.storage.session.get('missN'); let changed = false;
  for (const x of P) {
    if (!x.linked.length || now < x.start + (OFF[0] + 6) * 60e3) continue;
    if (queued.has(date + '|' + x.p)) continue;
    if (x.linked.some(r => res[mk(date, x.p, r.c)])) continue;
    const id = date + '|' + x.p; if (missN.includes(id)) continue;
    missN.push(id); changed = true;
    const inTime = now < x.end;
    notify('miss|' + id, `راصد · الحصة ${x.p} لم تُفحص في موعدها`,
      inTime ? 'بدأ فحص تعويضي الآن. تأكد أن الجهاز لا ينام وأن Teams مسجّل الدخول.' : 'انتهت الحصة دون فحص. تأكد أن الجهاز والمتصفح يعملان وقت الدوام.');
    if (inTime) enqueue({ date, p: x.p, force: true });
  }
  if (changed) await chrome.storage.session.set({ missN });
}

/* ---------- الطابور ---------- */
let chain = Promise.resolve(), busy = 0, ka = null; const queued = new Set();
function enqueue(job) {
  const qk = job.test ? 'test' : `${job.date}|${job.p}${job.pre ? '|pre' : ''}`;
  busy++; queued.add(qk); keepAlive();
  chain = chain.then(() => job.test ? runTest(job) : job.pre ? runPre(job) : runCheck(job))
    .catch(e => console.warn('راصد', e)).finally(() => { busy--; queued.delete(qk); });
}
function keepAlive() {
  if (ka) return;
  ka = setInterval(() => { if (busy <= 0) { clearInterval(ka); ka = null; return; } chrome.runtime.getPlatformInfo(); }, 20000);
}

async function runCheck({ date, p, n, force }) {
  const cfg = await getCfg(); if (!cfg) return;
  if (!force && !(cfg.auto && cfg.auto.on)) return;
  const d = wdOf(date); if (d < 0) return;
  const rows = cfg.rows.filter(r => r.d === d && r.p === p && r.l);
  const key = 'res:' + date;
  for (const r of rows) {
    const k = mk(date, p, r.c);
    let res = (await chrome.storage.local.get(key))[key] || {};
    let x = res[k];
    if (x && x.final) continue;
    const nn = force ? ((x && x.checks ? x.checks.length : 0) + 1) : n;
    if (nn > 3 || (x && x.checks.some(c => c.n === nn))) continue;

    const out = await checkOne(r, date, p, nn);

    res = (await chrome.storage.local.get(key))[key] || {};
    x = res[k] || { checks: [] }; x.t = r.t;
    x.checks.push(out);
    if (out.present) { x.final = true; x.st = nn === 1 ? 'ok' : 'late'; x.at = out.at; x.why = ''; }
    else if (nn >= 3) { x.final = true; x.st = out.err ? 'unk' : 'bad'; x.why = out.err || out.note || ''; x.at = out.at; }
    else { x.final = false; x.why = out.err || out.note || ''; x.next = hm(new Date(atTime(date, cfg.times[p - 1][0], OFF[nn]))); }
    res[k] = x;
    await chrome.storage.local.set({ [key]: res, hb: { at: hm(new Date()), date, p, err: out.err || '' } });

    if (!out.present && (nn === 1 || x.final)) {
      const what = x.final ? (x.st === 'bad' ? 'غائب بعد الفحص الأخير' : 'تعذّر التحقق') : (out.err ? 'تعذّر الفحص' : 'غير موجود');
      notify(`${k}|${nn}`, `راصد · الحصة ${p} · ${r.c}`, `الأستاذ/ ${r.t}: ${what} (${out.at})${out.err ? ' – ' + out.err : ''}`);
    }
  }
}

/* ---------- فحص الروابط قبل الحصة ---------- */
async function runPre({ date, p }) {
  const cfg = await getCfg(); if (!cfg || !(cfg.auto && cfg.auto.on)) return;
  const d = wdOf(date); if (d < 0) return;
  const rows = cfg.rows.filter(r => r.d === d && r.p === p && r.l);
  const key = 'pre:' + date; let signinWarned = false;
  for (const r of rows) {
    const o = await probe(r);
    const pre = (await chrome.storage.local.get(key))[key] || {};
    pre[mk(date, p, r.c)] = { at: hm(new Date()), bad: o.bad, msg: o.msg };
    await chrome.storage.local.set({ [key]: pre });
    if (o.bad) notify(`pre|${date}|${p}|${r.c}`, `راصد · رابط لا يعمل – الحصة ${p}`, `الأستاذ/ ${r.t} – ${r.c}: ${o.msg}. أرسل له «طلب رابط» من راصد.`);
    if (o.signin && !signinWarned) { signinWarned = true; notify(`signin|${date}|${p}`, 'راصد · Teams غير مسجّل الدخول', 'سجّل الدخول إلى Teams في هذا المتصفح قبل بدء الحصة.'); }
  }
}
async function probe(r) {
  let tab; const o = { bad: false, msg: '' };
  try {
    const win = await ensureWin();
    tab = await chrome.tabs.create({ windowId: win, url: webJoin(r.l), active: true });
    await waitLoad(tab.id, 40000);
    const end = Date.now() + 60000; let ph = 'loading';
    while (Date.now() < end) {
      let s; try { s = await sendMsg(tab.id, { cmd: 'probe' }, 8000); } catch (e) { await sleep(1500); continue; }
      ph = s.phase;
      if (['prejoin', 'notstarted', 'lobby', 'meeting'].includes(ph)) break;
      if (ph === 'error') { o.bad = true; o.msg = s.msg || 'الاجتماع غير موجود أو انتهى'; break; }
      if (ph === 'guest' || ph === 'signin') { o.msg = 'Teams غير مسجّل الدخول'; o.signin = true; break; }
      await sleep(2500);
    }
    if (ph === 'loading' && !o.msg) o.msg = 'لم يكتمل التحقق';
  } catch (e) { o.msg = String(e && e.message || e); }
  finally { if (tab) chrome.tabs.remove(tab.id).catch(() => { }); }
  return o;
}

/* ---------- اختبار الإعداد ---------- */
async function runTest({ link, teacher }) {
  const st = { at: hm(new Date()), done: false, ok: false, steps: [], shot: null };
  const save = () => chrome.storage.local.set({ 'test:last': st });
  const log = (m, ok) => { st.steps.push({ m, ok, at: hm(new Date()) }); return save(); };
  if (!link) { await log('لا يوجد رابط للاختبار. أضف رابطًا أو ارفع الجدول.', false); st.done = true; return save(); }
  await log('فتح الرابط في نافذة الفحص');
  const out = await checkOne({ l: link, t: teacher || '', c: 'اختبار', p: 0 }, ymd(new Date()), 0, 1, { log, noFile: true });
  st.shot = out.shotRaw || null;
  st.ok = !!out.joined && !out.err;
  await log(out.joined ? (out.present ? 'النتيجة: المعلم موجود في الاجتماع' : 'النتيجة: المعلم غير موجود في الاجتماع') : ('النتيجة: ' + (out.err || out.note || 'لم يكتمل الدخول')), st.ok);
  st.done = true; await save();
}

/* ---------- فحص اجتماع واحد ---------- */
function webJoin(l) {
  try {
    const u = new URL(l);
    if (!/(^|\.)teams\.(microsoft|live)\.com$/.test(u.hostname) || u.pathname.startsWith('/v2/')) return l;
    return 'https://teams.microsoft.com/v2/?meetingjoin=true#' + u.pathname + u.search + '&launchAgent=join_launcher&laentry=hero&suppressPrompt=true';
  } catch (e) { return l; }
}
function sendMsg(tabId, msg, ms) {
  return Promise.race([chrome.tabs.sendMessage(tabId, msg), sleep(ms).then(() => { throw new Error('انتهت المهلة'); })]);
}
function waitLoad(tabId, ms) {
  return new Promise(res => {
    const t = setTimeout(done, ms);
    function l(id, info) { if (id === tabId && info.status === 'complete') done(); }
    function done() { clearTimeout(t); chrome.tabs.onUpdated.removeListener(l); res(); }
    chrome.tabs.onUpdated.addListener(l);
  });
}
async function ensureWin() {
  const { winId } = await chrome.storage.session.get('winId');
  if (winId) { try { const w = await chrome.windows.get(winId); if (w.state === 'minimized') await chrome.windows.update(winId, { state: 'normal' }); return winId; } catch (e) { } }
  const w = await chrome.windows.create({ url: 'about:blank', width: 1280, height: 820, focused: false, type: 'normal' });
  await chrome.storage.session.set({ winId: w.id });
  return w.id;
}
const PH = {
  loading: 'تحميل الصفحة', launcher: 'صفحة الإطلاق ← المتابعة في المتصفح', prejoin: 'شاشة ما قبل الانضمام ← إيقاف الصوت والكاميرا ثم الانضمام',
  meeting: 'داخل الاجتماع', lobby: 'ردهة الانتظار', notstarted: 'الاجتماع لم يبدأ (لا يوجد أحد)',
  guest: 'Teams يطلب اسم ضيف: غير مسجّل الدخول', signin: 'صفحة تسجيل الدخول: Teams غير مسجّل الدخول', error: 'خطأ في الاجتماع'
};

async function checkOne(r, date, p, n, opt = {}) {
  const log = opt.log || (() => { });
  const out = { n, at: hm(new Date()), present: false, att: null, img: null, err: '', note: '', joined: false };
  let tab, win;
  try {
    win = await ensureWin();
    tab = await chrome.tabs.create({ windowId: win, url: webJoin(r.l), active: true });
    await waitLoad(tab.id, 40000);

    const end = Date.now() + 100000; let ph = '', lobbySince = 0;
    while (Date.now() < end) {
      let s; try { s = await sendMsg(tab.id, { cmd: 'step' }, 8000); } catch (e) { await sleep(1500); continue; }
      if (s.phase !== ph) { ph = s.phase; await log(PH[ph] || ph, ['error', 'guest', 'signin'].includes(ph) ? false : undefined); }
      if (ph === 'meeting') break;
      if (ph === 'guest' || ph === 'signin') { out.err = 'Teams غير مسجّل الدخول في هذا المتصفح'; break; }
      if (ph === 'notstarted') { out.note = 'الاجتماع لم يبدأ (لا يوجد أحد)'; break; }
      if (ph === 'lobby') { lobbySince = lobbySince || Date.now(); if (Date.now() - lobbySince > 25000) { out.err = 'في ردهة الانتظار ولم يُقبل الدخول'; break; } }
      if (ph === 'error') { out.err = s.msg || 'رابط الاجتماع لا يعمل'; break; }
      await sleep(2500);
    }
    if (!ph) await log('صفحة Teams لم تستجب', false);

    let rd = {};
    if (ph === 'meeting') {
      out.joined = true;
      try { rd = await sendMsg(tab.id, { cmd: 'read', teacher: r.t }, 30000); } catch (e) { rd = {}; }
      out.present = !!rd.present; out.att = rd.att ?? null;
      await log(`قراءة المشاركين: ${rd.readable ? 'تمت' : 'تعذّرت'} · المنظِّم ${rd.org ? 'موجود' : 'غير موجود'} · اسم المعلم ${rd.nameHit ? 'ظاهر' : 'غير ظاهر'} · العدد ${out.att ?? '—'}`, !!rd.readable);
      if (!rd.readable) out.err = 'تعذّرت قراءة قائمة المشاركين';
      else if (!out.present) out.note = 'المعلم غير موجود في الاجتماع';
    } else if (!out.err && !out.note) out.err = 'تعذّر الانضمام للاجتماع';

    await sleep(1500);
    const shot = await chrome.tabs.captureVisibleTab(win, { format: 'jpeg', quality: 72 }).catch(() => null);
    await log(shot ? 'التقاط الشاشة: تم' : 'التقاط الشاشة: فشل (لا تصغّر نافذة الفحص)', !!shot);
    if (shot) {
      const img = await stamp(shot, `${date}  ${hm(new Date())}  ·  ${p ? 'الحصة ' + p + '  ·  ' + r.c + '  ·  ' : 'اختبار  ·  '}الأستاذ/ ${r.t || '—'}  ·  فحص ${n}`);
      if (opt.noFile) out.shotRaw = img;
      else {
        const id = `${date}|${p}|${r.c}|${n}`;
        await chrome.storage.local.set({ ['img:' + id]: img });
        out.img = id; out.file = await saveJpg(img, date, p, r, n);
      }
    } else if (!out.err) out.note = (out.note ? out.note + ' · ' : '') + 'لم تُلتقط الشاشة';

    await sendMsg(tab.id, { cmd: 'leave' }, 15000).catch(() => { });
    if (out.joined) await log('المغادرة');
    await sleep(1500);
  } catch (e) { out.err = out.err || String(e && e.message || e); await log('خطأ: ' + out.err, false); }
  finally { if (tab) chrome.tabs.remove(tab.id).catch(() => { }); }
  return out;
}

/* ---------- حفظ اللقطة ملفًا في التنزيلات/راصد ---------- */
const clean = t => String(t).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');
async function saveJpg(dataUrl, date, p, r, n) {
  const name = `راصد/${date}/الحصة ${p}/${clean(r.c)} – الأستاذ ${clean(r.t)} – فحص ${n} – ${hm(new Date()).replace(':', '-')}.jpg`;
  try { if (chrome.downloads.setUiOptions) await chrome.downloads.setUiOptions({ enabled: false }); } catch (e) { }
  try { await chrome.downloads.download({ url: dataUrl, filename: name, conflictAction: 'uniquify', saveAs: false }); return name; }
  catch (e) { console.warn('حفظ اللقطة', e); return ''; }
  finally { setTimeout(() => { try { chrome.downloads.setUiOptions && chrome.downloads.setUiOptions({ enabled: true }); } catch (e) { } }, 4000); }
}

/* ---------- ختم اللقطة (دون طمس – للتوثيق) ---------- */
async function stamp(dataUrl, text) {
  const bmp = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const W = bmp.width, H = bmp.height, band = Math.max(44, Math.round(H * 0.055));
  const c = new OffscreenCanvas(W, H + band), x = c.getContext('2d');
  x.drawImage(bmp, 0, 0);
  x.fillStyle = '#0d4f57'; x.fillRect(0, H, W, band);
  x.fillStyle = '#ffffff'; x.font = `600 ${Math.round(band * 0.42)}px Tahoma, "Segoe UI", Arial, sans-serif`;
  x.direction = 'rtl'; x.textAlign = 'right'; x.textBaseline = 'middle';
  x.fillText(text, W - 18, H + band / 2);
  x.font = `${Math.round(band * 0.3)}px Tahoma, "Segoe UI", Arial, sans-serif`; x.textAlign = 'left'; x.globalAlpha = .8;
  x.fillText('راصد · عبدالمجيد السيد', 14, H + band / 2);
  const blob = await c.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
  const u8 = new Uint8Array(await blob.arrayBuffer()); let bin = '';
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return 'data:image/jpeg;base64,' + btoa(bin);
}
