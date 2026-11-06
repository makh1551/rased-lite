-- راصد 2.0 – ملف واحد يجمع: lite_phones.sql + lite_send.sql + lite_v2.sql (نفّذه كاملًا مرة واحدة في مشروع school-jard)

-- ===================== lite_phones.sql =====================
-- راصد المبسّط: تسجيل المعلم رقم جواله بنفسه عبر رابط المدرسة
-- الصفحة العامة تُرسل الاسم والرقم فقط، ولا تعرض أي رقم. القائمة يقرؤها المدير برمزه.

create table if not exists public.lite_phone_req(
  id bigserial primary key,
  code text not null references public.lite_schools(code) on delete cascade,
  name text not null,
  phone text not null,
  at timestamptz not null default now(),
  unique (code, phone)
);
alter table public.lite_phone_req enable row level security;
grant select on public.lite_phone_req to anon;
grant select, insert, update, delete on public.lite_phone_req to authenticated, service_role;
grant usage, select on sequence public.lite_phone_req_id_seq to authenticated, service_role;

-- اسم المدرسة فقط (لتطمين المعلم أنه في الصفحة الصحيحة)
create or replace function public.lite_phone_school(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('name', name) from public.lite_schools where code = upper(regexp_replace(coalesce(p_code,''),'[^A-Za-z0-9]','','g'))),
                  jsonb_build_object('err','none'))
$$;

