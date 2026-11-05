/* راصد الآلي – يعمل داخل صفحة Teams فقط عند طلب الإضافة (لا يفعل شيئًا في استخدامك العادي) */
(() => {
  if (window.__rasedAuto) return; window.__rasedAuto = 1;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const norm = s => String(s || '').replace(/[ً-ْـ]/g, '').replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim().toLowerCase();
  const vis = e => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
  const label = e => norm((e.innerText || '') + ' ' + (e.getAttribute('aria-label') || '') + ' ' + (e.getAttribute('title') || ''));
  function btn(sel, words) {
    for (const q of sel) { const e = document.querySelector(q); if (vis(e)) return e; }
    if (!words) return null;
    const W = words.map(norm);
    return [...document.querySelectorAll('button,[role=button],a[role=link],a')].find(e => vis(e) && W.some(w => label(e).includes(w))) || null;
  }
  const txt = () => norm(document.body ? document.body.innerText : '');
  const has = words => { const t = txt(); return words.some(w => t.includes(norm(w))); };

  const B = {
    launcher: () => btn(['[data-tid="joinOnWeb"]', '#openTeamsClientInBrowser'], ['Continue on this browser', 'Join on the web instead', 'Use the web app instead', 'المتابعة على هذا المستعرض', 'المتابعة على هذا المتصفح', 'الانضمام على الويب', 'استخدام تطبيق الويب']),
    noAV: () => btn([], ['Continue without audio or video', 'بدون استخدام الصوت', 'دون صوت أو فيديو', 'المتابعة بدون صوت']),
    join: () => btn(['[data-tid="prejoin-join-button"]', '#prejoin-join-button'], ['Join now', 'الانضمام الآن', 'انضم الآن']),
    hangup: () => btn(['[data-tid="hangup-main-btn"]', '#hangup-button', '[data-tid="call-hangup"]', '[data-tid="hangup-leave-button"]'], ['Leave', 'مغادرة', 'غادر']),
    roster: () => btn(['[data-tid="roster-button"]', '#roster-button'], ['People', 'أشخاص', 'Participants', 'المشاركون']),
    cancel: () => btn([], ['Cancel', 'إلغاء'])
  };
  const guest = () => [...document.querySelectorAll('input')].find(i => vis(i) && /name|اسم/i.test((i.placeholder || '') + (i.getAttribute('aria-label') || '') + (i.dataset.tid || '')));
  const LOBBY_NS = ['When the meeting starts', "we'll let people know you're waiting", 'عند بدء الاجتماع', 'سنعلم الأشخاص بأنك في انتظار'];
  const LOBBY = ['Someone in the meeting should let you in soon', 'سيسمح لك أحد الأشخاص', 'سيسمح لك شخص', 'في انتظار السماح'];
  const ERR = ["This meeting doesn't exist", 'meeting has ended', 'لا يوجد هذا الاجتماع', 'انتهى الاجتماع', "We couldn't find", 'تعذر العثور'];

  function phase() {
    if (location.hostname.includes('login.')) return { phase: 'signin' };
    if (!B.join()) {
      if (has(LOBBY_NS)) return { phase: 'notstarted' };
      if (has(LOBBY)) return { phase: 'lobby' };
      if (B.hangup()) return { phase: 'meeting' };
    }
    if (has(ERR)) return { phase: 'error', msg: 'الاجتماع غير موجود أو انتهى' };
    if (guest() && B.join()) return { phase: 'guest' };
    if (B.noAV() || B.join()) return { phase: 'prejoin' };
    if (B.launcher()) return { phase: 'launcher' };
    return { phase: 'loading' };
  }
  function devicesOff() {
    document.querySelectorAll('[role=switch][aria-checked="true"],input[type=checkbox][role=switch]:checked').forEach(e => {
      const l = label(e) + ' ' + norm(e.closest('label,div') ? e.closest('label,div').innerText : '');
      if (/camera|video|كاميرا|فيديو|mic|microphone|ميكروفون|صوت/.test(l)) e.click();
    });
  }
  async function step() {
    const s = phase();
    if (s.phase === 'launcher') B.launcher().click();
    else if (s.phase === 'prejoin') {
      const nav = B.noAV(); if (nav) { nav.click(); await sleep(1500); }
      devicesOff(); await sleep(400);
      const j = B.join(); if (j) j.click();
    }
    return s;
  }

  async function probe() { const s = phase(); if (s.phase === 'launcher') B.launcher().click(); return s; }

  const ORG = ['Organizer', 'Organisers', 'Organizers', 'منظم', 'المنظم', 'مقدمو الاجتماع', 'مقدم الاجتماع'];
  function nameIn(text, teacher) {
    const t = norm(teacher).split(' ').filter(w => w.length > 2 && !['عبد', 'ابو', 'بن'].includes(w));
    if (!t.length) return false;
    const first = t[0], last = t[t.length - 1];
    return text.includes(first) && text.includes(last);
  }
  async function read(teacher) {
    let opened = false;
    for (let i = 0; i < 2 && !opened; i++) {
      const r = B.roster(); if (r) { r.click(); await sleep(3000); }
      opened = has(['In this meeting', 'Attendees', 'في هذا الاجتماع', 'الحضور', 'المشاركون', 'Participants']) || has(ORG);
    }
    await sleep(800);
    const t = txt();
    const tiles = [...document.querySelectorAll('[aria-label]')].map(e => norm(e.getAttribute('aria-label'))).join(' | ');
    const org = ORG.some(w => t.includes(norm(w)));
    const nameHit = nameIn(t + ' | ' + tiles, teacher);
    let att = null;
    const m = t.match(/(attendees|الحضور|in this meeting|في هذا الاجتماع|participants|المشاركون)\s*\(?\s*(\d+)/);
    if (m) att = +m[2];
    else { const rb = B.roster(); const mm = rb && label(rb).match(/(\d+)/); if (mm) att = +mm[1]; }
    const rects = [...document.querySelectorAll('video')].filter(vis).map(v => { const b = v.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
    return { readable: opened || nameHit || att != null, present: org || nameHit, org, nameHit, att, rects, vw: innerWidth };
  }
  async function leave() {
    const h = B.hangup(); if (h) { h.click(); await sleep(1200); }
    const c = B.cancel(); if (c && has([...LOBBY, ...LOBBY_NS])) c.click();
  }

  chrome.runtime.onMessage.addListener((m, s, send) => {
    if (!m || !m.cmd) return;
    if (m.cmd === 'ping') { send({ ok: 1 }); return; }
    const job = m.cmd === 'probe' ? probe() : m.cmd === 'step' ? step() : m.cmd === 'read' ? read(m.teacher) : m.cmd === 'leave' ? leave().then(() => ({ ok: 1 })) : null;
    if (!job) return;
    job.then(send, e => send({ phase: 'error', msg: String(e) }));
    return true;
  });
})();
