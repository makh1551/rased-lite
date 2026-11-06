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
