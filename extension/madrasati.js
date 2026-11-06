/* راصد الآلي – سحب جداول الفصول من منصة مدرستي (يعمل داخل جلستك المفتوحة)
   يعيد استخدام طريقة «أداة الرصد السريع» في قراءة الفصول وجدول كل فصل.
   لا يقرأ اسم المستخدم ولا كلمة المرور، ولا يحفظ أو يعدّل شيئًا في مدرستي.
   إعداد وتطوير: عبدالمجيد السيد · 0561955430 */
(function () {
  'use strict';
  if (window.__rasedMP) return; window.__rasedMP = true;
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const norm = s => String(s || '').replace(/[ً-ٰٟـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/\s+/g, ' ').trim();
  const NDAYS = DAYS.map(norm);
  const pad = n => String(n).padStart(2, '0');
  const slash = d => d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate());
  const weekStart = d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
  const weekOffset = ws => Math.round((ws - weekStart(new Date())) / (7 * 864e5));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const token = doc => ((doc || document).querySelector('input[name="__RequestVerificationToken"]') || document.querySelector('input[name="__RequestVerificationToken"]') || {}).value || '';
  async function pool(items, n, fn) { let i = 0; const w = async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } }; await Promise.all(Array.from({ length: Math.max(1, n) }, w)); }
  const BREAK = /راحه|نشاط|فسحه|صلاه|استراحه/;
  const isBreak = t => { const n = norm(t); return /\((راحه|نشاط)\)/.test(n) || (BREAK.test(n) && n.length < 14); };

  /* ---------- المدرسة والفصول ---------- */
  function detectSchool() {
    const qs = new URLSearchParams(location.search);
    let id = qs.get('schoolId') || qs.get('SchoolId') || (document.getElementById('hSchoolId') || {}).value || (document.querySelector('input[name="SchoolId"]') || {}).value || '';
    if (!id) { try { id = localStorage.getItem('madrasati_hSchoolId') || localStorage.getItem('globalschoolId') || ''; } catch (e) {} }
    if (!id) { for (const a of document.querySelectorAll('a[href*="SchoolId="], a[href*="schoolId="]')) { const m = (a.getAttribute('href') || '').match(/[?&]schoolId=([^&#]+)/i); if (m) { id = decodeURIComponent(m[1]); break; } } }
    const el = document.querySelector('.school-name, .user-school-name, #schoolName, .navbar-brand span');
    let nm = el ? el.textContent.trim() : '';
    if (!nm) { try { nm = localStorage.getItem('school_name_' + id) || localStorage.getItem('madrasati_schoolName') || ''; } catch (e) {} }
    return id ? { id: String(id), name: nm } : null;
  }
  function classesFromDom() {
    const map = new Map();
    document.querySelectorAll('#divSearchClassroomResultId .dga-defualt-card, .dga-defualt-card').forEach(c => {
      if (c.querySelector('.dga-defualt-card')) return;
      const a = c.querySelector('a[href*="ClassRoomSchedule"]') || c.querySelector('a[href*="/TimeStructure/TimeTable/Index/"]') || c.querySelector('a[href*="/SchoolStructure/Classrooms/Students/"]');
      if (!a) return;
      const h = c.querySelector('h4, h5, h6, .card-title, .mb-1, strong'); const raw = h ? h.innerText.trim() : '';
      const name = cleanClass(raw) || raw; const href = a.getAttribute('href') || '';
      const m1 = href.match(/(?:[?&]ClassRoomId=|\/(?:Index|Students|Teachers)\/)([A-Fa-f0-9]{32})(?:[&#/]|$)/i);
      const m2 = href.match(/[?&]classRoomId=(\d+)(?:[&#]|$)/i) || href.match(/\/Classrooms\/(\d+)(?:[&#/]|$)/i);
      const enc = m1 ? m1[1] : '', num = !enc && m2 ? m2[1] : ''; const key = enc || num || name;
      if (key && !map.has(key)) map.set(key, { numericId: num, encId: enc, name: name || 'فصل' });
    });
    return map;
  }
  const cleanClass = s => String(s || '').replace(/المرحلة\s+[^-\n]+[-–]/g, '').replace(/مقررات\s+العام\s+الدراسي\s*[-–]?\s*/g, '').replace(/الصف\s+/g, '').replace(/\s+/g, ' ').trim();
  async function getClassrooms(school) {
    const map = classesFromDom();
    try {
      const r = await fetch('/SchoolManagmentReports/StudentStatistics/GetClassRooms', { method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
        body: new URLSearchParams({ schoolId: school.id, treeId: '2' }).toString() });
      if (r.ok) {
        const list = await r.json();
        if (Array.isArray(list)) list.forEach(x => {
          const name = cleanClass(x.Title || x.Name || ''), id = x.Id ? String(x.Id).trim() : '', enc = x.Id_Enc || '';
          let hit = null;
          map.forEach(c => { if (!hit && ((enc && c.encId && c.encId.toLowerCase() === enc.toLowerCase()) || (name && c.name && (name.includes(c.name) || c.name.includes(name))))) hit = c; });
          if (hit) { if (id) hit.numericId = id; if (enc && !hit.encId) hit.encId = enc; }
          else if (name || id) map.set(enc || id || name, { numericId: id, encId: enc, name: name || 'فصل' });
        });
      }
    } catch (e) { console.warn('[راصد] GetClassRooms', e); }
    return Array.from(map.values());
  }
  async function numericId(school, c) {
    if (c.numericId && /^\d+$/.test(c.numericId)) return c.numericId;
    if (!c.encId) return '';
    try {
      const r = await fetch('/SchoolSchedule/Schedule/ClassRoomSchedule?SchoolId=' + encodeURIComponent(school.id) + '&ClassRoomId=' + encodeURIComponent(c.encId) + '&ClassroomType=1', { credentials: 'include' });
      if (r.ok) {
        const t = await r.text();
        const m = t.match(/id=["']ClassRooms["'][^>]*value=["'](\d+)["']/i) || t.match(/value=["'](\d+)["'][^>]*id=["']ClassRooms["']/i) ||
          t.match(/name=["']ClassRooms["'][^>]*value=["'](\d+)["']/i) || t.match(/<option[^>]*value=["'](\d+)["'][^>]*selected/i) || t.match(/[?&]classRoomId=(\d+)(?:[&#]|$)/i);
        if (m) c.numericId = m[1];
      }
    } catch (e) {}
    return c.numericId || '';
  }

  /* ---------- جدول فصل لأسبوع ---------- */
  function cleanName(s) {
    return String(s || '').replace(/<[^>]+>/g, ' ').replace(/(لم يتم الرصد|تم الرصد|رصد الحضور|عرض الحضور)/g, ' ')
      .replace(/(اسم\s*)?(المعلمه|المعلمة|المعلم|معلم المادة|معلم)\s*[:：-]?/g, ' ').replace(/[0-9٠-٩:/().\-–|]+/g, ' ')
      .replace(/\b(ص|م)\b/g, ' ').replace(/\s+/g, ' ').trim();
  }
  async function getWeek(school, c, ws) {
    const id = await numericId(school, c);
    if (!id) throw new Error('لم يُعرف رقم الفصل');
    const url = '/SchoolSchedule/Schedule/GetClassRoomSchedule?SchoolId=' + encodeURIComponent(school.id) + '&classRoomId=' + encodeURIComponent(id) +
      '&week=' + weekOffset(ws) + '&ScheduleDate=' + encodeURIComponent(slash(ws));
    const h = { Accept: '*/*', 'X-Requested-With': 'XMLHttpRequest' }, tk = token(); if (tk) h.RequestVerificationToken = tk;
    const r = await fetch(url, { method: 'POST', credentials: 'include', headers: h });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const txt = await r.text(); let html = txt;
    try { const j = JSON.parse(txt); html = j.html || (typeof j === 'string' ? j : ''); } catch (e) {}
    if (!html) return [];
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const table = doc.querySelector('table.schedule-table, table'); if (!table) return [];
    const trs = Array.from(table.querySelectorAll('tr'));
    // خريطة الأعمدة من صف العناوين: تُستبعد الراحة والنشاط، والباقي يُرقَّم 1..7
    let colP = null;
    const hdr = trs.find(tr => { const f = tr.querySelector('td, th'); return f && !NDAYS.some(d => norm(f.textContent).includes(d)); });
    if (hdr) { colP = []; let p = 0; Array.from(hdr.querySelectorAll('td, th')).forEach((cell, i) => { if (i === 0) { colP.push(0); return; } colP.push(isBreak(cell.textContent) ? 0 : ++p); }); if (!colP.some(Boolean)) colP = null; }
    const out = [];
    trs.forEach(tr => {
      const cells = Array.from(tr.querySelectorAll('td, th')); if (!cells.length) return;
      const ft = norm(cells[0].textContent); const di = NDAYS.findIndex(d => ft.includes(d)); if (di < 0) return;
      let slot = 0;
      cells.slice(1).forEach((td, j) => {
        const t = (td.textContent || '').replace(/\s+/g, ' ').trim();
        let p;
        if (colP) { p = colP[j + 1]; if (!p) return; if (!t) return; }
        else { if (!t || isBreak(t)) return; p = ++slot; }
        if (isBreak(t)) return;
        const a0 = td.querySelector('a'); let at = a0 ? a0.textContent.trim() : '';
        if (/^(عرض الحضور|رصد الحضور|تم الرصد|لم يتم الرصد|عرض|رصد)$/.test(at)) at = '';
        const title = at || t.replace(/(لم يتم الرصد|تم الرصد|رصد الحضور|عرض الحضور)/g, '').trim();
        let tip = ''; [td, a0, td.querySelector('[title],[data-original-title],[data-bs-original-title],[data-teacher]')].forEach(el => { if (el && !tip) tip = el.getAttribute('data-teacher') || el.getAttribute('title') || el.getAttribute('data-original-title') || el.getAttribute('data-bs-original-title') || ''; });
        const info = t.replace(/(لم يتم الرصد|تم الرصد|رصد الحضور|عرض الحضور)/g, '').replace(title, '').trim();
        const hrefEl = td.querySelector('a[href*="/AttendStudents/IndexDirector"]') || td.querySelector('a[href*="/AttendStudents/View"]') || a0;
        const href = hrefEl ? hrefEl.getAttribute('href') || '' : '';
        const g = k => { const m = href.match(new RegExp(k + '=([^&]+)', 'i')); return m ? decodeURIComponent(m[1]) : ''; };
        let tname = cleanName(tip); if (!/[؀-ۿ]{2,}\s+[؀-ۿ]{2,}/.test(tname)) tname = '';
        if (!tname) { const ci = cleanName(info); if (/[؀-ۿ]{2,}\s+[؀-ۿ]{2,}/.test(ci) && ci.split(' ').length <= 6) tname = ci; }
        out.push({ d: di, p, c: c.name, s: title.slice(0, 90), t: tname, tid: g('teacherId'), idSchedule: g('IdSchedule'), dateAttend: g('dateAttend'), lec: g('lectureClassId'), href, raw: t.slice(0, 160), tip: tip.slice(0, 160) });
      });
    });
    return out;
  }

  /* ---------- إكمال اسم المعلم من صفحة الحصة (قراءة فقط) ---------- */
  function findTeacher(doc) {
    const inp = doc.querySelector('input[name*="TeacherName" i], input[id*="TeacherName" i]'); if (inp && inp.value.trim()) return inp.value.trim();
    const sel = doc.querySelector('select[name*="Teacher" i] option:checked'); if (sel && /[؀-ۿ]/.test(sel.textContent)) return sel.textContent.trim();
    let best = '';
    doc.querySelectorAll('label,th,td,span,b,strong,dt,p,div,li,h4,h5,h6').forEach(el => {
      if (best || el.children.length > 3) return;
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim(); if (t.length > 70) return;
      const m = t.match(/^(?:اسم\s*)?(?:المعلم|معلم المادة|المعلمة)\s*[:：\-]\s*([؀-ۿ][؀-ۿ\s.]{3,})$/); if (m) { best = m[1].trim(); return; }
      if (/^(?:اسم\s*)?(?:المعلم|معلم المادة)\s*[:：]?$/.test(t)) { const nx = el.nextElementSibling, v = nx ? (nx.value || nx.textContent || '').replace(/\s+/g, ' ').trim() : ''; if (v && v.length < 60 && /[؀-ۿ]/.test(v)) best = v; }
    });
    return best;
  }
  async function teacherFromLesson(school, x) {
    let href = x.href && x.href.includes('/AttendStudents/') ? x.href : '';
    if (!href && x.idSchedule) href = '/SchoolSchedule/AttendStudents/IndexDirector/' + encodeURIComponent(school.id) + '?IdSchedule=' + encodeURIComponent(x.idSchedule) +
      '&dateAttend=' + encodeURIComponent(x.dateAttend || '') + '&teacherId=' + encodeURIComponent(x.tid || '') + '&lectureClassId=' + encodeURIComponent(x.lec || '');
    if (!href) return '';
    try { const r = await fetch(href, { credentials: 'include', headers: { Accept: 'text/html' } }); if (!r.ok) return ''; return findTeacher(new DOMParser().parseFromString(await r.text(), 'text/html')); } catch (e) { return ''; }
  }
  async function fillTeachers(school, rows, onp) {
    const byId = {};
    rows.forEach(r => { if (r.tid && r.t && !byId[r.tid]) byId[r.tid] = r.t; });
    const need = {}; rows.forEach(r => { if (!r.t && r.tid && !byId[r.tid] && !need[r.tid]) need[r.tid] = r; });
    const list = Object.values(need); let k = 0;
    await pool(list, 3, async x => { const n = await teacherFromLesson(school, x); if (n) byId[x.tid] = n; onp && onp(++k, list.length); });
    // إن بقي بلا اسم: نجرّب حصة أخرى للمعلم نفسه مرة واحدة
    const again = {}; rows.forEach(r => { if (!r.t && r.tid && !byId[r.tid] && r !== need[r.tid] && !again[r.tid]) again[r.tid] = r; });
    await pool(Object.values(again), 3, async x => { const n = await teacherFromLesson(school, x); if (n) byId[x.tid] = n; });
    rows.forEach(r => { if (!r.t && r.tid && byId[r.tid]) r.t = byId[r.tid]; });
  }

  /* ---------- السحب الكامل ---------- */
  async function pull(opts) {
    const school = detectSchool(); if (!school) throw new Error('لم أتعرّف على المدرسة. افتح صفحة «الفصول» في مدرستي بعد اختيار المدرسة.');
    let classes = await getClassrooms(school); if (!classes.length) throw new Error('لم أجد فصولًا. افتح صفحة «الهيكل المدرسي ← الفصول» ثم أعد المحاولة.');
    if (opts.sample) classes = classes.slice(0, 1);
    const ws = weekStart(new Date()), nx = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 7);
    const rows = [], errs = []; let done = 0;
    await pool(classes, 4, async c => {
      try {
        let w = await getWeek(school, c, ws);
        const have = new Set(w.map(x => x.d));
        if (have.size < 5) { try { const w2 = await getWeek(school, c, nx); w = w.concat(w2.filter(x => !have.has(x.d))); } catch (e) {} }
        rows.push(...w);
      } catch (e) { errs.push(c.name + ': ' + e.message); }
      opts.onp && opts.onp('class', ++done, classes.length);
    });
    await fillTeachers(school, rows, (a, b) => opts.onp && opts.onp('teach', a, b));
    const seen = new Set(), clean = [];
    rows.sort((a, b) => a.c.localeCompare(b.c, 'ar', { numeric: true }) || a.d - b.d || a.p - b.p).forEach(r => { const k = r.d + '|' + r.p + '|' + r.c; if (seen.has(k) || !(r.p >= 1 && r.p <= 7)) return; seen.add(k); clean.push(r); });
    return { school, classes: classes.length, rows: clean, errs };
  }

  /* ---------- اللوحة ---------- */
  let box = null, last = null;
  const CSS = `#rasedMP{position:fixed;z-index:2147483646;bottom:18px;left:18px;width:min(440px,calc(100vw - 36px));max-height:calc(100vh - 36px);overflow:auto;direction:rtl;text-align:right;
    font:14px/1.6 "IBM Plex Sans Arabic",Tahoma,"Segoe UI",sans-serif;color:#10272b;background:#fff;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.28)}
    #rasedMP .hd{background:radial-gradient(120% 140% at 100% 0%,#1b8a8f 0%,#0d4f57 55%,#083a40 100%);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}
    #rasedMP .hd b{font-size:16px;flex:1}#rasedMP .mk{width:30px;height:30px;border-radius:9px;background:#fff;display:grid;place-items:center}
    #rasedMP .x{background:none;border:0;color:#fff;font-size:20px;cursor:pointer}
    #rasedMP .bd{padding:14px 16px;display:grid;gap:10px}#rasedMP .mu{color:#5f7376;font-size:13px}
    #rasedMP button.b{font:inherit;font-weight:600;border:1px solid #d5e2e2;background:#fff;color:#0d4f57;border-radius:10px;padding:8px 14px;cursor:pointer}
    #rasedMP button.p{background:#0d4f57;border-color:#0d4f57;color:#fff}#rasedMP button:disabled{opacity:.5;cursor:default}
    #rasedMP .row{display:flex;gap:8px;flex-wrap:wrap}#rasedMP .bar{height:6px;border-radius:9px;background:#e7eeee;overflow:hidden}#rasedMP .bar i{display:block;height:100%;background:#1b8a8f;width:0}
    #rasedMP table{border-collapse:collapse;width:100%;font-size:12.5px}#rasedMP td,#rasedMP th{border-bottom:1px solid #e7eeee;padding:4px 6px;text-align:right}
    #rasedMP .st{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}#rasedMP .st div{background:#f1f8f7;border-radius:10px;padding:8px;text-align:center}#rasedMP .st b{display:block;font-size:20px;color:#0d4f57}
    #rasedMP .warn{background:#fdf0d8;color:#a65508;border-radius:10px;padding:8px 10px;font-size:13px}#rasedMP .ok{background:#e3f3e8;color:#15803d;border-radius:10px;padding:8px 10px;font-weight:600}
    #rasedMP pre{white-space:pre-wrap;font-size:11.5px;background:#f2f5f5;border-radius:8px;padding:8px;max-height:160px;overflow:auto;direction:rtl}`;
  function open() {
    if (box) { box.style.display = ''; return; }
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'rasedMP'; document.body.appendChild(box); draw();
  }
  function draw(inner) {
    const sc = detectSchool();
    box.innerHTML = `<div class="hd"><span class="mk"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d4f57" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9 17 20 6"/></svg></span><b>راصد · سحب جداول الفصول</b><button class="x" id="mpX" title="إغلاق">×</button></div>
      <div class="bd">${inner || `<div class="mu">${sc ? 'المدرسة محددة ✓' : '⚠️ اختر المدرسة وافتح صفحة «الفصول» أولًا.'} يقرأ راصد جدول كل فصل لهذا الأسبوع (الحصة، المادة، المعلم)، ولا يغيّر شيئًا في مدرستي.</div>
        <div class="row"><button class="b" id="mpS">فحص عينة (فصل واحد)</button><button class="b p" id="mpA">سحب جدول كل الفصول</button></div>`}</div>`;
    box.querySelector('#mpX').onclick = () => { box.style.display = 'none'; };
    const s = box.querySelector('#mpS'), a = box.querySelector('#mpA');
    if (s) s.onclick = () => run(true); if (a) a.onclick = () => run(false);
  }
  function prog(kind, a, b) {
    const L = box.querySelector('#mpL'), I = box.querySelector('#mpI'); if (!L) return;
    L.textContent = kind === 'class' ? `قراءة الفصول: ${a} من ${b}` : `إكمال أسماء المعلمين: ${a} من ${b}`; I.style.width = Math.round(a / Math.max(1, b) * 100) + '%';
  }
  async function run(sample) {
    draw(`<div id="mpL" class="mu">جارٍ التحضير…</div><div class="bar"><i id="mpI"></i></div>`);
    try { last = await pull({ sample, onp: prog }); last.sample = sample; preview(); }
    catch (e) { draw(`<div class="warn">${esc(e.message || e)}</div><div class="row"><button class="b" id="mpS">فحص عينة</button><button class="b p" id="mpA">إعادة المحاولة</button></div>`); }
  }
  function preview() {
    const R = last.rows, T = new Set(R.filter(r => r.t).map(r => r.t)), noT = R.filter(r => !r.t);
    const days = [0, 1, 2, 3, 4].map(d => R.filter(r => r.d === d).length);
    let h = `<div class="st"><div><b>${last.classes}</b>فصل</div><div><b>${R.length}</b>حصة</div><div><b>${T.size}</b>معلم</div></div>
      <div class="mu">${DAYS.map((d, i) => `${d} ${days[i]}`).join(' · ')}</div>`;
    if (noT.length) h += `<div class="warn">${noT.length} حصة لم يُعرف معلمها، ولن تُرسل. يمكنك إكمالها لاحقًا من ملف الخطة الأسبوعية.</div>`;
    if (last.errs.length) h += `<div class="warn">تعذّر قراءة: ${esc(last.errs.slice(0, 4).join(' · '))}${last.errs.length > 4 ? ' …' : ''}</div>`;
    h += `<table><tr><th>الفصل</th><th>اليوم</th><th>الحصة</th><th>المعلم</th><th>المادة</th></tr>${R.slice(0, last.sample ? 40 : 10).map(r => `<tr><td>${esc(r.c)}</td><td>${DAYS[r.d]}</td><td>${r.p}</td><td>${esc(r.t || '—')}</td><td>${esc(r.s)}</td></tr>`).join('')}</table>`;
    if (last.sample) {
      const ex = R.find(r => !r.t) || R[0];
      if (ex) h += `<details><summary class="mu" style="cursor:pointer">ما قرأه راصد من خانة واحدة (للتحقق)</summary><pre>${esc('النص: ' + ex.raw + '\nالتلميح: ' + (ex.tip || '—') + '\nمعرّف المعلم: ' + (ex.tid ? 'موجود' : 'غير موجود'))}</pre></details>`;
      h += `<div class="row"><button class="b p" id="mpA">الأسماء صحيحة، اسحب كل الفصول</button><button class="b" id="mpB">رجوع</button></div>`;
    } else {
      h += `<div class="row"><button class="b p" id="mpSend" ${R.some(r => r.t) ? '' : 'disabled'}>إرسال إلى راصد</button><button class="b" id="mpB">رجوع</button></div>`;
    }
    draw(h);
    const a = box.querySelector('#mpA'); if (a) a.onclick = () => run(false);
    box.querySelector('#mpB').onclick = () => draw();
    const sd = box.querySelector('#mpSend'); if (sd) sd.onclick = () => send(false);
  }
  async function send(auto) {
    const rows = last.rows.filter(r => r.t).map(r => ({ d: r.d, p: r.p, c: r.c, t: r.t, s: r.s, ph: '', l: '' }));
    await chrome.storage.local.set({ mpull: { at: Date.now(), auto: !!auto, school: last.school.name || '', classes: last.classes, skipped: last.rows.length - rows.length, rows } });
    if (!auto) { draw(`<div class="ok">✓ أُرسل الجدول إلى راصد: ${rows.length} حصة.</div><div class="mu">ارجع إلى صفحة راصد، وستجد الجدول محدّثًا مع بقاء الجوالات والروابط المحفوظة.</div><div class="row"><button class="b p" id="mpGo">فتح راصد</button></div>`);
      box.querySelector('#mpGo').onclick = () => chrome.runtime.sendMessage({ cmd: 'openApp' }); }
  }

  // الطلب من راصد (خلال 30 دقيقة) يفتح اللوحة تلقائيًا
  chrome.storage.local.get('mreq').then(o => { if (o.mreq && Date.now() - o.mreq < 30 * 60e3) { open(); chrome.storage.local.remove('mreq'); } });
  chrome.runtime.onMessage.addListener((m, s, reply) => {
    if (!m) return;
    if (m.cmd === 'mpOpen') { open(); reply({ ok: 1 }); }
    if (m.cmd === 'mpAuto') { (async () => { try { last = await pull({}); await send(true); reply({ ok: 1, n: last.rows.length }); } catch (e) { reply({ ok: 0, err: String(e.message || e) }); } })(); return true; }
  });
})();
