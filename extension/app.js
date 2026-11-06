/* راصد المبسّط – إعداد وتطوير: عبدالمجيد السيد · 0561955430 */
"use strict";
/* ============ ثوابت ============ */
const DAYS=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'];
const KEY='rased-lite-v1';
const DEF_TIMES=[['07:45','08:24'],['08:25','09:04'],['09:05','09:44'],['09:45','10:24'],['10:25','11:04'],['11:05','11:44'],['11:45','12:24']];
const ST={ok:'حاضر',late:'متأخر',bad:'غائب'};
const IC={
 teams:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/></svg>',
 wa:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3z"/></svg>',
 dl:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11m-5-5 5 5 5-5M5 20h14"/></svg>',
 copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
 up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V9m-5 5 5-5 5 5M5 4h14"/></svg>'
};

/* ============ أدوات ============ */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const pd=s=>{const[a,b,c]=s.split('-').map(Number);return new Date(a,b-1,c)};
const addD=(s,n)=>{const d=pd(s);d.setDate(d.getDate()+n);return ymd(d)};
const wd=s=>{const g=pd(s).getDay();return g<=4?g:-1};       // 0=الأحد .. 4=الخميس
const mins=t=>{const[h,m]=String(t).split(':').map(Number);return h*60+(m||0)};
const hm=()=>{const d=new Date();return `${pad(d.getHours())}:${pad(d.getMinutes())}`};
const fmtDate=s=>pd(s).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn',{day:'numeric',month:'long',year:'numeric'});
const mk=(date,p,c)=>`${date}|${p}|${c}`;
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),2200)}
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}},
  sget(k){try{return sessionStorage.getItem(k)}catch(e){return null}},sset(k,v){try{sessionStorage.setItem(k,v)}catch(e){}}};

function normPhone(p){let d=String(p||'').replace(/\D/g,'');if(!d)return'';if(d.startsWith('00'))d=d.slice(2);
  if(d.startsWith('05')&&d.length===10)d='966'+d.slice(1);else if(d.startsWith('5')&&d.length===9)d='966'+d;return d}
const isMobile=()=>{try{return matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad/i.test(navigator.userAgent)}catch(e){return false}};
function waUrl(phone,text){const p=normPhone(phone);const t=encodeURIComponent(text);
  return isMobile()?`https://wa.me/${p}?text=${t}`:`https://web.whatsapp.com/send?phone=${p}&text=${t}`}

async function copyText(t){try{await navigator.clipboard.writeText(t);toast('نُسخ النص');return true}catch(e){
  const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.append(ta);ta.select();
  let ok=false;try{ok=document.execCommand('copy')}catch(_){}ta.remove();toast(ok?'نُسخ النص':'تعذّر النسخ، انسخه يدويًا');return ok}}

let DL=null;
(async()=>{try{if(window.claude&&claude.use)DL=await claude.use('downloads')}catch(e){DL=null}})();
async function saveFile(name,data,mime){
  if(DL){try{await DL.save({filename:name,data});toast('تم حفظ الملف');return}catch(e){
    if(e&&e.code==='declined')return; if(e&&e.code==='rate_limited'){toast('انتظر قليلًا ثم أعد المحاولة');return}}}
  try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:mime}));a.download=name;document.body.append(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);toast('بدأ تنزيل '+name)}catch(e){toast('التنزيل غير متاح هنا، استخدم النسخ')}}

/* ============ مدرسة تجريبية ============ */
function demoState(){
  const classes=['الأول أ','الثاني أ','الثالث أ','الرابع أ','الخامس أ','السادس أ'];
  const T=[['سالم العتيبي'],['فهد القحطاني'],['ناصر الشمري'],['عمر الزهراني'],['يوسف الغامدي'],['بدر الحربي'],['سعود الدوسري'],['تركي العنزي'],['إبراهيم السبيعي']]
    .map((x,i)=>({t:x[0],ph:'05500000'+pad(i+1)}));
  const rows=[];
  for(let d=0;d<5;d++)for(let p=1;p<=7;p++)classes.forEach((c,ci)=>{const k=(ci+p+d)%9;const T0=T[k];
    rows.push({d,p,c,t:T0.t,ph:T0.ph,l:((d+p*2+ci)%11===0)?'':`https://teams.microsoft.com/l/meetup-join/demo-${d}${p}${ci}`})});
  // تاريخ مرجعي: اليوم إن كان يوم دوام وإلا آخر خميس
  let a=ymd(new Date());while(wd(a)<0)a=addD(a,-1);
  const start=addD(a,-wd(a)), marks={}, sent={};
  const nowP=curPeriod(DEF_TIMES).idx;
  for(let k=0;k<=wd(a);k++){const date=addD(start,k);const isA=date===ymd(new Date());
    const maxP=k<wd(a)?7:(isA?Math.max(1,nowP-1):5);
    for(let p=1;p<=maxP;p++)classes.forEach((c,ci)=>{const r=rows.find(x=>x.d===k&&x.p===p&&x.c===c);if(!r||!r.l)return;
      const h=(k*7+p*13+ci*31)%23;let st='ok';
      if(h===0||h===7||(r.t==='يوسف الغامدي'&&p%3===0))st='bad';else if(h===3||h===11||h===19)st='late';
      marks[mk(date,p,c)]={st,at:DEF_TIMES[p-1][0].replace(/:(\d\d)/,(m,x)=>':'+pad(+x+4))};
      if(st!=='ok')sent[mk(date,p,c)]=DEF_TIMES[p-1][0].replace(/:(\d\d)/,(m,x)=>':'+pad(+x+3));});}
  return{demo:true,settings:{school:'ابتدائية النموذج (مدرسة تجريبية)',mgr:'خالد المالكي',mgrPh:'0550000099',pin:'1234',fpin:'5678',times:DEF_TIMES.map(x=>x.slice())},rows,marks,sent};
}

/* ============ الحالة ============ */
function load(){try{const s=JSON.parse(store.get(KEY));if(s&&s.settings&&Array.isArray(s.rows))return s}catch(e){}return null}
let S=load()||demoState();
S.auto=Object.assign({on:false,sound:true,skip:[],sk:[]},S.auto||{});
const LOWN=5;   // أقل من 5 مشاركين = حضور طلاب ضعيف
/* ---- جسر إضافة «راصد الآلي» (يعمل فقط داخل الإضافة) ---- */
const EXT=!!(window.chrome&&chrome.runtime&&chrome.runtime.id&&chrome.storage&&chrome.storage.local);
let AUTO={_date:null},PRE={},HB=null,TEST=null,UPD=null,WALOG={},WATEST=null,lastCfg='';
S.auto.wa=Object.assign({remind:false,report:false,max:40},S.auto.wa||{});
if(EXT)chrome.storage.local.get('upd').then(o=>{UPD=o.upd||null;if(UPD)render()});
/* ---- سحب الجدول من منصة مدرستي (عبر الإضافة) ---- */
let MP=null;
function mpullSetupHTML(){if(isFol())return'';
  if(!EXT)return `<div class="card small muted" style="margin-top:4px">🔄 <b>سحب الجدول تلقائيًا من مدرستي:</b> متاح عند فتح راصد من إضافة «راصد الآلي»؛ تقرأ جدول كل فصل ومعلميه وأنت مسجّل الدخول في مدرستي.</div>`;
  return `<div class="card" style="display:grid;gap:8px;margin-top:4px"><b>🔄 سحب الجدول من منصة مدرستي</b>
   <p class="small muted" style="margin:0">يفتح مدرستي (سجّل الدخول واختر المدرسة)، ثم اضغط «فحص عينة» للتأكد من الأسماء، ثم «سحب جدول كل الفصول». يُقرأ الجدول فقط ولا يُغيَّر شيء في مدرستي.</p>
   <div class="bar-row" style="margin:0"><button class="btn primary" id="mpGo" type="button">سحب الجدول من مدرستي</button>${S.mpullAt?`<span class="small muted">آخر سحب: ${esc(new Date(S.mpullAt).toLocaleString('ar-SA-u-ca-gregory-nu-latn',{weekday:'long',hour:'2-digit',minute:'2-digit'}))}</span>`:''}</div>
   <label style="display:flex;gap:8px;align-items:center" class="small"><input type="checkbox" id="mpWeek" ${S.auto.mweekly?'checked':''}> تحديث أسبوعي صباح كل أحد (إذا كانت مدرستي مفتوحة)، مع إشعار بالتغييرات قبل تطبيقها</label></div>`}
function mpDiff(rows){const key=r=>r.d+'|'+r.p+'|'+r.c;const A={},B={};S.rows.forEach(r=>A[key(r)]=r);rows.forEach(r=>B[key(r)]=r);const out=[];
  const nm=x=>normAr(x).replace(/\s/g,'');
  for(const k in B){const a=A[k],b=B[k];if(!a)out.push({k,b,kind:'add'});else if(nm(a.t)!==nm(b.t))out.push({k,a,b,kind:'chg'})}
  for(const k in A)if(!B[k])out.push({k,a:A[k],kind:'del'});return out}
function onMpull(v){if(!v||!Array.isArray(v.rows)||!v.rows.length||isFol())return;if((S.mpullAt||0)>=v.at)return;
  if(!v.auto){if(v.school&&(S.demo||/تجريبية|اسم مدرستك/.test(S.settings.school)))S.settings.school=v.school;S.mpullAt=v.at;MP=null;
    applyRows({rows:v.rows.map(r=>Object.assign({},r)),bad:v.skipped||0});return}
  const df=mpDiff(v.rows);if(!df.length){S.mpullAt=v.at;save();return}MP=Object.assign({},v,{diff:df});render()}
function mpBar(){if(!MP||isFol())return'';return `<div class="alertbar" style="background:var(--accent-soft);color:var(--ink)">🔄 تغيّر الجدول في مدرستي: ${MP.diff.length} تغيير.
  <div class="bar-row" style="margin-top:8px"><button class="btn primary" data-mp="show">عرض وتطبيق</button><button class="btn" data-mp="skip">تجاهل</button></div></div>`}
function mpSheet(){const D=MP.diff;const lab={add:'حصة جديدة',chg:'تغيّر المعلم',del:'حُذفت'};
  const d=document.createElement('div');d.className='sheet';d.innerHTML=`<div><h2 style="font-size:18px">تغييرات الجدول من مدرستي</h2>
   <div class="tbl"><table><thead><tr><th>التغيير</th><th>اليوم</th><th>الحصة</th><th>الفصل</th><th>قبل</th><th>بعد</th></tr></thead><tbody>${D.slice(0,200).map(x=>{const r=x.b||x.a;
    return `<tr><td>${lab[x.kind]}</td><td>${DAYS[r.d]}</td><td class="num">${r.p}</td><td>${esc(r.c)}</td><td>${esc(x.a?x.a.t:'—')}</td><td>${esc(x.b?x.b.t:'—')}</td></tr>`}).join('')}</tbody></table></div>
   <div class="bar-row"><button class="btn primary" data-mp="apply">تطبيق التغييرات</button><button class="btn" data-mp="close">إغلاق</button></div></div>`;document.body.append(d)}
document.addEventListener('click',e=>{const b=e.target.closest('[data-mp]');if(!b)return;const k=b.dataset.mp;
  if(k==='show')mpSheet();
  if(k==='close'){const s=document.querySelector('.sheet');if(s)s.remove()}
  if(k==='skip'){S.mpullAt=MP.at;MP=null;save();render()}
  if(k==='apply'){const s=document.querySelector('.sheet');if(s)s.remove();const v=MP;MP=null;S.mpullAt=v.at;applyRows({rows:v.rows.map(r=>Object.assign({},r)),bad:0})}});
if(EXT){chrome.storage.local.get('mpull').then(o=>onMpull(o.mpull));chrome.storage.onChanged.addListener((ch,a)=>{if(a==='local'&&ch.mpull)onMpull(ch.mpull.newValue)})}
function updBar(){if(!EXT||!UPD)return'';return `<div class="alertbar" style="background:var(--accent-soft);color:var(--ink)">🔔 تحديث جديد لإضافة راصد ${esc(UPD.version)} (لديك ${esc(UPD.current)})${UPD.notes?': '+esc(UPD.notes):''}
  <div class="bar-row" style="margin-top:8px">${UPD.zip?`<a class="btn primary" href="${esc(UPD.zip)}" target="_blank" rel="noopener">${IC.dl} تنزيل التحديث</a>`:''}<span class="small" style="font-weight:500">فك الضغط داخل مجلد الإضافة نفسه (استبدال الملفات)، ثم اضغط ↻ على الإضافة في صفحة الإضافات. بياناتك لا تتأثر.</span></div></div>`}
const PLANS={free:'المجانية',trial:'التجربة (14 يومًا)',basic:'الأساسية',pro:'الاحترافية'};
function curPlan(){if(!S.sync)return'free';const p=S.sync.plan||'trial',u=S.sync.until||'';if(u&&u<today())return'free';return p}
const proOK=()=>['pro','trial'].includes(curPlan());
const daysLeft=()=>{const u=S.sync&&S.sync.until;if(!u)return null;return Math.round((pd(u)-pd(today()))/864e5)};
function pushCfg(){if(!EXT)return;const c={rows:S.rows,times:S.settings.times,school:S.settings.school,mgr:S.settings.mgr,mgrPh:S.settings.mgrPh,
  auto:Object.assign({},S.auto,{on:!!(S.auto.on&&proOK()),wa:proOK()?S.auto.wa:{remind:false,report:false,max:0}})};const j=JSON.stringify(c);if(j===lastCfg)return;lastCfg=j;chrome.storage.local.set({cfg:c})}
