/* Raya Loop — request-service / contact form. Posts to /api/contact (Cloudflare Worker → info@rayaloop.com). */
(function(){
  var form=document.getElementById('reqForm'); if(!form) return;
  var AR=document.documentElement.lang!=='en';
  var T=AR?{
    req:'هذا الحقل مطلوب', reach:'أدخل رقم الجوال أو البريد الإلكتروني لنتواصل معك', mail:'صيغة البريد الإلكتروني غير صحيحة', tel:'أدخل رقمًا صحيحًا',
    send:'إرسال الطلب', sendC:'إرسال الرسالة', sending:'جارٍ الإرسال…',
    fail:'تعذّر الإرسال الآن. يمكنك إرسال طلبك مباشرة عبر ', or:' أو ', mail2:'البريد الإلكتروني', wa:'واتساب',
    subjS:'طلب خدمة', subjC:'رسالة من الموقع'
  }:{
    req:'This field is required', reach:'Please add a phone number or an email so we can reach you', mail:'Please enter a valid email', tel:'Please enter a valid number',
    send:'Send request', sendC:'Send message', sending:'Sending…',
    fail:'We could not send this right now. You can reach us directly by ', or:' or ', mail2:'email', wa:'WhatsApp',
    subjS:'Service request', subjC:'Website message'
  };
  var type='service', segs=form.querySelectorAll('.seg button'), only=form.querySelectorAll('[data-only]');
  var btn=form.querySelector('button[type=submit]'), lbl=btn.querySelector('.lbl'), msg=document.getElementById('reqMsg');
  function setType(t){
    type=t;
    segs.forEach(function(b){b.setAttribute('aria-pressed',b.dataset.type===t?'true':'false')});
    only.forEach(function(el){var on=el.dataset.only===t; el.hidden=!on; el.querySelectorAll('input,select,textarea').forEach(function(i){i.disabled=!on})});
    lbl.textContent=t==='service'?T.send:T.sendC;
    form.querySelectorAll('.f.bad').forEach(function(f){f.classList.remove('bad')});
    msg.className='req-msg'; msg.innerHTML='';
  }
  segs.forEach(function(b){b.addEventListener('click',function(){setType(b.dataset.type)})});
  document.querySelectorAll('[data-req]').forEach(function(a){a.addEventListener('click',function(){setType(a.dataset.req)})});
  if(location.hash==='#contact-form') setType('contact');
  function v(n){var el=form.elements[n]; return el&&!el.disabled?String(el.value||'').trim():''}
  function bad(n,text){var el=form.elements[n]; if(!el) return; var f=el.closest('.f'); f.classList.add('bad'); var e=f.querySelector('.err'); if(e) e.textContent=text}
  form.addEventListener('input',function(e){var f=e.target.closest('.f'); if(f) f.classList.remove('bad')});
  form.addEventListener('submit',function(e){
    e.preventDefault();
    form.querySelectorAll('.f.bad').forEach(function(f){f.classList.remove('bad')});
    var d={type:type,org:v('org'),name:v('name'),phone:v('phone'),email:v('email'),service:v('service'),message:v('message'),lang:AR?'ar':'en',hp:form.elements.website.value,page:location.href};
    var ok=true;
    if(!d.name){bad('name',T.req);ok=false}
    if(type==='service'){ if(!d.org){bad('org',T.req);ok=false} if(!d.service){bad('service',T.req);ok=false} }
    else if(!d.message){bad('message',T.req);ok=false}
    if(!d.phone&&!d.email){bad('phone',T.reach);ok=false}
    if(d.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)){bad('email',T.mail);ok=false}
    if(d.phone&&!/^[+\d][\d\s-]{6,18}$/.test(d.phone)){bad('phone',T.tel);ok=false}
    if(!ok){var first=form.querySelector('.f.bad input,.f.bad select,.f.bad textarea'); if(first) first.focus(); return}
    btn.disabled=true; btn.classList.add('loading'); lbl.textContent=T.sending;
    fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)})
      .then(function(r){return r.json().catch(function(){return {ok:false}}).then(function(j){if(!r.ok||!j.ok) throw 0; return j})})
      .then(function(){
        document.getElementById('reqBody').hidden=true;
        document.getElementById('reqDone').hidden=false;
        document.getElementById('reqDone').scrollIntoView({behavior:'smooth',block:'center'});
      })
      .catch(function(){
        var body=[(type==='service'?T.subjS:T.subjC)];
        ['org','name','phone','email','service','message'].forEach(function(k){if(d[k]) body.push(k+': '+d[k])});
        var mail='mailto:info@rayaloop.com?subject='+encodeURIComponent((type==='service'?T.subjS:T.subjC)+' - '+(d.org||d.name))+'&body='+encodeURIComponent(body.join('\n'));
        var wa='https://wa.me/966553813109?text='+encodeURIComponent(body.join('\n'));
        msg.className='req-msg no';
        msg.innerHTML=T.fail+'<a href="'+mail+'">'+T.mail2+'</a>'+T.or+'<a href="'+wa+'" target="_blank" rel="noopener">'+T.wa+'</a>.';
      })
      .then(function(){btn.disabled=false; btn.classList.remove('loading'); lbl.textContent=type==='service'?T.send:T.sendC});
  });
  var again=document.getElementById('reqAgain');
  if(again) again.addEventListener('click',function(){form.reset(); document.getElementById('reqDone').hidden=true; document.getElementById('reqBody').hidden=false; setType(type)});
  setType(type);
})();
