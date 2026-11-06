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