function save(){store.set(KEY,JSON.stringify(S));pushCfg();if(EXT&&!isFolSafe()&&wd(today())>=0){try{chrome.storage.local.set({['dayrep:'+today()]:dayReport(today()).text})}catch(e){}}}
function isFolSafe(){try{return store.sget('rl-role')==='fol'}catch(e){return false}}
/* ---- الأدوار: المدير والمتابع ---- */
const role=()=>store.sget('rl-role')||'';
function needLock(){return !!(S.settings.pin||S.settings.fpin||(S.sync&&S.sync.key))&&!role()}
const isFol=()=>role()==='fol';
S.settings.fols=Array.isArray(S.settings.fols)?S.settings.fols:[];
const fname=()=>store.get('rl-fname')||'';
const byName=()=>isFol()?(fname()||(S.sync&&S.sync.name)||'المتابع'):'المدير';
const myFol=()=>isFol()?S.settings.fols.find(f=>f.name===fname()):null;
const myPeriods=()=>{const f=myFol();return f&&f.periods&&f.periods.length?f.periods:[]};
const needName=()=>isFol()&&S.settings.fols.length>0&&!myFol();
function pickNameView(){return `<div class="lock"><h1 style="font-size:22px">من أنت؟</h1><p class="muted small" style="margin:0">اختر اسمك ليظهر بجانب رصدك وتظهر حصصك المسندة.</p>
  <div class="picklist">${S.settings.fols.map((f,i)=>`<button class="btn" data-fi="${i}">${esc(f.name)}${f.periods&&f.periods.length?` <span class="small muted">· الحصص ${f.periods.join('، ')}</span>`:''}</button>`).join('')}</div>
  <button class="btn" id="pickOut" style="justify-self:center">خروج</button></div>`}
function bindPick(){document.querySelectorAll('[data-fi]').forEach(b=>b.onclick=()=>{const f=S.settings.fols[+b.dataset.fi];store.set('rl-fname',f.name);V.p=null;render()});
  $('#pickOut').onclick=()=>{store.sset('rl-role','');render()}}
function defaultP(){const c=curPeriod(S.settings.times).idx;const mine=myPeriods();if(!mine.length)return c;return mine.find(p=>p>=c)||mine[0]}
function roleBar(){if(!(S.settings.pin||S.settings.fpin||S.sync)||!role())return'';
  return `<div style="display:flex;gap:6px;align-items:center"><span class="pill">${isFol()?'👤 '+esc(byName()):'المدير'}</span><button class="btn ghost" id="logout">خروج</button></div>`}
/* ---- المزامنة بين الأجهزة (Supabase) ---- */
const SB_URL='https://knrpjgppxdhkdyxcwroe.supabase.co',SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtucnBqZ3BweGRoa2R5eGN3cm9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5OTk4MzMsImV4cCI6MjEwNzU3NTgzM30.T_M5u9G1Ix9nMGCt2Ysm1bmiDzpBppOPsHdJTYVH6Qc';
const ERRS={plan:'لا يوجد اشتراك ساري لهذه المدرسة. فعّل الاشتراك من «الإعداد ← الاشتراك»',license:'كود التفعيل غير صحيح',used:'كود التفعيل مستخدم من قبل',mgr_only:'التفعيل من حساب المدير فقط',bad:'رمز الدخول غير صحيح',none:'رمز المدرسة غير موجود',locked:'محاولات خاطئة كثيرة، حاول بعد ساعة',too_many:'تغييرات كثيرة دفعة واحدة',too_big:'الجدول كبير جدًا'};
const fmtCode=c=>c?c.slice(0,4)+'-'+c.slice(4):'';
async function rpc(fn,args){let r;try{r=await fetch(`${SB_URL}/rest/v1/rpc/${fn}`,{method:'POST',headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY,'Content-Type':'application/json'},body:JSON.stringify(args)})}
  catch(e){throw new Error('تعذّر الاتصال بالإنترنت. المزامنة تعمل من موقع راصد أو من الإضافة.')}
  const j=await r.json().catch(()=>null);if(!r.ok)throw new Error((j&&j.message)||('خطأ '+r.status));if(j&&j.err)throw new Error(ERRS[j.err]||j.err);return j}
S.pend=S.pend||{};
let SYNC_ST={at:'',err:''},syncBusy=false;
const cfgObj=()=>({school:S.settings.school,mgr:S.settings.mgr,mgrPh:S.settings.mgrPh,times:S.settings.times,fols:S.settings.fols||[]});
const cfgSig=()=>JSON.stringify([cfgObj(),S.rows,S.settings.fpin||'']);
function markSync(k){if(!S.sync)return;S.pend[k]=1;clearTimeout(markSync.t);markSync.t=setTimeout(syncNow,800)}
function applyServerCfg(r){if(!r.cfg)return;const c=r.cfg;S.settings.school=c.school||r.name||S.settings.school;S.settings.mgr=c.mgr||'';S.settings.mgrPh=c.mgrPh||'';S.settings.fols=Array.isArray(c.fols)?c.fols:[];
  if(Array.isArray(c.times)&&c.times.length===7)S.settings.times=c.times;if(Array.isArray(r.rows))S.rows=r.rows;S.demo=false}
function applyServerMarks(list){let ch=false;(list||[]).forEach(m=>{if(S.pend[m.k])return;
  if(m.st)S.marks[m.k]={st:m.st,at:m.at,t:m.t,by:m.by,src:m.src};else delete S.marks[m.k];
  if(m.sent)S.sent[m.k]=m.sent;else delete S.sent[m.k];ch=true});return ch}
function syncStHTML(){if(!S.sync)return'';const n=Object.keys(S.pend).length;
  return SYNC_ST.err?`<span style="color:var(--bad)">❌ ${esc(SYNC_ST.err)}</span>`:(SYNC_ST.at?`✅ آخر مزامنة ${SYNC_ST.at}`:'⏳ جارٍ الاتصال…')+(n?` · بانتظار الإرسال: ${n}`:'')}
async function syncNow(){if(!S.sync||syncBusy||needLock())return;syncBusy=true;let ch=false;try{
  const keys=Object.keys(S.pend);
  if(keys.length){const marks=keys.map(k=>{const m=S.marks[k]||{};return{k,st:m.st||null,at:m.at||null,t:m.t||null,by:m.by||null,src:m.src||null,sent:S.sent[k]||null}});
    await rpc('lite_push',{p_code:S.sync.code,p_key:S.sync.key,p_marks:marks});keys.forEach(k=>delete S.pend[k])}
  if(S.sync.role==='mgr'){const sg=cfgSig();const nk=S.settings.pin&&S.settings.pin!==S.sync.key?S.settings.pin:null;
    if(sg!==S.sync.cfgSig||nk){await rpc('lite_set_cfg',{p_code:S.sync.code,p_key:S.sync.key,p_name:S.settings.school,p_cfg:cfgObj(),p_rows:S.rows,p_fol_key:S.settings.fpin||'',p_new_key:nk});
      S.sync.cfgSig=sg;if(nk)S.sync.key=nk}}
  const r=await rpc('lite_pull',{p_code:S.sync.code,p_key:S.sync.key,p_since:S.sync.since||null});
  if(r.cfg&&(S.sync.role==='fol'||cfgSig()===S.sync.cfgSig)){applyServerCfg(r);if(S.sync.role==='mgr')S.sync.cfgSig=cfgSig();ch=true}
  if(applyServerMarks(r.marks))ch=true;
  if(r.plan){S.sync.plan=r.plan;S.sync.until=r.plan_until||''}
  S.sync.since=r.now;SYNC_ST={at:hm(),err:''};store.set(KEY,JSON.stringify(S));
}catch(e){SYNC_ST.err=String(e.message||e);if(SYNC_ST.err===ERRS.plan&&S.sync){S.sync.plan='free';store.set(KEY,JSON.stringify(S))}}finally{syncBusy=false;const el=$('#syncSt');if(el)el.innerHTML=syncStHTML();
  if(ch&&V.tab!=='setup'&&!document.querySelector('.lb,.sheet'))render()}}
setInterval(syncNow,10000);
async function enableSync(){if(!S.settings.pin){toast('ضع رمز دخول المدير أولًا');return}
  const b=$('#syncOn');if(b)b.disabled=true;
  try{const code=await rpc('lite_create',{p_name:S.settings.school,p_mgr_key:S.settings.pin,p_fol_key:S.settings.fpin||null,p_cfg:cfgObj(),p_rows:S.rows});
    S.sync={code,key:S.settings.pin,role:'mgr',name:'المدير',since:null,cfgSig:cfgSig(),plan:'trial',until:addD(today(),14)};S.pend={};
    Object.keys(S.marks).concat(Object.keys(S.sent)).forEach(k=>S.pend[k]=1);save();render();toast('فُعّلت المزامنة');syncNow()}
  catch(e){toast(String(e.message||e));if(b)b.disabled=false}}
async function joinSchool(code,key,name){code=code.toUpperCase().replace(/[^A-Z0-9]/g,'');if(code.length!==8)throw new Error('رمز المدرسة 8 أحرف، مثل ABCD-2345');if(!key)throw new Error('اكتب رمز الدخول');
  const r=await rpc('lite_pull',{p_code:code,p_key:key,p_since:null});
  S={demo:false,settings:{school:'',mgr:'',mgrPh:'',pin:r.role==='mgr'?key:'',fpin:'',times:DEF_TIMES.map(x=>x.slice())},rows:[],marks:{},sent:{},auto:{on:false,sound:true,skip:[],sk:[]},pend:{},
    sync:{code,key,role:r.role,name:name||(r.role==='mgr'?'المدير':'المتابع'),since:r.now,cfgSig:'',plan:r.plan||'free',until:r.plan_until||''}};
  applyServerCfg(r);applyServerMarks(r.marks);S.sync.cfgSig=cfgSig();if(name)store.set('rl-fname',name);save();store.sset('rl-role',r.role);V.date=null;V.p=null;V.tab='now';
  SYNC_ST={at:hm(),err:''};render();toast(r.role==='mgr'?'انضممت بصلاحية المدير':'انضممت متابعًا')}
function planSetupHTML(){const p=curPlan(),dl=daysLeft();
  const contact=waUrl('0561955430',`السلام عليكم، أرغب في الاشتراك في راصد المبسّط\nالمدرسة: ${S.settings.school}${S.sync?`\nرمز المدرسة: ${fmtCode(S.sync.code)}`:''}`);
  return `<div class="section"><h3>٦. الاشتراك</h3><div class="card" style="display:grid;gap:12px">
   <div>الباقة الحالية: <b>${PLANS[p]}</b>${S.sync&&p!=='free'&&dl!=null?` <span class="pill ${dl<=7?'late':'ok'}">${dl>=0?`متبقٍ ${dl} يوم`:'منتهية'}</span>`:''}</div>
   <div class="tbl"><table><thead><tr><th>الباقة</th><th>السعر (لكل فصل دراسي)</th><th>تشمل</th></tr></thead><tbody>
    <tr><td>المجانية</td><td class="num">0</td><td class="small">جهاز واحد: الرصد والتذكير اليدوي والتقارير</td></tr>
    <tr><td>الأساسية</td><td class="num">149 ر.س</td><td class="small">+ متابعون على أجهزتهم ومزامنة لحظية</td></tr>
    <tr><td>الاحترافية</td><td class="num">349 ر.س</td><td class="small">+ الفحص الآلي ولقطات الشاشة والإرسال الآلي ودعم واتساب</td></tr>
   </tbody></table></div>
   <p class="small muted" style="margin:0">خصم 25% لخمس مدارس فأكثر. تفعيل المزامنة يمنح تجربة مجانية للباقة الاحترافية 14 يومًا.</p>
   <div class="bar-row" style="margin:0"><a class="btn wa" href="${esc(contact)}" target="_blank" rel="noopener">${IC.wa} طلب اشتراك</a></div>
   <label class="f" style="max-width:320px">كود التفعيل<input id="licIn" dir="ltr" autocomplete="off" placeholder="RSD-XXXX-XXXX"></label>
   <div class="bar-row" style="margin:0"><button class="btn primary" id="licB" type="button">تفعيل</button><span class="small" id="licOut"></span></div></div></div>`}
async function activateLicense(){const v=$('#licIn').value.trim().toUpperCase();if(!v){toast('اكتب كود التفعيل');return}
  const out=$('#licOut'),b=$('#licB');b.disabled=true;out.textContent='⏳ جارٍ التفعيل…';
  try{if(!S.sync){if(!S.settings.pin){throw new Error('ضع رمز دخول المدير في «بيانات المدرسة» واحفظ أولًا')}await enableSync();if(!S.sync)throw new Error('تعذّر تفعيل المزامنة')}
    const r=await rpc('lite_activate',{p_code:S.sync.code,p_key:S.sync.key,p_license:v});S.sync.plan=r.plan;S.sync.until=r.plan_until;save();render();toast(`فُعّلت الباقة ${PLANS[r.plan]} حتى ${r.plan_until}`)}
  catch(e){out.innerHTML=`<span style="color:var(--bad)">${esc(String(e.message||e))}</span>`;b.disabled=false}}
function planBar(){if(isFol()||!S.sync)return'';const p=curPlan(),dl=daysLeft();
  if(p==='free')return `<div class="alertbar">⚠️ انتهى اشتراك المزامنة لهذه المدرسة، فتوقفت مزامنة المتابعين. <a href="#setup">فعّل الاشتراك</a></div>`;
  if(dl!=null&&dl<=7)return `<div class="demo-bar"><span>⏳ ${p==='trial'?'التجربة المجانية':'الاشتراك'} ينتهي بعد ${dl} يوم.</span><a class="btn" href="#setup">الاشتراك</a></div>`;return''}
