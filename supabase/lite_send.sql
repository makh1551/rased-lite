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

-- أرشيف الإرسال (طُبّق 6 نوفمبر)
alter table public.lite_send_log add column if not exists to_name text;
create or replace function public.lite_send_list(p_code text, p_key text, p_days int)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r text; c text := upper(replace(p_code,'-',''));
begin
  r := public.lite_role(p_code, p_key);
  if r <> 'mgr' then return jsonb_build_object('err', case when r = 'fol' then 'mgr_only' else r end); end if;
  return jsonb_build_object('ok', true, 'list', (select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'dkey',dkey,'to',to_tail,'name',to_name,'ch',channel,'ok',ok,'err',err,'at',at) order by at desc),'[]'::jsonb)
    from (select * from public.lite_send_log where code = c and at > now() - make_interval(days => least(greatest(coalesce(p_days,7),1),90)) order by at desc limit 1000) x));
end $$;
grant execute on function public.lite_send_list(text,text,int) to anon, authenticated;