-- إرسال المعلم: اسم + جوال سعودي
create or replace function public.lite_phone_submit(p_code text, p_name text, p_phone text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c text := upper(regexp_replace(coalesce(p_code,''),'[^A-Za-z0-9]','','g'));
        d text := regexp_replace(translate(coalesce(p_phone,''),'٠١٢٣٤٥٦٧٨٩','0123456789'),'\D','','g');
        n text := btrim(regexp_replace(coalesce(p_name,''),'\s+',' ','g'));
begin
  if not exists(select 1 from public.lite_schools where code = c) then return jsonb_build_object('err','none'); end if;
  if d ~ '^(00966|966)5\d{8}$' then d := '0' || right(d, 9);
  elsif d ~ '^5\d{8}$' then d := '0' || d; end if;
  if d !~ '^05\d{8}$' then return jsonb_build_object('err','phone'); end if;
  if length(n) < 5 or length(n) > 80 or n !~ '[ء-ي]' then return jsonb_build_object('err','name'); end if;
  if (select count(*) from public.lite_phone_req where code = c) >= 400 then return jsonb_build_object('err','full'); end if;
  insert into public.lite_phone_req(code,name,phone) values (c,n,d)
    on conflict (code,phone) do update set name = excluded.name, at = now();
  return jsonb_build_object('ok', true);
end $$;

-- قراءة القائمة: المدير فقط
create or replace function public.lite_phone_list(p_code text, p_key text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r text;
begin
  r := public.lite_role(p_code, p_key);
  if r <> 'mgr' then return jsonb_build_object('err', case when r = 'fol' then 'mgr_only' else r end); end if;
  return jsonb_build_object('ok', true, 'list', (select coalesce(jsonb_agg(jsonb_build_object('name',name,'phone',phone,'at',at) order by at),'[]'::jsonb)
    from public.lite_phone_req where code = upper(replace(p_code,'-',''))));
end $$;

grant execute on function public.lite_phone_school(text) to anon, authenticated;
grant execute on function public.lite_phone_submit(text,text,text) to anon, authenticated;
grant execute on function public.lite_phone_list(text,text) to anon, authenticated;

-- ===================== lite_send.sql =====================
-- راصد المبسّط: سجل الإرسال عبر واتساب الرسمي/SMS (تكتبه دالة rased-send بصلاحية الخادم فقط)
create table if not exists public.lite_send_log(
  id bigserial primary key,
  code text not null references public.lite_schools(code) on delete cascade,
  kind text not null,
  dkey text,
  to_tail text,
  channel text,
  ok boolean not null default false,
  err text,
  msg_id text,
  at timestamptz not null default now()
);
create index if not exists lite_send_log_code_at on public.lite_send_log(code, at);
create index if not exists lite_send_log_dkey on public.lite_send_log(code, dkey);
alter table public.lite_send_log enable row level security;
grant select on public.lite_send_log to anon;
grant select, insert, update, delete on public.lite_send_log to authenticated, service_role;
grant usage, select on sequence public.lite_send_log_id_seq to authenticated, service_role;

-- الدالة الخادمية تتحقق من رمز الدخول عبر lite_role
grant execute on function public.lite_role(text,text) to service_role;
grant select on public.lite_schools to service_role;

-- عدد ما أُرسل اليوم (للمدير في الإعدادات)
create or replace function public.lite_send_stats(p_code text, p_key text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r text; c text := upper(replace(p_code,'-',''));
begin
  r := public.lite_role(p_code, p_key);
  if r not in ('mgr','fol') then return jsonb_build_object('err', r); end if;
  return jsonb_build_object('ok', true,
    'today', (select count(*) from public.lite_send_log where code = c and ok and at >= date_trunc('day', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh'),
    'month', (select count(*) from public.lite_send_log where code = c and ok and at >= date_trunc('month', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh'),
    'fails', (select count(*) from public.lite_send_log where code = c and not ok and at >= now() - interval '1 day'));
end $$;
grant execute on function public.lite_send_stats(text,text) to anon, authenticated;

-- إعدادات مزوّد الإرسال لكل مدرسة (بوابة واتساب QR و/أو رسائل نصية سعودية)
-- الأسرار لا تُقرأ أبدًا من المتصفح: الحفظ عبر دالة للمدير، والقراءة تُعيدها مخفية، والدالة الخادمية وحدها تقرؤها كاملة.
create table if not exists public.lite_send_cfg(
  code text primary key references public.lite_schools(code) on delete cascade,
  wa jsonb not null default '{}'::jsonb,
  sms jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);
alter table public.lite_send_cfg enable row level security;
grant select on public.lite_send_cfg to anon;
grant select, insert, update, delete on public.lite_send_cfg to authenticated, service_role;

create or replace function public.lite_mask(j jsonb) returns jsonb
language sql immutable set search_path = public as $$
  select coalesce(jsonb_object_agg(k, case when k in ('provider','instance','sender','user','url') then v
    when coalesce(v #>> '{}','') = '' then '""'::jsonb else to_jsonb('••••' || right(v #>> '{}', 3)) end), '{}'::jsonb)
  from jsonb_each(coalesce(j,'{}'::jsonb)) as e(k, v)
$$;

create or replace function public.lite_send_cfg_get(p_code text, p_key text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r text; c text := upper(replace(p_code,'-','')); x public.lite_send_cfg;
begin
  r := public.lite_role(p_code, p_key);
  if r <> 'mgr' then return jsonb_build_object('err', case when r = 'fol' then 'mgr_only' else r end); end if;
  select * into x from public.lite_send_cfg where code = c;
  return jsonb_build_object('ok', true, 'wa', public.lite_mask(x.wa), 'sms', public.lite_mask(x.sms));
end $$;

-- الحفظ: القيمة التي تبدأ بـ •••• تعني «أبقِ القديمة»
create or replace function public.lite_send_cfg_set(p_code text, p_key text, p_wa jsonb, p_sms jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r text; c text := upper(replace(p_code,'-','')); x public.lite_send_cfg; nwa jsonb := '{}'::jsonb; nsms jsonb := '{}'::jsonb; k text; v text;
begin
  r := public.lite_role(p_code, p_key);
  if r <> 'mgr' then return jsonb_build_object('err', case when r = 'fol' then 'mgr_only' else r end); end if;
  if length(coalesce(p_wa::text,'')) > 2000 or length(coalesce(p_sms::text,'')) > 2000 then return jsonb_build_object('err','too_big'); end if;
  select * into x from public.lite_send_cfg where code = c;
  for k, v in select key, value #>> '{}' from jsonb_each(coalesce(p_wa,'{}'::jsonb)) loop
    nwa := nwa || jsonb_build_object(k, case when v like '••••%' then coalesce(x.wa ->> k, '') else left(btrim(v), 300) end); end loop;
  for k, v in select key, value #>> '{}' from jsonb_each(coalesce(p_sms,'{}'::jsonb)) loop
    nsms := nsms || jsonb_build_object(k, case when v like '••••%' then coalesce(x.sms ->> k, '') else left(btrim(v), 300) end); end loop;
  insert into public.lite_send_cfg(code, wa, sms, at) values (c, nwa, nsms, now())
    on conflict (code) do update set wa = excluded.wa, sms = excluded.sms, at = now();
  return jsonb_build_object('ok', true, 'wa', public.lite_mask(nwa), 'sms', public.lite_mask(nsms));
end $$;

revoke all on function public.lite_mask(jsonb) from public, anon, authenticated;
grant execute on function public.lite_send_cfg_get(text,text) to anon, authenticated;
grant execute on function public.lite_send_cfg_set(text,text,jsonb,jsonb) to anon, authenticated;

-- ===================== lite_v2.sql =====================
-- راصد المبسّط v2: أسعار قابلة للتعديل، طلبات اشتراك وتفعيل تلقائي عند تأكيد الدفع،
-- لوحة مشرف لعدة مدارس، وإحصاءات الاستخدام في لوحة الإدارة.
-- يُنفَّذ بعد lite_sync.sql و lite_license.sql (و lite_send.sql إن وُجد).

-- ===== الإعدادات العامة (الأسعار وروابط الدفع ومدة التجربة) =====
create table if not exists public.lite_settings(
  id int primary key default 1 check (id = 1),
  prices jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);
alter table public.lite_settings enable row level security;
grant select on public.lite_settings to anon;
grant select, insert, update, delete on public.lite_settings to authenticated, service_role;
insert into public.lite_settings(id, prices) values (1, jsonb_build_object(
  'currency','ر.س','period','لكل مدرسة لفصل دراسي',
  'basic',149,'pro',349,'multi_discount',25,'multi_min',5,'trial_days',14,'license_days',150,
  'pay_basic','','pay_pro','','bank','','contact','966561955430'))
on conflict (id) do nothing;

-- قراءة الأسعار للجميع (لا تحوي أسرارًا)
create or replace function public.lite_prices() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select prices from public.lite_settings where id = 1), '{}'::jsonb)
$$;
grant execute on function public.lite_prices() to anon, authenticated;

create or replace function public.lite_admin_prices_set(p_pass text, p_prices jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.lite_admin_ok(p_pass) then return jsonb_build_object('err','admin'); end if;
  if length(coalesce(p_prices::text,'')) > 4000 then return jsonb_build_object('err','too_big'); end if;
  insert into public.lite_settings(id, prices, at) values (1, p_prices, now())
    on conflict (id) do update set prices = public.lite_settings.prices || excluded.prices, at = now();
  return jsonb_build_object('ok', true, 'prices', public.lite_prices());
end $$;
grant execute on function public.lite_admin_prices_set(text,jsonb) to anon, authenticated;

-- مدة التجربة للمدارس الجديدة من الإعدادات
create or replace function public.lite_trial_days() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.plan_until := current_date + coalesce(((select prices from public.lite_settings where id = 1) ->> 'trial_days')::int, 14);
  return new;
end $$;
drop trigger if exists lite_trial_days on public.lite_schools;
create trigger lite_trial_days before insert on public.lite_schools for each row execute function public.lite_trial_days();

-- ===== طلبات الاشتراك =====
create table if not exists public.lite_orders(
  id bigserial primary key,
  code text references public.lite_schools(code) on delete set null,
  school text not null default '',
  plan text not null check (plan in ('basic','pro')),
  qty int not null default 1,
  amount numeric not null default 0,
  contact text not null default '',
  phone text not null default '',
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  license text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.lite_orders enable row level security;
grant select on public.lite_orders to anon;
grant select, insert, update, delete on public.lite_orders to authenticated, service_role;
grant usage, select on sequence public.lite_orders_id_seq to authenticated, service_role;

-- المدير يطلب باقة لمدرسته؛ يُعاد رقم الطلب والمبلغ ورابط الدفع
create or replace function public.lite_order_create(p_code text, p_key text, p_plan text, p_contact text, p_phone text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r text; c text := upper(replace(p_code,'-','')); s public.lite_schools; pr jsonb := public.lite_prices(); amt numeric; o public.lite_orders;
begin
  r := public.lite_role(p_code, p_key);
  if r <> 'mgr' then return jsonb_build_object('err', case when r = 'fol' then 'mgr_only' else r end); end if;
  if p_plan not in ('basic','pro') then return jsonb_build_object('err','args'); end if;
  if (select count(*) from public.lite_orders where code = c and status = 'pending') >= 3 then return jsonb_build_object('err','too_many'); end if;
  select * into s from public.lite_schools where code = c;
  amt := coalesce((pr ->> p_plan)::numeric, 0);
  insert into public.lite_orders(code, school, plan, amount, contact, phone)
    values (c, s.name, p_plan, amt, left(coalesce(p_contact,''),80), left(regexp_replace(coalesce(p_phone,''),'\D','','g'),15)) returning * into o;
  return jsonb_build_object('ok', true, 'id', o.id, 'amount', amt, 'pay', coalesce(pr ->> ('pay_' || p_plan), ''), 'bank', coalesce(pr ->> 'bank',''), 'contact', coalesce(pr ->> 'contact',''));
end $$;
grant execute on function public.lite_order_create(text,text,text,text,text) to anon, authenticated;

-- حالة طلبات المدرسة (للمدير)
create or replace function public.lite_order_list(p_code text, p_key text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r text; c text := upper(replace(p_code,'-',''));
begin
  r := public.lite_role(p_code, p_key);
  if r <> 'mgr' then return jsonb_build_object('err', r); end if;
  return jsonb_build_object('ok', true, 'list', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'plan',plan,'amount',amount,'status',status,'created_at',created_at) order by id desc),'[]'::jsonb)
    from public.lite_orders where code = c));
end $$;
grant execute on function public.lite_order_list(text,text) to anon, authenticated;

-- الإدارة: تأكيد الدفع = إنشاء كود وتفعيل المدرسة فورًا
create or replace function public.lite_admin_order_paid(p_pass text, p_id bigint)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare o public.lite_orders; s public.lite_schools; pr jsonb := public.lite_prices(); days int; lic text; abc text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; i int; base date;
begin
  if not public.lite_admin_ok(p_pass) then return jsonb_build_object('err','admin'); end if;
  select * into o from public.lite_orders where id = p_id for update;
  if not found then return jsonb_build_object('err','none'); end if;
  if o.status = 'paid' then return jsonb_build_object('ok', true, 'license', o.license, 'already', true); end if;
  days := coalesce((pr ->> 'license_days')::int, 150);
  loop
    lic := 'RSD-'; for i in 1..8 loop lic := lic || substr(abc, 1 + (get_byte(extensions.gen_random_bytes(1),0) % length(abc)), 1); if i = 4 then lic := lic || '-'; end if; end loop;
    exit when not exists(select 1 from public.lite_licenses where code = lic);
  end loop;
  insert into public.lite_licenses(code, plan, days, note) values (lic, o.plan, days, 'طلب #' || o.id || ' · ' || o.school);
  if o.code is not null then
    select * into s from public.lite_schools where code = o.code for update;
    base := greatest(current_date, case when s.plan in ('basic','pro') then s.plan_until else current_date end);
    update public.lite_schools set plan = case when s.plan = 'pro' and s.plan_until >= current_date and o.plan = 'basic' then 'pro' else o.plan end,
      plan_until = base + days where code = o.code;
    update public.lite_licenses set used_by = o.code, used_at = now() where code = lic;
  end if;
  update public.lite_orders set status = 'paid', paid_at = now(), license = lic where id = o.id;
  return jsonb_build_object('ok', true, 'license', lic, 'activated', o.code is not null, 'phone', o.phone, 'school', o.school);
end $$;
grant execute on function public.lite_admin_order_paid(text,bigint) to anon, authenticated;

create or replace function public.lite_admin_order_cancel(p_pass text, p_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.lite_admin_ok(p_pass) then return jsonb_build_object('err','admin'); end if;
  update public.lite_orders set status = 'cancelled' where id = p_id and status = 'pending';
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.lite_admin_order_cancel(text,bigint) to anon, authenticated;

-- ===== لوحة الإدارة: الأكواد + المدارس مع إحصاءات الاستخدام + الطلبات =====
create or replace function public.lite_admin_list(p_pass text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.lite_admin_ok(p_pass) then return jsonb_build_object('err','admin'); end if;
  return jsonb_build_object('ok', true,
    'licenses', (select coalesce(jsonb_agg(jsonb_build_object('code',code,'plan',plan,'days',days,'note',note,'created_at',created_at,'used_by',used_by,'used_at',used_at) order by created_at desc),'[]'::jsonb) from public.lite_licenses),
    'schools', (select coalesce(jsonb_agg(jsonb_build_object('code',s.code,'name',s.name,'plan',s.plan,'plan_until',s.plan_until,'created_at',s.created_at,
        'marks',(select count(*) from public.lite_marks m where m.code = s.code),
        'marks7',(select count(*) from public.lite_marks m where m.code = s.code and m.updated_at > now() - interval '7 days'),
        'days7',(select count(distinct left(m.k,10)) from public.lite_marks m where m.code = s.code and m.updated_at > now() - interval '7 days'),
        'last',(select max(m.updated_at) from public.lite_marks m where m.code = s.code),
        'sends30',(case when to_regclass('public.lite_send_log') is null then 0 else (select count(*) from public.lite_send_log l where l.code = s.code and l.ok and l.at > now() - interval '30 days') end)
      ) order by s.created_at desc),'[]'::jsonb) from public.lite_schools s),
    'orders', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'code',code,'school',school,'plan',plan,'amount',amount,'contact',contact,'phone',phone,'status',status,'license',license,'created_at',created_at) order by id desc),'[]'::jsonb) from public.lite_orders),
    'prices', public.lite_prices());
end $$;

-- ===== لوحة المشرف: ملخص عدة مدارس (برمز المدير أو المتابع لكل مدرسة) =====
create or replace function public.lite_sup_stats(p_items jsonb, p_date date)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare it jsonb; out jsonb := '[]'::jsonb; r text; c text; s public.lite_schools; dow int; ws date; tot int; o jsonb; w jsonb;
begin
  if jsonb_array_length(coalesce(p_items,'[]'::jsonb)) > 40 then return jsonb_build_object('err','too_many'); end if;
  dow := extract(dow from p_date)::int; ws := p_date - dow;
  for it in select * from jsonb_array_elements(p_items) loop
    c := upper(regexp_replace(coalesce(it->>'code',''),'[^A-Za-z0-9]','','g'));
    r := public.lite_role(c, it->>'key');
    if r not in ('mgr','fol') then out := out || jsonb_build_array(jsonb_build_object('code',c,'err',r)); continue; end if;
    select * into s from public.lite_schools where code = c;
    select count(*) into tot from jsonb_array_elements(s.rows) x where (x->>'d')::int = dow;
    select jsonb_build_object('ok',count(*) filter (where st='ok'),'late',count(*) filter (where st='late'),'bad',count(*) filter (where st='bad'))
      into o from public.lite_marks where code = c and k like to_char(p_date,'YYYY-MM-DD') || '|%';
    select jsonb_build_object('ok',count(*) filter (where st='ok'),'late',count(*) filter (where st='late'),'bad',count(*) filter (where st='bad'))
      into w from public.lite_marks where code = c and left(k,10) between to_char(ws,'YYYY-MM-DD') and to_char(ws + 4,'YYYY-MM-DD');
    out := out || jsonb_build_array(jsonb_build_object('code',c,'name',s.name,'total',tot,'today',o,'week',w,'plan',s.plan,'plan_until',s.plan_until,
      'bad_list',(select coalesce(jsonb_agg(jsonb_build_object('k',k,'t',t) order by k),'[]'::jsonb) from public.lite_marks where code = c and st = 'bad' and k like to_char(p_date,'YYYY-MM-DD') || '|%')));
  end loop;
  return jsonb_build_object('ok', true, 'list', out);
end $$;
grant execute on function public.lite_sup_stats(jsonb,date) to anon, authenticated;