function syncSetupHTML(){
  if(!S.sync)return `<div class="section"><h3>٥. المزامنة بين الأجهزة</h3><div class="card" style="display:grid;gap:10px">
   <p class="small muted" style="margin:0">تجعل رصد المتابعين على أجهزتهم يظهر عند المدير خلال ثوانٍ، ويصلهم الجدول وتعديلاته تلقائيًا. تحتاج اتصالًا بالإنترنت، والبيانات محمية برمز المدرسة والرموز السرية.</p>
   ${S.settings.pin?'':'<p class="small" style="color:var(--bad);margin:0">ضع «رمز دخول المدير» في بيانات المدرسة واحفظ أولًا.</p>'}
   <div><button class="btn primary" id="syncOn" ${S.settings.pin?'':'disabled'}>تفعيل المزامنة</button></div></div></div>`;
  return `<div class="section"><h3>٥. المزامنة بين الأجهزة</h3><div class="card" style="display:grid;gap:10px">
   <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">رمز المدرسة: <b class="num" style="font-size:22px;letter-spacing:.08em" dir="ltr">${fmtCode(S.sync.code)}</b><button class="btn" id="cpCode">${IC.copy} نسخ</button></div>
   <ol class="steps small"><li>في جهاز المتابع: افتح راصد ← «الانضمام لمدرسة من جهاز آخر».</li><li>يكتب رمز المدرسة، ورمز المتابع${S.settings.fpin?'':' (حدّده أولًا في «بيانات المدرسة»)'}، واسمه.</li><li>يظهر رصده هنا مع اسمه، ويصله الجدول وكل تعديل عليه تلقائيًا.</li></ol>
   <div class="small" id="syncSt">${syncStHTML()}</div>
   <div class="bar-row" style="margin:0"><button class="btn" id="syncNowB">مزامنة الآن</button><button class="btn danger" id="syncOff">إيقاف المزامنة في هذا الجهاز</button></div></div></div>`}
function teacherOf(k,m){if(m&&m.t)return m.t;const[d,p,c]=k.split('|');const r=S.rows.find(x=>x.d===wd(d)&&x.p===+p&&x.c===c);return r?r.t:''}
function mergeAuto(){let ch=false;for(const[k,r]of Object.entries(AUTO)){if(k[0]==='_'||!r||!r.final||r.st==='unk')continue;const m=S.marks[k];
  if((!m||m.src==='auto')&&(!m||m.st!==r.st)){S.marks[k]={st:r.st,at:r.at,src:'auto',t:r.t||teacherOf(k),by:'🤖 آلي'};markSync(k);ch=true}}if(ch)store.set(KEY,JSON.stringify(S))}
function ensureAuto(){if(!EXT||AUTO._date===V.date)return;const d=V.date;AUTO={_date:d};PRE={};
  chrome.storage.local.get(['res:'+d,'pre:'+d,'hb','test:last','walog:'+d,'watest']).then(o=>{if(V.date!==d)return;AUTO=Object.assign({_date:d},o['res:'+d]||{});PRE=o['pre:'+d]||{};HB=o.hb||null;TEST=o['test:last']||null;WALOG=o['walog:'+d]||{};WATEST=o.watest||null;mergeWA();mergeAuto();render()})}
function beep(){try{const A=new(window.AudioContext||window.webkitAudioContext)();[880,660,880].forEach((f,i)=>{const o=A.createOscillator(),g=A.createGain();o.frequency.value=f;o.connect(g);g.connect(A.destination);
  const t=A.currentTime+i*.28;g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.start(t);o.stop(t+.26)})}catch(e){}}
if(EXT)chrome.storage.onChanged.addListener((ch,a)=>{if(a!=='local')return;let re=false;
  const tk='res:'+today();
  if(ch[tk]&&S.auto.sound){const nv=ch[tk].newValue||{},ov=ch[tk].oldValue||{};for(const k in nv){const n=nv[k],o=ov[k];if(!n||!n.checks)continue;
    if((o&&o.checks?o.checks.length:0)<n.checks.length&&!n.checks[n.checks.length-1].present){beep();break}}}
  const k='res:'+V.date;if(ch[k]){AUTO=Object.assign({_date:V.date},ch[k].newValue||{});mergeAuto();re=true}
  if(ch['pre:'+V.date]){PRE=ch['pre:'+V.date].newValue||{};re=true}
  if(ch.hb){HB=ch.hb.newValue;re=true}
  if(ch['walog:'+V.date]){WALOG=ch['walog:'+V.date].newValue||{};mergeWA();re=true}
  if(ch.watest){WATEST=ch.watest.newValue;const o=$('#waTestOut');if(o)o.innerHTML=waTestHTML()}
  if(ch.upd){UPD=ch.upd.newValue||null;re=true}
  if(ch['test:last']){TEST=ch['test:last'].newValue;const o=$('#testOut');if(o)o.innerHTML=testHTML()}
  if(re&&V.tab!=='setup'&&!document.querySelector('.lb,.sheet'))render()});
async function showImg(id){if(!EXT){toast('اللقطات متاحة داخل الإضافة');return}const o=await chrome.storage.local.get('img:'+id);const src=o['img:'+id];if(!src){toast('اللقطة غير موجودة');return}
  const d=document.createElement('div');d.className='lb';d.innerHTML=`<img alt="لقطة الفحص" src="${src}"><button class="btn">إغلاق</button>`;d.onclick=()=>d.remove();document.body.append(d)}
function linkText(r,kind){return `الأستاذ/ ${r.t}\nالسلام عليكم ورحمة الله وبركاته\n`+(kind==='bad'?`رابط حصتك (${r.p}) للصف ${r.c} لا يفتح اجتماعًا في Teams.`:`حصتك (${r.p}) للصف ${r.c} ليس لها رابط اجتماع في الجدول.`)+
  `\nنأمل إنشاء الاجتماع وإرسال الرابط قبل موعد الحصة ${S.settings.times[r.p-1][0]}.\nشاكرين تعاونكم\n${S.settings.school}`}
function isLow(a){if(!a||!a.final||!(a.st==='ok'||a.st==='late'))return false;const l=a.checks[a.checks.length-1];return l&&l.att!=null&&l.att<LOWN}
function noteHTML(k,m,sent,r){const a=AUTO[k],pr=PRE[k];const P=[];
  if(m)P.push(`<span>${m.src==='auto'?'🤖 ':''}رُصد «${ST[m.st]}» ${m.at}${m.by&&m.src!=='auto'?' · '+esc(m.by):''}</span>`);
  if(a&&a.checks&&a.checks.length){const last=a.checks[a.checks.length-1];
    if(!a.final)P.push(`<span style="color:var(--late)">🤖 الفحص ${last.n} (${last.at}): ${esc(a.why||'غير موجود')}${a.next?` · الفحص التالي ${a.next}`:''}</span>`);
    else if(a.st==='unk')P.push(`<span style="color:var(--bad)">🤖 تعذّر التحقق: ${esc(a.why||'')}</span>`);
    else if(a.st==='bad'&&a.why)P.push(`<span>🤖 ${esc(a.why)}</span>`);
    if(last.att!=null)P.push(`<span>👥 ${last.att} مشارك</span>`);
    if(isLow(a))P.push(`<span class="pill late">👥 حضور طلاب ضعيف</span>`);
    const sh=a.checks.filter(c=>c.img);if(sh.length)P.push(`<span>${sh.map(c=>`<button class="shot" data-img="${esc(c.img)}">📷 ${c.n}</button>`).join(' ')}</span>`)}
  if(r&&r.l&&pr&&pr.bad)P.push(`<span style="color:var(--bad)">⚠️ الرابط لا يعمل (فُحص ${pr.at})</span>`);
  if(r&&(!r.l||(pr&&pr.bad))){if(normPhone(r.ph))P.push(`<a class="shot" href="${esc(waUrl(r.ph,linkText(r,r.l?'bad':'none')))}" target="_blank" rel="noopener">📩 طلب رابط</a>`);
    if(!isFol())P.push(`<button class="shot" data-edit="${esc(k)}">✎ ${r.l?'تعديل الرابط':'إضافة رابط'}</button>`)}
  if(sent)P.push(`<span class="sent">✓ أُرسل التذكير ${sent}</span>`);
  return P.length?`<div class="note num">${P.join('')}</div>`:''}
function mergeWA(){let ch=false;for(const v of Object.values(WALOG||{})){if(v&&v.ok&&v.k&&!S.sent[v.k]){S.sent[v.k]=v.at+'🤖';markSync(v.k);ch=true}}if(ch)store.set(KEY,JSON.stringify(S))}
function waTestHTML(){return WATEST?(WATEST.ok?`✅ أُرسلت رسالة الاختبار لجوال المدير ${WATEST.at}`:`<span style="color:var(--bad)">❌ ${esc(WATEST.err||'تعذّر الإرسال')} (${WATEST.at})</span>`):''}
function hotWA(k,m,sent){if(sent)return false;if(m&&m.st!=='ok')return true;const a=AUTO[k];return !!(a&&!a.final)}
function missedPeriods(){if(!EXT||!S.auto.on||V.date!==today())return[];const d=wd(V.date);if(d<0)return[];const now=mins(hm());const sk=new Set(S.auto.sk||[]);const out=[];
  for(let p=1;p<=7;p++){if(sk.has(d+'-'+p))continue;const L=S.rows.filter(r=>r.d===d&&r.p===p&&r.l);if(!L.length)continue;
    if(now<mins(S.settings.times[p-1][0])+9)continue;if(!L.some(r=>AUTO[mk(V.date,p,r.c)]))out.push(p)}return out}
function autoBarHTML(){if(!EXT)return'';const miss=missedPeriods();
  return (miss.length?`<div class="alertbar">⚠️ لم تُفحص آليًا في موعدها: ${miss.map(p=>'الحصة '+p).join('، ')}. تأكد أن الجهاز يعمل وأن Teams مسجّل الدخول، ثم اضغط «افحص هذه الحصة الآن».</div>`:'')+
  `<div class="autobar">🤖 الفحص الآلي: ${S.auto.on?'<b style="color:var(--ok)">مفعّل</b>':'<b>متوقف</b> – فعّله من «الإعداد والجدول»'}${(()=>{const v=Object.values(WALOG||{});const ok=v.filter(x=>x.ok).length,bad=v.filter(x=>!x.ok).length;return ok||bad?` · 📤 أُرسل آليًا ${ok}${bad?` <span style="color:var(--bad)">· تعذّر ${bad}</span>`:''}`:''})()}${HB?` · آخر فحص ${HB.at}${HB.err?` <span style="color:var(--bad)">(${esc(HB.err)})</span>`:''}`:''}<button class="btn" id="runNow">افحص هذه الحصة الآن</button></div>`}
function testHTML(){if(!TEST)return'<p class="small muted" style="margin:0">لم يُجرَ اختبار بعد.</p>';
  return `<div class="small"><b>${TEST.done?(TEST.ok?'✅ نجح الاختبار':'❌ لم ينجح الاختبار'):'⏳ جارٍ الاختبار…'}</b> <span class="muted num">${esc(TEST.at||'')}</span></div>
  <ol class="steps small">${(TEST.steps||[]).map(x=>`<li>${x.ok===false?'❌':x.ok?'✅':'•'} ${esc(x.m)} <span class="muted num">${esc(x.at)}</span></li>`).join('')}</ol>
  ${TEST.shot?`<img src="${TEST.shot}" alt="لقطة الاختبار" style="border-radius:8px;border:1px solid var(--line);max-width:min(100%,460px)">`:''}`}
function autoSetupHTML(){
  if(EXT&&!proOK())return `<div class="section"><h3>٤. الفحص الآلي</h3><div class="card" style="display:grid;gap:8px"><b>🔒 متاح في الباقة الاحترافية</b>
   <p class="small muted" style="margin:0">الفحص الآلي ولقطات الشاشة والإرسال الآلي عبر واتساب ضمن الباقة الاحترافية. فعّل المزامنة لتحصل على تجربة مجانية 14 يومًا، أو فعّل اشتراكك من قسم «الاشتراك».</p></div></div>`;
  if(!EXT)return `<div class="section"><h3>٤. الفحص الآلي</h3><div class="card small muted">الدخول الآلي على الحصص ولقطات الشاشة يعملان عند فتح راصد من إضافة «راصد الآلي» على Chrome أو Edge، في جهاز مسجّل في Teams بالحساب المدعو لاجتماعات المعلمين.</div></div>`;
  return `<div class="section"><h3>٤. الفحص الآلي</h3><div class="card" style="display:grid;gap:10px">
   <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="autoOn" ${S.auto.on?'checked':''}> تشغيل الفحص الآلي في أوقات الحصص</label>
   <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="autoSound" ${S.auto.sound?'checked':''}> صوت تنبيه عند عدم وجود معلم (والصفحة مفتوحة)</label>
   <p class="small muted" style="margin:0">قبل كل حصة بعشر دقائق تُفحص روابطها. بعد بدايتها بـ3 دقائق يُفحص كل اجتماع، ثم بعد 7 ثم 18 لمن لم يُوجد. لا يُسجَّل «غائب» إلا بعد الفحص الأخير، ومن يدخل بعد الأول يُسجَّل «متأخر». لكل فحص لقطة شاشة كاملة مختومة بالوقت للتوثيق، تُحفظ ملفًا في مجلد «التنزيلات/راصد/التاريخ/الحصة» على هذا الجهاز.</p>
   <p class="small muted" style="margin:0">يبقى الجهاز مستيقظًا تلقائيًا من قبل الحصة الأولى إلى بعد الأخيرة. وإن فاتت حصة (الجهاز نائم أو المتصفح مغلق) يظهر تنبيه ويبدأ فحص تعويضي ما دامت الحصة قائمة. لا تغلق نافذة الفحص ولا تصغّرها.</p>
   <label class="f" style="max-width:340px">حصص لا تُفحص<input id="autoSkip" value="${esc((S.auto.skip||[]).join('، '))}" placeholder="مثال: خميس 7، أحد 1"></label>
   <div style="display:grid;gap:8px;background:var(--surface);border-radius:12px;padding:12px"><b>📤 الإرسال الآلي عبر واتساب ويب</b>
    <p class="small muted" style="margin:0">ترسل الإضافة الرسائل من رقم واتساب المسجّل في واتساب ويب على هذا المتصفح (يُفضّل رقم المدرسة). افتح web.whatsapp.com مرة وسجّل الدخول بمسح الرمز.</p>
    <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="waRemind" ${S.auto.wa.remind?'checked':''}> تذكير المعلم تلقائيًا إذا لم يُوجد في الفحص الأول (مرة واحدة لكل حصة)</label>
    <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="waReport" ${S.auto.wa.report?'checked':''}> إرسال تقرير اليوم للمدير بعد آخر حصة بـ20 دقيقة</label>
    <label class="f" style="max-width:220px">الحد الأعلى للرسائل يوميًا<input id="waMax" type="number" min="1" max="200" value="${S.auto.wa.max||40}"></label>
    <p class="small" style="margin:0;color:var(--late)">تنبيه: الإرسال الآلي الكثيف قد يعرّض الرقم لتقييد من واتساب، فأبقِ الحد منخفضًا.</p>
    <div class="bar-row" style="margin:0"><button class="btn" id="waTest" type="button">إرسال رسالة اختبار للمدير</button><span class="small" id="waTestOut">${waTestHTML()}</span></div></div>
   <div><button class="btn primary" id="saveAuto">حفظ</button></div></div>
   <div class="card" style="display:grid;gap:10px;margin-top:10px"><b>اختبار الإعداد</b>
   <p class="small muted" style="margin:0">يفتح اجتماعًا واحدًا الآن ويعرض نتيجة كل خطوة ولقطة الشاشة. اتركه فارغًا لاختبار أول رابط في الجدول. نفّذه في أول يوم على أي جهاز جديد.</p>
   <div class="grid2"><label class="f">رابط اجتماع<input id="testLink" dir="ltr" placeholder="https://teams.microsoft.com/..."></label><label class="f">اسم المعلم المنظِّم<input id="testT"></label></div>
   <div><button class="btn" id="runTest">ابدأ الاختبار</button></div><div id="testOut">${testHTML()}</div></div></div>`}
