/* راصد الآلي – يعمل داخل واتساب ويب فقط عند طلب الإضافة: يضغط «إرسال» للرسالة الجاهزة */
(() => {
  if (window.__rasedWA) return; window.__rasedWA = 1;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const vis = e => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
  const T = () => document.body ? document.body.innerText : '';
  const box = () => document.querySelector('footer div[contenteditable="true"]');
  function sendBtn() {
    const ic = document.querySelector('span[data-icon="send"],span[data-icon="wds-ic-send-filled"]');
    if (ic) return ic.closest('button,[role=button]') || ic;
    return [...document.querySelectorAll('button[aria-label],[role=button][aria-label]')].find(b => vis(b) && /^(send|إرسال)$/i.test((b.getAttribute('aria-label') || '').trim()));
  }
  const loggedOut = () => !document.querySelector('#side,#pane-side,#app header') && /(scan|امسح|link with phone|الربط برقم الهاتف|Use WhatsApp on your computer|استخدم واتساب على جهاز الكمبيوتر)/i.test(T());
  const invalid = () => /(phone number shared via url is invalid|رقم الهاتف الذي تمت مشاركته عبر الرابط غير صالح)/i.test(T());
  async function waSend() {
    const end = Date.now() + 70000;
    while (Date.now() < end) {
      if (invalid()) return { ok: false, err: 'الرقم غير مسجّل في واتساب' };
      if (loggedOut()) return { ok: false, err: 'واتساب ويب غير مسجّل الدخول في هذا المتصفح' };
      const b = sendBtn(), bx = box();
      if (b && bx && bx.innerText.trim()) {
        b.click(); await sleep(3000);
        const bx2 = box(); if (!bx2 || !bx2.innerText.trim()) return { ok: true };
      }
      await sleep(1000);
    }
    return { ok: false, err: 'لم يكتمل الإرسال' };
  }
  chrome.runtime.onMessage.addListener((m, s, send) => {
    if (!m) return;
    if (m.cmd === 'ping') { send({ ok: 1 }); return; }
    if (m.cmd === 'waSend') { waSend().then(send, e => send({ ok: false, err: String(e) })); return true; }
  });
})();