function editLink(k){const[d,p,c]=k.split('|');const D=wd(d);const r=S.rows.find(x=>x.d===D&&x.p===+p&&x.c===c);if(!r)return;
  const el=document.createElement('div');el.className='sheet';el.innerHTML=`<div role="dialog" aria-label="رابط الحصة"><h2 style="font-size:18px">رابط الحصة ${p} – ${esc(c)} (كل ${DAYS[D]})</h2>
   <p class="small muted" style="margin:0">الأستاذ/ ${esc(r.t)}. الصق رابط اجتماع Teams الجديد.</p>
   <label class="f">الرابط<input id="elink" dir="ltr" value="${esc(r.l)}" placeholder="https://teams.microsoft.com/..."></label>
   <p id="eerr" class="small" style="color:var(--bad);margin:0"></p>
   <div class="bar-row" style="margin:0"><button class="btn primary" id="esave">حفظ</button><button class="btn" data-x>إلغاء</button></div></div>`;
  el.addEventListener('click',e=>{if(e.target===el||e.target.closest('[data-x]'))el.remove()});document.body.append(el);const inp=el.querySelector('#elink');inp.focus();
  el.querySelector('#esave').onclick=()=>{const v=inp.value.trim();if(v&&!/^https?:\/\//i.test(v)){el.querySelector('#eerr').textContent='الرابط يجب أن يبدأ بـ https://';return}
    r.l=v;delete PRE[k];save();el.remove();render();toast('حُفظ الرابط')}}
async function openTeacher(name,range){range=range||'month';const ref=V.date;let from='';
  if(range==='week'){let d=ref;while(wd(d)<0)d=addD(d,-1);from=addD(d,-wd(d))}else if(range==='month')from=ref.slice(0,8)+'01';
  const L=[];for(const[k,m]of Object.entries(S.marks)){const[d,p,c]=k.split('|');if(range!=='all'&&(d<from||d>ref))continue;if(teacherOf(k,m)!==name)continue;L.push({k,d,p:+p,c,m})}
  L.sort((a,b)=>a.d===b.d?a.p-b.p:(a.d<b.d?1:-1));
  let res={};if(EXT&&L.length)res=await chrome.storage.local.get([...new Set(L.map(x=>'res:'+x.d))]);
  const T={ok:0,late:0,bad:0};L.forEach(x=>T[x.m.st]++);const n=L.length,pct=n?Math.round((T.ok+T.late)/n*100):0;
  const row=x=>{const a=(res['res:'+x.d]||{})[x.k];const sh=(a&&a.checks||[]).filter(c=>c.img);
    return `<tr><td>${DAYS[wd(x.d)]||''} ${x.d.slice(8)}/${x.d.slice(5,7)}</td><td class="c">${x.p}</td><td>${esc(x.c)}</td><td><span class="pill ${x.m.st}">${ST[x.m.st]}</span></td><td class="c">${esc(x.m.at||'')}</td><td>${sh.map(c=>`<button class="shot" data-img="${esc(c.img)}">📷 ${c.n}</button>`).join(' ')||'—'}</td></tr>`};
  document.querySelectorAll('.sheet').forEach(x=>x.remove());
  const el=document.createElement('div');el.className='sheet';el.innerHTML=`<div role="dialog" aria-label="سجل المعلم">
   <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><h2 style="font-size:19px">سجل الأستاذ/ ${esc(name)}</h2><button class="btn" data-x>إغلاق</button></div>
   <div class="tabs" style="margin:0">${[['week','هذا الأسبوع'],['month','هذا الشهر'],['all','الكل']].map(([v,t])=>`<a href="#" data-range="${v}" ${v===range?'aria-current="page"':''}>${t}</a>`).join('')}</div>
   <div class="stats num"><div class="stat"><b>${pct}%</b><span>نسبة الحضور (${n} حصة)</span></div><div class="stat ok"><b>${T.ok}</b><span>حاضر</span></div><div class="stat late"><b>${T.late}</b><span>متأخر</span></div><div class="stat bad"><b>${T.bad}</b><span>غائب</span></div></div>
   ${n?`<div class="tbl"><table class="num"><thead><tr><th>اليوم</th><th>الحصة</th><th>الصف</th><th>الحالة</th><th>الوقت</th><th>اللقطات</th></tr></thead><tbody>${L.map(row).join('')}</tbody></table></div>`:'<div class="empty" style="margin:0">لا رصد في هذه المدة.</div>'}</div>`;
  el.addEventListener('click',e=>{if(e.target===el||e.target.closest('[data-x]')){el.remove();return}
    const rg=e.target.closest('[data-range]');if(rg){e.preventDefault();openTeacher(name,rg.dataset.range);return}
    const im=e.target.closest('[data-img]');if(im)showImg(im.dataset.img)});
  document.body.append(el)}
document.addEventListener('click',e=>{if(isFol())return;const t=e.target.closest('[data-teacher]');if(t){openTeacher(t.dataset.teacher);return}const ed=e.target.closest('[data-edit]');if(ed)editLink(ed.dataset.edit)});
const V={tab:'now',date:null,p:null};

function curPeriod(times){const n=new Date(),m=n.getHours()*60+n.getMinutes();
  for(let i=0;i<times.length;i++){if(m>=mins(times[i][0])&&m<=mins(times[i][1]))return{idx:i+1,state:'live'}}
  for(let i=0;i<times.length;i++){if(mins(times[i][0])>m)return{idx:i+1,state:'next'}}
  return{idx:times.length,state:'done'}}
function defaultDate(){let a=ymd(new Date());while(wd(a)<0)a=addD(a,-1);return a}
const today=()=>ymd(new Date());

function rowsFor(date,p){const d=wd(date);return S.rows.filter(r=>r.d===d&&r.p===p).sort((a,b)=>a.c.localeCompare(b.c,'ar'))}
function tally(list,date){const o={ok:0,late:0,bad:0,un:0,nl:0,total:list.length};
  list.forEach(r=>{if(!r.l){o.nl++}const m=S.marks[mk(date,r.p,r.c)];if(m)o[m.st]++;else o.un++});return o}

/* ============ نصوص الرسائل ============ */
function remindText(r,date){const tm=S.settings.times[r.p-1][0];
  return `الأستاذ/ ${r.t}\nالسلام عليكم ورحمة الله وبركاته\nحصتك (${r.p}) للصف ${r.c} بدأت الساعة ${tm}، نأمل الدخول إلى الحصة الافتراضية الآن.`+
   (r.l?`\nرابط الحصة: ${r.l}`:'')+`\nشاكرين تعاونكم\n${S.settings.school}`}

function dayReport(date){const d=wd(date);const all=S.rows.filter(r=>r.d===d);const t=tally(all,date);
  const marked=t.ok+t.late+t.bad;const pct=marked?Math.round((t.ok+t.late)/marked*100):0;
  const lines=[`📋 تقرير حضور المعلمين – ${S.settings.school}`,`${DAYS[d]} ${fmtDate(date)}`,'',
    `✅ حاضر: ${t.ok} · ⏱ متأخر: ${t.late} · ❌ غائب: ${t.bad}`,`نسبة الحضور: ${pct}% من ${marked} حصة مرصودة`+(t.un?` · لم يُرصد: ${t.un}`:'')];
  const bad=all.filter(r=>S.marks[mk(date,r.p,r.c)]?.st==='bad').sort((a,b)=>a.p-b.p);
  const late=all.filter(r=>S.marks[mk(date,r.p,r.c)]?.st==='late').sort((a,b)=>a.p-b.p);
  if(bad.length){lines.push('','❌ الغياب:');bad.forEach(r=>lines.push(`• الأستاذ/ ${r.t} – الحصة ${r.p} – ${r.c}`))}
  if(late.length){lines.push('','⏱ التأخر:');late.forEach(r=>lines.push(`• الأستاذ/ ${r.t} – الحصة ${r.p} – ${r.c}`))}
  if(typeof AUTO!=='undefined'&&AUTO._date===date){const low=all.filter(r=>isLow(AUTO[mk(date,r.p,r.c)])).sort((a,b)=>a.p-b.p);
    if(low.length){lines.push('','👥 حضور طلاب ضعيف (أقل من '+LOWN+'):');low.forEach(r=>lines.push(`• الأستاذ/ ${r.t} – الحصة ${r.p} – ${r.c}`))}}
  if(!bad.length&&!late.length&&marked)lines.push('','حضور كامل في كل الحصص المرصودة.');
  return{t,pct,marked,bad,late,text:lines.join('\n')}}

function rangeData(days,kind){const per={};const T={ok:0,late:0,bad:0,un:0};const byDay=[];
  days.forEach(ds=>{const k=wd(ds);if(k<0)return;const all=S.rows.filter(r=>r.d===k);const t=tally(all,ds);byDay.push({ds,k,t});['ok','late','bad'].forEach(x=>T[x]+=t[x]);
    all.forEach(r=>{const m=S.marks[mk(ds,r.p,r.c)];if(!m)return;const name=m.t||r.t;const o=per[name]||(per[name]={t:name,ok:0,late:0,bad:0,list:[]});o[m.st]++;
      if(m.st==='bad')o.list.push(kind==='month'?`${+ds.slice(8)}/${+ds.slice(5,7)} ح${r.p}`:`${DAYS[k]} ح${r.p}`)})});
  const teachers=Object.values(per).map(o=>({...o,n:o.ok+o.late+o.bad,pct:Math.round((o.ok+o.late)/Math.max(1,o.ok+o.late+o.bad)*100)}))
    .sort((a,b)=>b.bad-a.bad||b.late-a.late||a.t.localeCompare(b.t,'ar'));
  const marked=T.ok+T.late+T.bad,pct=marked?Math.round((T.ok+T.late)/marked*100):0;
  const rep=teachers.filter(o=>o.bad>=(kind==='month'?3:2));
  const from=days[0],to=days[days.length-1];
  const title=kind==='month'?'التقرير الشهري':'التقرير الأسبوعي';
  const span=kind==='month'?`شهر ${pd(from).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn',{month:'long',year:'numeric'})}`:`من ${fmtDate(from)} إلى ${fmtDate(to)}`;
  const lines=[`📊 ${title} – ${S.settings.school}`,span,'',`✅ نسبة حضور المعلمين: ${pct}% (${T.ok+T.late} من ${marked} حصة)`,`❌ غياب: ${T.bad} · ⏱ تأخر: ${T.late}`];
  if(rep.length){lines.push('','🔁 تكرر غيابهم:');rep.forEach(o=>lines.push(`• الأستاذ/ ${o.t}: ${o.bad===2?'حصتان':o.bad+' حصص'}`))}
  return{kind,title,span,days,from,to,byDay,teachers,T,pct,marked,rep,text:lines.join('\n')}}
function weekData(date){let d=date;while(wd(d)<0)d=addD(d,-1);const start=addD(d,-wd(d));return rangeData([0,1,2,3,4].map(k=>addD(start,k)),'week')}
function monthData(date){const y=+date.slice(0,4),m=+date.slice(5,7),n=new Date(y,m,0).getDate();const days=[];
  for(let i=1;i<=n;i++){const ds=`${y}-${pad(m)}-${pad(i)}`;if(wd(ds)>=0)days.push(ds)}return rangeData(days,'month')}
function teachersTable(W){return W.teachers.length?`<div class="tbl"><table class="num"><thead><tr><th>المعلم</th><th>مرصودة</th><th>حاضر</th><th>متأخر</th><th>غائب</th><th>النسبة</th><th>مواضع الغياب</th></tr></thead><tbody>
   ${W.teachers.map(o=>`<tr><td><button class="tlink" data-teacher="${esc(o.t)}">الأستاذ/ ${esc(o.t)}</button>${W.rep.includes(o)?` <span class="pill bad">تكرر</span>`:''}</td><td class="c">${o.n}</td><td class="c">${o.ok}</td><td class="c">${o.late}</td><td class="c" style="color:${o.bad?'var(--bad)':''}">${o.bad}</td><td class="c">${o.pct}%</td><td class="small muted">${esc(o.list.join('، '))}</td></tr>`).join('')}
   </tbody></table></div>`:`<div class="empty">لا رصد في هذه المدة بعد.</div>`}
function monthView(){const W=monthData(V.date),T=W.T;const weeks={};
  W.byDay.forEach(x=>{const st=addD(x.ds,-x.k);const o=weeks[st]||(weeks[st]={s:x.ds,e:x.ds,ok:0,late:0,bad:0,un:0});o.e=x.ds;['ok','late','bad','un'].forEach(q=>o[q]+=x.t[q])});
  return dayBar('تقرير الشهر')+`<p class="muted small" style="margin:4px 0 0">${esc(W.span)}</p>
   <div class="section stats num"><div class="stat"><b>${W.pct}%</b><span>نسبة الحضور</span></div><div class="stat ok"><b>${T.ok}</b><span>حاضر</span></div>
   <div class="stat late"><b>${T.late}</b><span>متأخر</span></div><div class="stat bad"><b>${T.bad}</b><span>غائب</span></div></div>
   <div class="section"><h3>الأسابيع</h3><div class="tbl"><table class="num"><thead><tr><th>الأسبوع</th><th>حاضر</th><th>متأخر</th><th>غائب</th><th>لم يُرصد</th><th>النسبة</th></tr></thead><tbody>
   ${Object.values(weeks).map(w=>{const m=w.ok+w.late+w.bad;return `<tr><td><button class="btn" data-week="${w.s}">${+w.s.slice(8)}–${+w.e.slice(8)}/${+w.s.slice(5,7)}</button></td><td class="c">${w.ok}</td><td class="c">${w.late}</td><td class="c">${w.bad}</td><td class="c">${w.un}</td><td class="c">${m?Math.round((w.ok+w.late)/m*100)+'%':'—'}</td></tr>`}).join('')}
   </tbody></table></div></div>
   <div class="section"><h3>انضباط المعلمين</h3>${teachersTable(W)}</div>`+msgBlock('رسالة التقرير الشهري للمدير',W.text,'rep-month')}

/* ============ العرض ============ */
function render(){
  const app=$('#app');
  if(needLock()){app.innerHTML=lockView();bindLock();return}
  if(needName()){app.innerHTML=pickNameView();bindPick();return}
  if(isFol()&&V.tab!=='now')V.tab='now';
  if(!V.date)V.date=defaultDate();
  if(!V.p)V.p=defaultP();
  ensureAuto();
  app.innerHTML=header()+'<main class="panel'+(V.anim?' enter':'')+'">'+topBars()+({now:nowView,day:dayView,week:weekView,month:monthView,setup:setupView}[V.tab]||nowView)()+'</main>'+
    `<footer>راصد المبسّط · البيانات محفوظة على هذا الجهاز فقط<br><span class="credit">إعداد وتطوير: عبدالمجيد السيد · 0561955430</span> · جميع الحقوق محفوظة © 2026${PWA?' · <a href="about/">ما هو راصد؟</a>':''}</footer>`;
  bind();
}
function topBars(){return installBar()+planBar()+`${S.demo&&!isFol()?`<div class="demo-bar"><span>تعرض الآن <b>مدرسة تجريبية وهمية</b> للتجربة. ارفع جدول مدرستك من «الإعداد والجدول» لتبدأ.</span><button class="btn" id="wizB">ابدأ مدرستك في 3 خطوات</button></div>`:''}${updBar()}${mpBar()}`}
function header(){const cp=curPeriod(S.settings.times);const isToday=V.date===today();
  const tab=(id,t)=>`<a href="#${id}" ${V.tab===id?'aria-current="page"':''}>${t}</a>`;
  return `<header class="top"><div class="brand"><div><h1><span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9 17 20 6"/></svg></span>راصد المبسّط</h1>
   <div class="school">${esc(S.settings.school)}</div></div><div style="display:grid;gap:6px;justify-items:end"><div class="clock num" id="clock">${hm()}</div>${roleBar()}</div></div>
   <nav class="tabs" aria-label="الأقسام">${tab('now','الآن')}${isFol()?'':`${tab('day','اليوم')}${tab('week','الأسبوع')}${tab('month','الشهر')}${tab('setup','الإعداد والجدول')}`}</nav>
  </header>`}

function stripHTML(){const cp=curPeriod(S.settings.times);const isToday=V.date===today();const d=wd(V.date);
  return `<div class="strip" role="group" aria-label="الحصص">${S.settings.times.map((t,i)=>{const p=i+1;const has=S.rows.some(r=>r.d===d&&r.p===p);
    const mine=myPeriods();const notMine=mine.length&&!mine.includes(p);
    return `<button class="per num ${isToday&&cp.state==='live'&&cp.idx===p?'live':''} ${has&&!notMine?'':'skip'} ${mine.includes(p)?'mine':''}" data-p="${p}" aria-pressed="${V.p===p}"><b>${p}</b><span>${t[0]}</span></button>`}).join('')}</div>`}

function dayBar(title){const d=wd(V.date);
  return `<div class="daybar"><h2>${title}</h2><span class="pill">${d>=0?DAYS[d]:'إجازة'}</span>
   <input type="date" id="date" value="${V.date}" aria-label="التاريخ">${V.date!==today()?`<button class="btn" id="goToday">اليوم</button>`:''}</div>
   ${wd(today())<0&&V.date!==today()&&V.tab==='now'?`<p class="muted small" style="margin:6px 0 0">اليوم إجازة نهاية الأسبوع، فيُعرض آخر يوم دوام.</p>`:''}`}

function nowView(){const d=wd(V.date);
  if(d<0)return dayBar('الحصة')+`<div class="empty">التاريخ المختار إجازة نهاية الأسبوع. اختر يومًا من الأحد إلى الخميس.</div>`;
  const list=rowsFor(V.date,V.p);const t=tally(list,V.date);const tm=S.settings.times[V.p-1];
  const cp=curPeriod(S.settings.times);const isLive=V.date===today()&&cp.idx===V.p;
  const stateTxt=isLive?({live:'جارية الآن',next:'القادمة',done:'انتهى اليوم الدراسي'}[cp.state]):'';
  let h=dayBar(`الحصة ${V.p}`)+`<p class="muted small num" style="margin:4px 0 0">${tm[0]} – ${tm[1]}${stateTxt?` · <b style="color:var(--ink)">${stateTxt}</b>`:''}</p>`+stripHTML();
  if(isFol()&&myPeriods().length&&!myPeriods().includes(V.p))return h+`<div class="empty">هذه الحصة ليست من حصصك المسندة. حصصك: ${myPeriods().join('، ')}.</div>`;
  if(!list.length)return h+`<div class="empty">لا حصص في جدول ${DAYS[d]} للحصة ${V.p}.</div>`;
  const bulk=bulkTargets(list);
  const w=x=>t.total?(x/t.total*100):0;
  h+=`<div class="prog" aria-hidden="true"><i class="ok" style="width:${w(t.ok)}%"></i><i class="late" style="width:${w(t.late)}%"></i><i class="bad" style="width:${w(t.bad)}%"></i></div>
   <div class="legend num"><span>رُصد <b>${t.total-t.un}</b> من ${t.total}</span><span>حاضر <b>${t.ok}</b></span><span>متأخر <b>${t.late}</b></span><span>غائب <b>${t.bad}</b></span>${t.nl?`<span>بلا رابط <b>${t.nl}</b></span>`:''}</div>${autoBarHTML()}${bulk.length?`<div class="autobar"><button class="btn wa hot" id="bulkB">${IC.wa} تذكير جماعي (${bulk.length})</button><span>لمن لم يُرصد حضوره أو سُجّل غائبًا/متأخرًا ولم يُذكَّر</span></div>`:''}
   <div class="list">`;
  list.forEach(r=>{const k=mk(V.date,r.p,r.c);const m=S.marks[k];const sent=S.sent[k];const ph=normPhone(r.ph);
    h+=`<div class="row" data-st="${m?m.st:''}"><div class="who"><div class="cls">${esc(r.c)}</div><div class="tch"><button class="tlink" data-teacher="${esc(r.t)}">الأستاذ/ ${esc(r.t)}</button></div>${r.s?`<div class="les" title="${esc(r.s)}">📘 ${esc(r.s)}</div>`:''}</div>
     <div class="acts">
      ${r.l?`<a class="btn" href="${esc(r.l)}" target="_blank" rel="noopener">${IC.teams} Teams</a>`:`<span class="pill bad">بلا رابط</span>`}
      <div class="seg" role="group" aria-label="حالة المعلم">${['ok','late','bad'].map(v=>`<button data-k="${esc(k)}" data-t="${esc(r.t)}" data-v="${v}" aria-pressed="${m&&m.st===v}">${ST[v]}</button>`).join('')}</div>
      ${ph?`<a class="btn wa ${hotWA(k,m,sent)?'hot':''}" data-sent="${esc(k)}" href="${esc(waUrl(r.ph,remindText(r,V.date)))}" target="_blank" rel="noopener">${IC.wa} تذكير</a>`:`<span class="pill">لا جوال</span>`}
     </div>
     ${noteHTML(k,m,sent,r)}
    </div>`});
  return h+'</div>'+`<p class="muted small" style="margin-top:14px">زر «تذكير» يفتح واتساب برسالة جاهزة، وتضغط «إرسال» بنفسك. إن لم يدخل المعلم بعد التذكير فاختر «غائب».</p>`}

function dayView(){const d=wd(V.date);
  if(d<0)return dayBar('تقرير اليوم')+`<div class="empty">التاريخ المختار إجازة.</div>`;
  const R=dayReport(V.date);const t=R.t;
  let h=dayBar('تقرير اليوم')+`<div class="section stats num">
    <div class="stat"><b>${R.pct}%</b><span>نسبة الحضور</span></div><div class="stat ok"><b>${t.ok}</b><span>حاضر</span></div>
    <div class="stat late"><b>${t.late}</b><span>متأخر</span></div><div class="stat bad"><b>${t.bad}</b><span>غائب</span></div></div>
   <div class="section"><h3>الحصص</h3><div class="tbl"><table class="num"><thead><tr><th>الحصة</th><th>الوقت</th><th>حاضر</th><th>متأخر</th><th>غائب</th><th>لم يُرصد</th><th>التوزيع</th></tr></thead><tbody>`;
  S.settings.times.forEach((tm,i)=>{const p=i+1;const L=S.rows.filter(r=>r.d===d&&r.p===p);if(!L.length)return;const x=tally(L,V.date);const w=v=>v/x.total*100;
    h+=`<tr><td><button class="btn" data-goto="${p}">ح${p}</button></td><td>${tm[0]}</td><td class="c">${x.ok}</td><td class="c">${x.late}</td><td class="c">${x.bad}</td><td class="c">${x.un}</td>
     <td><div class="mini"><i class="ok" style="width:${w(x.ok)}%"></i><i class="late" style="width:${w(x.late)}%"></i><i class="bad" style="width:${w(x.bad)}%"></i></div></td></tr>`});
  h+=`</tbody></table></div></div>`;
  const per={};S.rows.filter(r=>r.d===d).forEach(r=>{const m=S.marks[mk(V.date,r.p,r.c)];const o=per[r.t]||(per[r.t]={t:r.t,n:0,ok:0,late:0,bad:0,un:0});o.n++;if(m)o[m.st]++;else o.un++});
  const arr=Object.values(per).sort((a,b)=>b.bad-a.bad||b.late-a.late||a.t.localeCompare(b.t,'ar'));
  h+=`<div class="section"><h3>المعلمون</h3><div class="tbl"><table class="num"><thead><tr><th>المعلم</th><th>حصصه</th><th>حاضر</th><th>متأخر</th><th>غائب</th><th>لم يُرصد</th></tr></thead><tbody>
   ${arr.map(o=>`<tr><td><button class="tlink" data-teacher="${esc(o.t)}">الأستاذ/ ${esc(o.t)}</button></td><td class="c">${o.n}</td><td class="c">${o.ok}</td><td class="c" style="color:${o.late?'var(--late)':''}">${o.late}</td><td class="c" style="color:${o.bad?'var(--bad)':''}">${o.bad}</td><td class="c">${o.un}</td></tr>`).join('')}
   </tbody></table></div></div>`;
  h+=folProgressHTML(V.date);
  h+=msgBlock('رسالة التقرير للمدير',R.text,'rep-day');
  return h}

function msgBlock(title,text,id){const ph=normPhone(S.settings.mgrPh);
  return `<div class="section"><h3>${title}</h3><div class="card"><pre class="msg" id="${id}">${esc(text)}</pre>
   <div class="bar-row">${ph?`<a class="btn primary" href="${esc(waUrl(S.settings.mgrPh,text))}" target="_blank" rel="noopener">${IC.wa} إرسال للمدير الأستاذ/ ${esc(S.settings.mgr)}</a>`:`<span class="pill">أضف جوال المدير من الإعداد</span>`}
   <button class="btn" data-copy="${id}">${IC.copy} نسخ النص</button>${id==='rep-week'||id==='rep-month'?`<button class="btn" id="dlRange" data-kind="${id==='rep-month'?'month':'week'}">${IC.dl} تنزيل للطباعة (HTML)</button>`:''}${id==='rep-day'?`<button class="btn" id="dlDay">${IC.dl} تقرير اليوم مع اللقطات (HTML)</button>`:''}</div></div></div>`}

function weekView(){const W=weekData(V.date);const T=W.T;
  let h=dayBar('تقرير الأسبوع')+`<p class="muted small num" style="margin:4px 0 0">من ${fmtDate(W.days[0])} إلى ${fmtDate(W.days[4])}</p>
   <div class="section stats num"><div class="stat"><b>${W.pct}%</b><span>نسبة الحضور</span></div><div class="stat ok"><b>${T.ok}</b><span>حاضر</span></div>
   <div class="stat late"><b>${T.late}</b><span>متأخر</span></div><div class="stat bad"><b>${T.bad}</b><span>غائب</span></div></div>
   <div class="section"><h3>الأيام</h3><div class="tbl"><table class="num"><thead><tr><th>اليوم</th><th>حاضر</th><th>متأخر</th><th>غائب</th><th>لم يُرصد</th><th>النسبة</th></tr></thead><tbody>
   ${W.byDay.map(x=>{const m=x.t.ok+x.t.late+x.t.bad;return `<tr><td><button class="btn" data-day="${x.ds}">${DAYS[x.k]}</button></td><td class="c">${x.t.ok}</td><td class="c">${x.t.late}</td><td class="c">${x.t.bad}</td><td class="c">${x.t.un}</td><td class="c">${m?Math.round((x.t.ok+x.t.late)/m*100)+'%':'—'}</td></tr>`}).join('')}
   </tbody></table></div></div>
   <div class="section"><h3>انضباط المعلمين</h3>${teachersTable(W)}</div>`;
  h+=msgBlock('رسالة التقرير الأسبوعي للمدير',W.text,'rep-week');
  return h}

function setupView(){const s=S.settings;const nT=new Set(S.rows.map(r=>r.t)).size;const byDay=DAYS.map((x,i)=>S.rows.filter(r=>r.d===i).length);
  return `<div class="daybar"><h2>الإعداد والجدول</h2></div>
  <div class="section"><h3>١. جدول المدرسة</h3><div class="card" style="display:grid;gap:14px">
   <ol class="steps"><li>نزّل القالب واملأه في Excel (صف لكل حصة).</li><li>احفظه Excel أو CSV ثم ارفعه هنا.</li><li>الرفع يستبدل الجدول الحالي، ويبقى الرصد السابق كما هو.</li></ol>
   <div class="cols"><code>اليوم</code><code>الحصة (1–7)</code><code>الصف</code><code>المعلم</code><code>الجوال</code><code>رابط Teams (اختياري)</code></div>
   <div class="bar-row" style="margin:0"><button class="btn primary" id="dlTpl">${IC.dl} تنزيل القالب (CSV)</button><button class="btn" id="cpTpl">${IC.copy} نسخ القالب</button></div>
   <label class="drop" id="drop" for="file"><b>${IC.up} اختر ملف الجدول أو اسحبه هنا</b><br><span class="small muted">xlsx · xls · csv</span>
    <input type="file" id="file" accept=".xlsx,.xls,.csv,text/csv" hidden></label>
   <p class="small muted" style="margin:0">يقبل أيضًا ملف «الخطة الأسبوعية» المصدَّر من مدرستي كما هو، ويُحتفظ بجوالات المعلمين وروابط Teams المحفوظة سابقًا.</p>
   ${mpullSetupHTML()}
   <details><summary class="small" style="cursor:pointer;font-weight:600;color:var(--accent)">أو الصق الجدول مباشرة من Excel أو منصة مدرستي</summary>
    <textarea class="pastebox" id="pasteT" placeholder="حدّد الجدول مع صف العناوين في Excel، انسخه (Ctrl+C) والصقه هنا (Ctrl+V)" style="margin-top:8px"></textarea>
    <div style="margin-top:8px"><button class="btn primary" id="pasteB" type="button">قراءة الجدول الملصوق</button></div></details>
   <div class="small num" id="sum">${S.demo?'الجدول الحالي: <b>المدرسة التجريبية</b> · ':''}${S.rows.length} حصة · ${nT} معلم · ${byDay.map((n,i)=>`${DAYS[i]} ${n}`).join(' · ')}</div>
  </div></div>
  <div class="section"><h3>٢. بيانات المدرسة</h3><div class="card" style="display:grid;gap:12px">
   <div class="grid2"><label class="f">اسم المدرسة<input id="s-school" value="${esc(s.school)}"></label>
    <label class="f">رمز دخول المدير<input id="s-pin" inputmode="numeric" value="${esc(s.pin)}" placeholder="اتركه فارغًا لإلغاء القفل"></label>
    <label class="f">رمز دخول المتابع<input id="s-fpin" inputmode="numeric" value="${esc(s.fpin||'')}" placeholder="اتركه فارغًا لتعطيل دخول المتابع"></label>    <label class="f">اسم المدير<input id="s-mgr" value="${esc(s.mgr)}"></label>
    <label class="f">جوال المدير<input id="s-mgrPh" inputmode="tel" dir="ltr" value="${esc(s.mgrPh)}" placeholder="05xxxxxxxx"></label></div>

   <div style="display:grid;gap:8px"><div class="small muted">المتابعون: يدخلون برمز المتابع ثم يختار كل منهم اسمه، ويرى حصصه المسندة فقط (بلا تحديد = كل الحصص).</div>
    <div id="folList" style="display:grid;gap:8px">${S.settings.fols.map(folRowHTML).join('')}</div>
    <div><button class="btn" id="addFol" type="button">+ إضافة متابع</button></div></div>
   <div><div class="small muted" style="margin-bottom:6px">أوقات الحصص السبع (بداية – نهاية)</div><div class="times num">
    ${s.times.map((t,i)=>`<div><b>${i+1}</b><input type="time" id="t-${i}-0" value="${t[0]}" aria-label="بداية الحصة ${i+1}"><input type="time" id="t-${i}-1" value="${t[1]}" aria-label="نهاية الحصة ${i+1}"></div>`).join('')}</div></div>
   <div><button class="btn primary" id="saveSet">حفظ الإعداد</button></div>
  </div></div>
  <div class="section"><h3>٣. النسخ الاحتياطي ونقل البيانات</h3><div class="card" style="display:grid;gap:12px">
   <p class="small muted" style="margin:0">كل البيانات (الجدول والرصد) محفوظة في متصفح هذا الجهاز فقط. صدّر نسخة دوريًا، واستوردها في جهاز آخر لنقل العمل.</p>
   <div class="bar-row" style="margin:0"><button class="btn" id="exp">${IC.dl} تصدير نسخة (JSON)</button><button class="btn" id="expCp">${IC.copy} نسخ النسخة</button>
    <label class="btn" for="imp">${IC.up} استيراد نسخة</label><input type="file" id="imp" accept=".json,application/json" hidden></div>
   <div class="bar-row" style="margin:0"><button class="btn danger" id="clrMarks">مسح الرصد فقط</button><button class="btn danger" id="reset">مسح كل شيء والعودة للمدرسة التجريبية</button></div>
  </div></div>${autoSetupHTML()}${syncSetupHTML()}${planSetupHTML()}`}

function lockView(){return `<div class="lock"><span class="mark" style="margin:auto;width:48px;height:48px;border-radius:12px" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="width:26px;height:26px"><path d="M4 12.5 9 17 20 6"/></svg></span>
  <h1 style="font-size:24px">راصد المبسّط</h1><div class="muted">${esc(S.settings.school)}</div><div class="pill" style="justify-self:center">دخول المدير أو المتابع</div>
  <form id="lockF"><input id="pin" type="password" inputmode="numeric" autocomplete="off" aria-label="رمز الدخول" placeholder="••••"><p id="lockErr" class="small" style="color:var(--bad);min-height:1.5em;margin:6px 0"></p>
  <button class="btn primary" style="width:100%;justify-content:center">دخول</button></form>
  <details class="join"><summary>الانضمام لمدرسة من جهاز آخر</summary>
   <form id="joinF" style="display:grid;gap:8px;margin-top:10px"><input id="jCode" dir="ltr" autocomplete="off" placeholder="رمز المدرسة (مثل ABCD-2345)" aria-label="رمز المدرسة">
   <input id="jKey" type="password" inputmode="numeric" autocomplete="off" placeholder="رمز الدخول (المدير أو المتابع)" aria-label="رمز الدخول">
   <input id="jName" autocomplete="off" placeholder="اسمك (يظهر بجانب رصدك)" aria-label="الاسم">
   <button class="btn primary" style="justify-content:center">انضمام</button><p id="jErr" class="small" style="color:var(--bad);margin:0"></p></form>
   <p class="small muted" style="margin:6px 0 0">الانضمام يستبدل بيانات هذا الجهاز ببيانات المدرسة.</p></details>
  ${S.demo?'<p class="small muted">المدرسة التجريبية: المدير <b class="num">1234</b> · المتابع <b class="num">5678</b></p>':''}
  <button class="btn danger" id="forgot" style="justify-self:center">نسيت الرمز</button><p class="small muted">إعداد وتطوير: عبدالمجيد السيد · 0561955430${PWA?' · <a href="about/">ما هو راصد؟</a>':''}</p></div>`}

/* ============ الأحداث ============ */
function bindLock(){$('#pin').focus();
  const jf=$('#joinF');if(jf)jf.addEventListener('submit',async e=>{e.preventDefault();const b=jf.querySelector('button');b.disabled=true;$('#jErr').textContent='';
    try{await joinSchool($('#jCode').value.trim(),$('#jKey').value.trim(),$('#jName').value.trim())}catch(err){$('#jErr').textContent=String(err.message||err)}finally{b.disabled=false}});
  $('#lockF').addEventListener('submit',e=>{e.preventDefault();const v=$('#pin').value.trim();let r='';
    if(S.settings.pin&&v===S.settings.pin)r='mgr';else if(S.settings.fpin&&v===S.settings.fpin)r='fol';else if(S.sync&&v===S.sync.key)r=S.sync.role;
    if(r){store.sset('rl-role',r);if(r==='fol')V.tab='now';render();syncNow()}else{$('#lockErr').textContent='الرمز غير صحيح، حاول مرة أخرى.';$('#pin').select()}});
  twoStep($('#forgot'),'اضغط مرة أخرى لمسح كل البيانات',()=>{S=demoState();S.auto={on:false,sound:true,skip:[],sk:[],wa:{remind:false,report:false,max:40}};save();store.sset('rl-role','');render();toast('مُسحت البيانات وعادت المدرسة التجريبية')})}

function twoStep(btn,msg,fn){if(!btn)return;const orig=btn.innerHTML;btn.addEventListener('click',()=>{if(btn.dataset.arm){fn();return}
  btn.dataset.arm=1;btn.textContent=msg;setTimeout(()=>{if(btn.isConnected){delete btn.dataset.arm;btn.innerHTML=orig}},4000)})}

function bind(){
  document.querySelectorAll('.per').forEach(b=>b.onclick=()=>{V.p=+b.dataset.p;render()});
  const di=$('#date');if(di)di.onchange=()=>{if(di.value){V.date=di.value;render()}};
  const gt=$('#goToday');if(gt)gt.onclick=()=>{V.date=today();V.p=curPeriod(S.settings.times).idx;render()};
  document.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{const k=b.dataset.k,v=b.dataset.v;
    if(S.marks[k]&&S.marks[k].st===v){delete S.marks[k];markSync(k);save();render();return}else S.marks[k]={st:v,at:hm(),t:b.dataset.t,by:byName()};markSync(k);save();render()});
  document.querySelectorAll('[data-sent]').forEach(a=>a.addEventListener('click',()=>{S.sent[a.dataset.sent]=hm();markSync(a.dataset.sent);save();setTimeout(render,50)}));
  document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>{V.p=+b.dataset.goto;location.hash='now'});
  document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{V.date=b.dataset.day;location.hash='day'});
  document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>copyText($('#'+b.dataset.copy).textContent));
  const dr=$('#dlRange');if(dr)dr.onclick=()=>{const W=dr.dataset.kind==='month'?monthData(V.date):weekData(V.date);saveFile(`${W.kind==='month'?'تقرير-شهري':'تقرير-أسبوعي'}-${W.from}.html`,weekHTML(W),'text/html')};
  const dd=$('#dlDay');if(dd)dd.onclick=async()=>saveFile(`تقرير-يوم-${V.date}.html`,await dayHTML(V.date),'text/html');
  document.querySelectorAll('[data-week]').forEach(b=>b.onclick=()=>{V.date=b.dataset.week;location.hash='week'});
  const rn=$('#runNow');if(rn)rn.onclick=()=>{chrome.runtime.sendMessage({cmd:'runNow',date:V.date,p:V.p});toast('بدأ الفحص، وستفتح الإضافة نافذة Teams')};
  document.querySelectorAll('[data-img]').forEach(b=>b.onclick=()=>showImg(b.dataset.img));
  const lo=$('#logout');if(lo)lo.onclick=()=>{if(isFol())store.set('rl-fname','');store.sset('rl-role','');V.tab='now';V.p=null;render()};
  const wb=$('#wizB');if(wb)wb.onclick=openWizard;
  const ib=$('#instB');if(ib)ib.onclick=async()=>{if(!DEFER)return;DEFER.prompt();try{await DEFER.userChoice}catch(e){}DEFER=null;render()};
  const ix=$('#iosX');if(ix)ix.onclick=()=>{store.set('rl-ios','1');render()};
  const bb=$('#bulkB');if(bb)bb.onclick=openBulk;
  if(V.tab==='setup')bindSetup();
}

const TPL_HEAD=['اليوم','الحصة','الصف','المعلم','الجوال','رابط Teams'];
function tplCSV(){return '﻿'+[TPL_HEAD,['الأحد','1','الأول أ','اسم المعلم','05xxxxxxxx','https://teams.microsoft.com/l/meetup-join/...'],['الأحد','2','الأول أ','اسم المعلم','05xxxxxxxx','']]
  .map(r=>r.map(c=>/[",\n]/.test(c)?`"${c.replace(/"/g,'""')}"`:c).join(',')).join('\r\n')}

const OPENSEC=new Set([0]);
function bindSetup(){
  document.querySelectorAll('.panel .section').forEach((sec,i)=>{const h=sec.querySelector(':scope>h3');if(!h)return;
    sec.classList.add('fold');h.classList.add('fold-h');h.setAttribute('role','button');h.tabIndex=0;h.setAttribute('aria-expanded',OPENSEC.has(i));
    if(!OPENSEC.has(i))sec.classList.add('closed');
    const tg=()=>{const c=sec.classList.toggle('closed');h.setAttribute('aria-expanded',!c);c?OPENSEC.delete(i):OPENSEC.add(i)};
    h.onclick=tg;h.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tg()}}});
  $('#dlTpl').onclick=()=>saveFile('قالب-جدول-راصد.csv',tplCSV(),'text/csv');
  const mg=$('#mpGo');if(mg)mg.onclick=()=>{chrome.runtime.sendMessage({cmd:'mpOpen'});toast('افتح مدرستي واتبع اللوحة الظاهرة أسفل الصفحة')};
  const mw=$('#mpWeek');if(mw)mw.onchange=()=>{S.auto.mweekly=mw.checked;save();toast(mw.checked?'فُعّل التحديث الأسبوعي':'أُوقف التحديث الأسبوعي')};
  $('#cpTpl').onclick=()=>copyText(TPL_HEAD.join('\t')+'\nالأحد\t1\tالأول أ\tاسم المعلم\t05xxxxxxxx\t');
  const drop=$('#drop'),fi=$('#file');
  fi.onchange=()=>fi.files[0]&&readSchedule(fi.files[0]);
  ['dragenter','dragover'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.add('over')}));
  ['dragleave','drop'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.remove('over')}));
  drop.addEventListener('drop',ev=>{const f=ev.dataTransfer.files[0];if(f)readSchedule(f)});
  $('#saveSet').onclick=()=>{const s=S.settings;s.school=$('#s-school').value.trim()||s.school;s.pin=$('#s-pin').value.trim();s.fpin=$('#s-fpin').value.trim();s.fols=[...document.querySelectorAll('.folrow')].map(r=>({name:r.querySelector('.fname').value.trim(),periods:[...r.querySelectorAll('.pers input:checked')].map(x=>+x.value)})).filter(f=>f.name);if(s.fpin&&s.fpin===s.pin){toast('رمز المتابع يجب أن يختلف عن رمز المدير');return}if(S.sync&&!s.pin){toast('لا يمكن حذف رمز المدير والمزامنة مفعّلة');return}
    s.mgr=$('#s-mgr').value.trim();s.mgrPh=$('#s-mgrPh').value.trim();
    s.times=s.times.map((t,i)=>[$('#t-'+i+'-0').value||t[0],$('#t-'+i+'-1').value||t[1]]);
    store.sset('rl-role','mgr');save();render();toast('حُفظ الإعداد')};
  const backup=()=>JSON.stringify({app:'rased-lite',v:1,saved:new Date().toISOString(),...S},null,1);
  $('#exp').onclick=()=>saveFile(`نسخة-راصد-${today()}.json`,backup(),'application/json');
  $('#expCp').onclick=()=>copyText(backup());
  $('#imp').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const o=JSON.parse(await f.text());
    if(!o.settings||!Array.isArray(o.rows))throw 0;S={demo:!!o.demo,settings:o.settings,rows:o.rows,marks:o.marks||{},sent:o.sent||{},auto:Object.assign({on:false,sound:true,skip:[],sk:[]},o.auto||{})};
    store.sset('rl-role','mgr');save();V.date=null;V.p=null;render();toast('استُوردت النسخة')}catch(_){toast('الملف ليس نسخة راصد صالحة')}};
  const sa=$('#saveAuto');if(sa)sa.onclick=()=>{const raw=$('#autoSkip').value;const list=raw.split(/[،,]/).map(x=>x.trim()).filter(Boolean);const sk=[];
    list.forEach(x=>{const p=parseInt(x.replace(/\D/g,''),10);const d=dayIdx(x.replace(/\d/g,''));if(d>=0&&p>=1&&p<=7)sk.push(d+'-'+p)});
    S.auto={on:$('#autoOn').checked,sound:$('#autoSound').checked,skip:list,sk,wa:{remind:$('#waRemind').checked,report:$('#waReport').checked,max:Math.max(1,Math.min(200,+$('#waMax').value||40))}};save();render();toast(S.auto.on?'الفحص الآلي مفعّل':'الفحص الآلي متوقف')};
  const wt=$('#waTest');if(wt)wt.onclick=()=>{if(!S.settings.mgrPh){toast('أضف جوال المدير في بيانات المدرسة');return}WATEST=null;$('#waTestOut').textContent='⏳ جارٍ الإرسال… راقب نافذة الفحص';chrome.runtime.sendMessage({cmd:'waTest'})};
  const lb=$('#licB');if(lb)lb.onclick=activateLicense;
  const rt=$('#runTest');if(rt)rt.onclick=()=>{let link=$('#testLink').value.trim(),t=$('#testT').value.trim();
    if(!link){const d=wd(today());const r=S.rows.find(x=>x.l&&x.d===d)||S.rows.find(x=>x.l);if(r){link=r.l;t=t||r.t}}
    if(!link){toast('لا يوجد رابط للاختبار');return}
    TEST={at:hm(),done:false,steps:[{m:'إرسال الطلب للإضافة',at:hm()}]};$('#testOut').innerHTML=testHTML();
    chrome.runtime.sendMessage({cmd:'test',link,teacher:t});toast('بدأ الاختبار، راقب نافذة الفحص')};
  const pb=$('#pasteB');if(pb)pb.onclick=()=>{const v=$('#pasteT').value;if(!v.trim()){toast('الصق الجدول أولًا');return}readPasted(v)};
  const af=$('#addFol');if(af)af.onclick=()=>{$('#folList').insertAdjacentHTML('beforeend',folRowHTML());$('#folList').lastElementChild.querySelector('.fname').focus()};
  const fl=$('#folList');if(fl)fl.addEventListener('click',e=>{const d=e.target.closest('[data-delfol]');if(d)d.closest('.folrow').remove()});
  const so=$('#syncOn');if(so)so.onclick=enableSync;
  const cc=$('#cpCode');if(cc)cc.onclick=()=>copyText(fmtCode(S.sync.code));
  const sn=$('#syncNowB');if(sn)sn.onclick=()=>{SYNC_ST.err='';syncNow()};
  twoStep($('#syncOff'),'اضغط مرة أخرى لإيقاف المزامنة هنا',()=>{S.sync=null;S.pend={};save();render();toast('أُوقفت المزامنة في هذا الجهاز')});
  twoStep($('#clrMarks'),'اضغط مرة أخرى لمسح الرصد',()=>{Object.keys(S.marks).concat(Object.keys(S.sent)).forEach(markSync);S.marks={};S.sent={};save();render();toast('مُسح الرصد')});
  twoStep($('#reset'),'اضغط مرة أخرى لمسح كل شيء',()=>{S=demoState();S.auto={on:false,sound:true,skip:[],sk:[],wa:{remind:false,report:false,max:40}};save();store.sset('rl-role','mgr');V.date=null;V.p=null;render();toast('عادت المدرسة التجريبية')});
}

/* ============ قراءة الجدول ============ */
function csvParse(t){const out=[];let row=[],c='',q=false;t=t.replace(/^﻿/,'');
  for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}
    else if(ch==='"')q=true;else if(ch===','||ch==='\t'||ch===';'){row.push(c);c=''}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;row.push(c);out.push(row);row=[];c=''}else c+=ch}
  if(c||row.length){row.push(c);out.push(row)}return out}
const normAr=s=>String(s||'').trim().replace(/[إأآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ');
function dayIdx(v){const s=normAr(v);const n=parseInt(s,10);if(n>=1&&n<=5&&/^\d+$/.test(s))return n-1;
  const names=['احد','اثنين','ثلاثاء','اربعاء','خميس'];for(let i=0;i<5;i++)if(s.replace(/^ال/,'').includes(names[i].replace(/ه$/,'')))return i;
  if(s.includes('ثلاث'))return 2;if(s.includes('ربع'))return 3;return -1}
function parseAOA(aoa){
  const hi=aoa.findIndex(r=>r&&r.some(c=>normAr(c).includes('معلم'))&&r.some(c=>/صف|فصل/.test(normAr(c))));
  if(hi<0)throw new Error('لم أجد صف العناوين (اليوم، الحصة، الصف، المعلم…). استخدم القالب أو انسخ الجدول مع صف العناوين.');
  const H=aoa[hi].map(normAr);const col=(...ks)=>H.findIndex(h=>ks.some(k=>h.includes(k)));
  const cD=col('يوم'),cP=col('حصه','حصة'),cC=col('صف','فصل'),cT=col('معلم'),cPh=col('جوال','هاتف','رقم','موبايل'),cL=col('رابط','teams','link'),cLs=col('عنوان الدرس','درس'),cSb=col('ماده');
  if([cD,cP,cC,cT].some(x=>x<0))throw new Error('الأعمدة الأساسية ناقصة: اليوم، الحصة، الصف، المعلم');
  const rows=[];let bad=0;const seen=new Set();
  aoa.slice(hi+1).forEach(r=>{if(!r||r.every(c=>String(c).trim()===''))return;const d=dayIdx(r[cD]);const p=parseInt(String(r[cP]).replace(/[٠-٩]/g,x=>'٠١٢٣٤٥٦٧٨٩'.indexOf(x)),10);
    const c=String(r[cC]||'').trim(),t=String(r[cT]||'').trim().replace(/^(ال)?(استاذ|أستاذ)\s*[/.:]?\s*|^أ\s*[/.]\s*/,'');
    if(d<0||!(p>=1&&p<=7)||!c||!t){bad++;return}
    const key=d+'|'+p+'|'+c;if(seen.has(key))return;seen.add(key);
    const les=String((cLs>=0&&r[cLs])||(cSb>=0&&r[cSb])||'').replace(/\s+/g,' ').trim().slice(0,90);
    let l=cL>=0?String(r[cL]||'').trim():'';if(l&&!/^https?:\/\//i.test(l))l='';
    const o={d,p,c,t,ph:cPh>=0?String(r[cPh]||'').trim():'',l};if(les)o.s=les;rows.push(o)});
  if(!rows.length)throw new Error('لم تُقرأ أي حصة صالحة');
  return{rows,bad}}
function textToAOA(txt){txt=txt.replace(/^﻿/,'');if(txt.includes('\t'))return txt.split(/\r?\n/).map(l=>l.split('\t'));return csvParse(txt)}
async function fileToAOA(f){const isCSV=/\.csv$|\.txt$/i.test(f.name)||/text\//.test(f.type);
  if(isCSV){const txt=await f.text();return window.XLSX?XLSX.utils.sheet_to_json(XLSX.read(txt,{type:'string'}).Sheets[XLSX.read(txt,{type:'string'}).SheetNames[0]],{header:1,defval:''}):textToAOA(txt)}
  if(!window.XLSX)throw new Error('تعذّر تحميل قارئ Excel، احفظ الملف CSV أو الصق الجدول');
  const wb=XLSX.read(await f.arrayBuffer(),{type:'array'});return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:'',raw:false})}
/* تحديث الجدول (مثل الخطة الأسبوعية من مدرستي) دون فقد الجوالات والروابط المحفوظة */
function keepOld(rows){if(S.demo||!S.rows.length)return 0;const nk=s=>normAr(s).replace(/\s/g,'');
  const ph={},lk={},lk2={};S.rows.forEach(r=>{if(r.ph)ph[nk(r.t)]=r.ph;if(r.l){lk[r.c+'|'+nk(r.t)]=r.l;lk2[r.d+'|'+r.p+'|'+r.c]=r.l}});
  let n=0;rows.forEach(r=>{const t=nk(r.t);if(!r.ph&&ph[t]){r.ph=ph[t];n++}if(!r.l){const l=lk[r.c+'|'+t]||lk2[r.d+'|'+r.p+'|'+r.c];if(l){r.l=l;n++}}});return n}
function applyRows(res){
  const kept=keepOld(res.rows);
  if(S.demo){S.marks={};S.sent={};S.settings.school=S.settings.school.includes('تجريبية')?'اسم مدرستك':S.settings.school;S.settings.mgr='';S.settings.mgrPh='';S.settings.pin='';S.settings.fpin='';S.settings.fols=[]}
  S.rows=res.rows;S.demo=false;save();V.date=null;V.p=null;render();
  toast(`حُمّل ${res.rows.length} حصة`+(kept?` · احتُفظ بالجوالات والروابط السابقة`:'')+(res.bad?` · تُجوهل ${res.bad} سطر غير مكتمل`:''))}
async function readSchedule(f){try{applyRows(parseAOA(await fileToAOA(f)))}catch(e){toast(String(e.message||'تعذّرت قراءة الملف'))}}
function readPasted(txt){try{applyRows(parseAOA(textToAOA(txt)))}catch(e){toast(String(e.message||e))}}

/* ---- عدة متابعين ---- */
function folRowHTML(f){f=f||{name:'',periods:[]};return `<div class="folrow"><div class="top-r"><input class="fname" placeholder="اسم المتابع" value="${esc(f.name)}" aria-label="اسم المتابع"><button class="btn danger" type="button" data-delfol>حذف</button></div>
  <div class="pers" aria-label="الحصص المسندة">${[1,2,3,4,5,6,7].map(p=>`<label><input type="checkbox" value="${p}" ${f.periods&&f.periods.includes(p)?'checked':''}>${p}</label>`).join('')}</div></div>`}
function folProgressHTML(date){const fols=S.settings.fols||[];if(!fols.length||isFol())return'';const d=wd(date);
  const rowsD=S.rows.filter(r=>r.d===d&&r.l);
  const items=fols.map(f=>{const per=f.periods&&f.periods.length?f.periods:[1,2,3,4,5,6,7];const mine=rowsD.filter(r=>per.includes(r.p));
    const done=mine.filter(r=>{const m=S.marks[mk(date,r.p,r.c)];return m&&m.by===f.name}).length;return{f,n:mine.length,done,pct:mine.length?Math.round(done/mine.length*100):0}});
  return `<div class="section"><h3>إنجاز المتابعين</h3><div class="tbl"><table class="num"><thead><tr><th>المتابع</th><th>حصصه المسندة</th><th>رصدها</th><th>الإنجاز</th></tr></thead><tbody>
   ${items.map(x=>`<tr><td>${esc(x.f.name)}</td><td class="c">${x.n}</td><td class="c">${x.done}</td><td><div class="mini"><i class="ok" style="width:${x.pct}%"></i></div> <span class="small">${x.pct}%</span></td></tr>`).join('')}
   </tbody></table></div></div>`}

/* ---- التذكير الجماعي ---- */
function bulkTargets(list){return list.filter(r=>{const k=mk(V.date,r.p,r.c);const m=S.marks[k];return normPhone(r.ph)&&!S.sent[k]&&(!m||m.st!=='ok')})}
function openBulk(){const list=bulkTargets(rowsFor(V.date,V.p));if(!list.length){toast('لا يوجد من يحتاج تذكيرًا');return}
  const el=document.createElement('div');el.className='sheet';
  el.innerHTML=`<div role="dialog" aria-label="تذكير جماعي"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h2 style="font-size:18px">تذكير جماعي · الحصة ${V.p}</h2><button class="btn" data-x>إغلاق</button></div>
   <p class="small muted" style="margin:0">اضغط «إرسال» لكل معلم، فيفتح واتساب برسالة جاهزة. بعد الإرسال ارجع هنا للمعلم التالي.</p>
   <div style="display:grid;gap:8px">${list.map(r=>{const k=mk(V.date,r.p,r.c);const m=S.marks[k];return `<div class="bulk-row"><div><b>${esc(r.c)}</b> · الأستاذ/ ${esc(r.t)} <span class="pill ${m?m.st:''}">${m?ST[m.st]:'لم يُرصد'}</span></div>
     <a class="btn wa hot" data-bulk="${esc(k)}" href="${esc(waUrl(r.ph,remindText(r,V.date)))}" target="_blank" rel="noopener">${IC.wa} إرسال</a></div>`}).join('')}</div></div>`;
  el.addEventListener('click',e=>{if(e.target===el||e.target.closest('[data-x]')){el.remove();render();return}
    const a=e.target.closest('[data-bulk]');if(a){const k=a.dataset.bulk;S.sent[k]=hm();markSync(k);save();setTimeout(()=>{a.outerHTML=`<span class="pill ok">✓ أُرسل ${S.sent[k]}</span>`},60)}});
  document.body.append(el)}

/* ---- معالج البداية ---- */
let WZ=null;
function openWizard(){WZ={step:1,school:'',mgr:'',mgrPh:'',rows:null,bad:0,pin:'',fpin:'',fols:'',sync:false,err:''};drawWizard()}
function drawWizard(){document.querySelectorAll('.sheet.wz').forEach(x=>x.remove());const w=WZ;const el=document.createElement('div');el.className='sheet wz';
  const steps=`<div class="wiz-steps">${[1,2,3].map(i=>`<i class="${i<=w.step?'on':''}"></i>`).join('')}</div>`;
  let body='';
  if(w.step===1)body=`<h2 style="font-size:19px">١. بيانات المدرسة</h2>
    <label class="f">اسم المدرسة<input id="wSchool" value="${esc(w.school)}"></label>
    <label class="f">اسم المدير<input id="wMgr" value="${esc(w.mgr)}"></label>
    <label class="f">جوال المدير (لإرسال التقارير)<input id="wPh" dir="ltr" inputmode="tel" value="${esc(w.mgrPh)}" placeholder="05xxxxxxxx"></label>`;
  if(w.step===2)body=`<h2 style="font-size:19px">٢. جدول الحصص</h2>
    <p class="small muted" style="margin:0">الأعمدة: اليوم، الحصة (1–7)، الصف، المعلم، الجوال، رابط Teams (اختياري).</p>
    <div class="bar-row" style="margin:0"><button class="btn" id="wTpl" type="button">${IC.dl} تنزيل القالب</button><label class="btn primary" for="wFile">${IC.up} اختيار ملف Excel أو CSV</label><input type="file" id="wFile" accept=".xlsx,.xls,.csv" hidden></div>
    <textarea class="pastebox" id="wPaste" placeholder="أو انسخ الجدول من Excel أو منصة مدرستي (مع صف العناوين) والصقه هنا"></textarea>
    <div class="small" id="wRows">${w.rows?`✅ قُرئت ${w.rows.length} حصة لـ ${new Set(w.rows.map(r=>r.t)).size} معلم${w.bad?` · تُجوهل ${w.bad} سطر`:''}`:''}</div>`;
  if(w.step===3)body=`<h2 style="font-size:19px">٣. الرموز والمتابعون</h2>
    <label class="f">رمز دخول المدير (4 أرقام على الأقل)<input id="wPin" inputmode="numeric" value="${esc(w.pin)}" placeholder="مثل 4826"></label>
    <label class="f">رمز المتابعين (اختياري)<input id="wFpin" inputmode="numeric" value="${esc(w.fpin)}" placeholder="مثل 7391"></label>
    <label class="f">أسماء المتابعين (اختياري، تفصل بينها بفاصلة)<input id="wFols" value="${esc(w.fols)}" placeholder="مثل: سعد، خالد"></label>
    <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="wSync" ${w.sync?'checked':''}> تفعيل المزامنة بين الأجهزة الآن (يحتاج إنترنت)</label>`;
  el.innerHTML=`<div role="dialog" aria-label="معالج البداية"><div style="display:flex;justify-content:space-between;align-items:center"><b>ابدأ مدرستك</b><button class="btn" data-x>إغلاق</button></div>${steps}${body}
    <p class="small" id="wErr" style="color:var(--bad);margin:0">${esc(w.err)}</p>
    <div class="bar-row" style="margin:0;justify-content:space-between">${w.step>1?'<button class="btn" id="wBack">السابق</button>':'<span></span>'}<button class="btn primary" id="wNext">${w.step<3?'التالي':'إنهاء والبدء'}</button></div></div>`;
  document.body.append(el);
  el.addEventListener('click',e=>{if(e.target===el||e.target.closest('[data-x]'))el.remove()});
  const keep=()=>{if(w.step===1){w.school=$('#wSchool').value.trim();w.mgr=$('#wMgr').value.trim();w.mgrPh=$('#wPh').value.trim()}
    if(w.step===3){w.pin=$('#wPin').value.trim();w.fpin=$('#wFpin').value.trim();w.fols=$('#wFols').value;w.sync=$('#wSync').checked}};
  if(w.step===2){$('#wTpl').onclick=()=>saveFile('قالب-جدول-راصد.csv',tplCSV(),'text/csv');
    const got=(res)=>{w.rows=res.rows;w.bad=res.bad;w.err='';drawWizard()},bad=(e)=>{w.err=String(e.message||e);drawWizard()};
    $('#wFile').onchange=async e=>{const f=e.target.files[0];if(f)try{got(parseAOA(await fileToAOA(f)))}catch(x){bad(x)}};
    $('#wPaste').addEventListener('paste',()=>setTimeout(()=>{const v=$('#wPaste').value;if(v.trim())try{got(parseAOA(textToAOA(v)))}catch(x){bad(x)}},30))}
  const back=$('#wBack');if(back)back.onclick=()=>{keep();w.step--;w.err='';drawWizard()};
  $('#wNext').onclick=async()=>{keep();
    if(w.step===1&&!w.school){w.err='اكتب اسم المدرسة';return drawWizard()}
    if(w.step===2&&!w.rows){const v=$('#wPaste').value;if(v.trim()){try{const r=parseAOA(textToAOA(v));w.rows=r.rows;w.bad=r.bad}catch(x){w.err=String(x.message||x);return drawWizard()}}else{w.err='ارفع الجدول أو الصقه أولًا';return drawWizard()}}
    if(w.step<3){w.step++;w.err='';return drawWizard()}
    if(w.pin.length<4){w.err='رمز المدير 4 أرقام على الأقل';return drawWizard()}
    if(w.fpin&&w.fpin===w.pin){w.err='رمز المتابعين يجب أن يختلف عن رمز المدير';return drawWizard()}
    const fols=w.fols.split(/[،,]/).map(x=>x.trim()).filter(Boolean).map(name=>({name,periods:[]}));
    S={demo:false,settings:{school:w.school,mgr:w.mgr,mgrPh:w.mgrPh,pin:w.pin,fpin:w.fpin,fols,times:DEF_TIMES.map(x=>x.slice())},rows:w.rows,marks:{},sent:{},auto:{on:false,sound:true,skip:[],sk:[]},pend:{}};
    save();store.sset('rl-role','mgr');el.remove();V.date=null;V.p=null;V.tab='now';render();toast('تم إعداد المدرسة');
    if(w.sync)enableSync()}}

/* ---- التثبيت كتطبيق ---- */
const PWA=('serviceWorker' in navigator)&&location.protocol==='https:'&&!EXT&&/(wasl\.uk|github\.io)$/.test(location.hostname);
let DEFER=null;
if(PWA){navigator.serviceWorker.register('sw.js').catch(()=>{});
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();DEFER=e;if(!needLock())render()});
  addEventListener('appinstalled',()=>{DEFER=null;toast('ثُبّت راصد على جهازك')})}
const IOS=/iphone|ipad|ipod/i.test(navigator.userAgent)&&!navigator.standalone;
function installBar(){if(!PWA)return'';
  if(DEFER)return `<div class="demo-bar"><span>📲 ثبّت راصد كتطبيق على جهازك ليفتح بضغطة.</span><button class="btn" id="instB">تثبيت</button></div>`;
  if(IOS&&!store.get('rl-ios'))return `<div class="demo-bar"><span>📲 للتثبيت على الآيفون: زر المشاركة ← «إضافة إلى الشاشة الرئيسية».</span><button class="btn" id="iosX">حسنًا</button></div>`;
  return''}



/* ============ تقرير الأسبوع للطباعة ============ */
function weekHTML(W){const s=S.settings;
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${W.title} – ${esc(s.school)}</title>
<style>body{font-family:Tahoma,"Segoe UI",sans-serif;margin:32px;color:#15211d}h1{font-size:20px;margin:0}p{color:#5a6964}table{border-collapse:collapse;width:100%;margin-top:14px;font-size:13px}
th,td{border:1px solid #d5e3e2;padding:6px 10px;text-align:right}th{background:#e4f2f1}.k{display:flex;gap:24px;margin:16px 0}.k b{display:block;font-size:22px}.bad{color:#b0281f}
button{padding:8px 16px;margin-top:16px}@media print{button{display:none}body{margin:12mm}}</style></head><body>
<h1>${W.title} لحضور المعلمين – ${esc(s.school)}</h1><p>${esc(W.span)}</p>
<div class="k"><div><b>${W.pct}%</b>نسبة الحضور</div><div><b>${W.T.ok}</b>حاضر</div><div><b>${W.T.late}</b>متأخر</div><div class="bad"><b>${W.T.bad}</b>غائب</div></div>
<table><tr><th>المعلم</th><th>مرصودة</th><th>حاضر</th><th>متأخر</th><th>غائب</th><th>النسبة</th><th>مواضع الغياب</th></tr>
${W.teachers.map(o=>`<tr><td>الأستاذ/ ${esc(o.t)}</td><td>${o.n}</td><td>${o.ok}</td><td>${o.late}</td><td class="${o.bad?'bad':''}">${o.bad}</td><td>${o.pct}%</td><td>${esc(o.list.join('، '))}</td></tr>`).join('')}</table>
<p style="margin-top:24px">المدير: الأستاذ/ ${esc(s.mgr||'')} &nbsp;&nbsp; التوقيع: ............</p>
<div style="margin-top:28px;font-size:12px;color:#5a6964;border-top:1px solid #d5e3e2;padding-top:8px">راصد المبسّط · إعداد وتطوير: عبدالمجيد السيد · 0561955430</div>
<button onclick="print()">طباعة / حفظ PDF</button></body></html>`}

async function dayHTML(date){const R=dayReport(date);const s=S.settings;let res={};
  if(EXT)res=(await chrome.storage.local.get('res:'+date))['res:'+date]||{};
  const items=[...R.bad.map(r=>({r,st:'bad'})),...R.late.map(r=>({r,st:'late'}))].sort((a,b)=>a.r.p-b.r.p);const ids=[];
  items.forEach(it=>{const a=res[mk(date,it.r.p,it.r.c)];it.sh=(a&&a.checks||[]).filter(c=>c.img);it.sh.forEach(c=>ids.push('img:'+c.img))});
  const imgs=EXT&&ids.length?await chrome.storage.local.get(ids):{};
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>تقرير اليوم – ${esc(s.school)} – ${date}</title>
<style>body{font-family:Tahoma,"Segoe UI",sans-serif;margin:32px;color:#15211d}h1{font-size:20px;margin:0}p{color:#5a6964}table{border-collapse:collapse;width:100%;margin-top:14px;font-size:13px}
th,td{border:1px solid #d5e3e2;padding:6px 10px;text-align:right;vertical-align:top}th{background:#e4f2f1}.k{display:flex;gap:24px;margin:16px 0}.k b{display:block;font-size:22px}.bad{color:#b0281f}.late{color:#a86200}
td img{width:260px;display:block;margin:4px 0;border:1px solid #d5e3e2}.f{margin-top:28px;font-size:12px;color:#5a6964;border-top:1px solid #d5e3e2;padding-top:8px}button{padding:8px 16px;margin-top:16px}@media print{button{display:none}body{margin:10mm}tr{page-break-inside:avoid}}</style></head><body>
<h1>تقرير حضور المعلمين – ${esc(s.school)}</h1><p>${DAYS[wd(date)]||''} ${fmtDate(date)}</p>
<div class="k"><div><b>${R.pct}%</b>نسبة الحضور</div><div><b>${R.t.ok}</b>حاضر</div><div class="late"><b>${R.t.late}</b>متأخر</div><div class="bad"><b>${R.t.bad}</b>غائب</div><div><b>${R.t.un}</b>لم يُرصد</div></div>
${items.length?`<table><tr><th>الحصة</th><th>الصف</th><th>المعلم</th><th>الحالة</th><th>الوقت</th><th>لقطات الفحص</th></tr>
${items.map(it=>{const m=S.marks[mk(date,it.r.p,it.r.c)]||{};return `<tr><td>${it.r.p}</td><td>${esc(it.r.c)}</td><td>الأستاذ/ ${esc(it.r.t)}</td><td class="${it.st}">${ST[it.st]}</td><td>${esc(m.at||'')}</td><td>${it.sh.map(c=>imgs['img:'+c.img]?`<div>فحص ${c.n} – ${esc(c.at)}<img src="${imgs['img:'+c.img]}" alt=""></div>`:'').join('')||'—'}</td></tr>`}).join('')}</table>`:'<p>حضور كامل في كل الحصص المرصودة.</p>'}
<p style="margin-top:24px">المدير: الأستاذ/ ${esc(s.mgr||'')} &nbsp;&nbsp; التوقيع: ............</p>
<div class="f">راصد المبسّط · إعداد وتطوير: عبدالمجيد السيد · 0561955430</div>
<button onclick="print()">طباعة / حفظ PDF</button></body></html>`}

/* ============ التوجيه والساعة ============ */
function route(){V.anim=true;setTimeout(()=>{V.anim=false},50);const h=(location.hash||'').slice(1);V.tab=['now','day','week','month','setup'].includes(h)?h:'now';render();window.scrollTo(0,0)}
addEventListener('hashchange',route);
setInterval(()=>{const c=$('#clock');if(c)c.textContent=hm()},15000);
pushCfg();
route();
syncNow();
