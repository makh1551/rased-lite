-- راصد المبسّط: الاشتراكات وأكواد التفعيل
-- قبل التنفيذ: غيّر كلمة مرور الإدارة في آخر سطر (ضع كلمتك مكان CHANGE-ME-ADMIN) ولا تشاركها.

alter table public.lite_schools add column if not exists plan text not null default 'trial';
alter table public.lite_schools add column if not exists plan_until date not null default (current_date + 14);

create table if not exists public.lite_licenses(
  code text primary key,
  plan text not null check (plan in ('basic','pro')),
  days int not null default 150,
  note text not null default '',
  created_at timestamptz not null default now(),
  used_by text references public.lite_schools(code) on delete set null,
  used_at timestamptz
);
create table if not exists public.lite_admin(
  id int primary key default 1 check (id = 1),
  pass_hash text not null
);
alter table public.lite_licenses enable row level security;
alter table public.lite_admin enable row level security;
grant select on public.lite_licenses, public.lite_admin to anon;
grant select, insert, update, delete on public.lite_licenses, public.lite_admin to authenticated, service_role;

-- هل الاشتراك ساري؟
create or replace function public.lite_active(s public.lite_schools) returns boolean
language sql stable set search_path = public as $$
  select s.plan in ('trial','basic','pro') and s.plan_until >= current_date
$$;

-- الجلب: يعيد الباقة دائمًا؛ ويمنع المتابع إذا انتهى الاشتراك
create or replace function public.lite_pull(p_code text, p_key text, p_since timestamptz)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r text; s public.lite_schools; m jsonb; act boolean;
begin
  r := public.lite_role(p_code,p_key);
  if r not in ('mgr','fol') then return jsonb_build_object('err', r); end if;
  select * into s from public.lite_schools where code = upper(replace(p_code,'-',''));
  act := public.lite_active(s);
  if not act and r = 'fol' then return jsonb_build_object('err','plan'); end if;
  if act then
    select coalesce(jsonb_agg(jsonb_build_object('k',k,'st',st,'at',at,'t',t,'by',by,'src',src,'sent',sent)),'[]'::jsonb) into m
      from public.lite_marks where code = s.code and updated_at > coalesce(p_since, now() - interval '150 days');
  else m := '[]'::jsonb; end if;
  return jsonb_build_object('role', r, 'name', s.name, 'now', clock_timestamp(), 'marks', m,
    'plan', case when act then s.plan else 'free' end, 'plan_until', s.plan_until,
    'cfg', case when p_since is null or s.cfg_at > p_since then s.cfg else null end,
    'rows', case when p_since is null or s.cfg_at > p_since then s.rows else null end);
end $$;

-- الرفع: يتطلب اشتراكًا ساريًا
create or replace function public.lite_push(p_code text, p_key text, p_marks jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r text; c text := upper(replace(p_code,'-','')); e jsonb; s public.lite_schools;
begin
  r := public.lite_role(p_code,p_key);
  if r not in ('mgr','fol') then return jsonb_build_object('err', r); end if;
  select * into s from public.lite_schools where code = c;
  if not public.lite_active(s) then return jsonb_build_object('err','plan'); end if;
  if jsonb_array_length(p_marks) > 2000 then return jsonb_build_object('err','too_many'); end if;
  for e in select * from jsonb_array_elements(p_marks) loop
    insert into public.lite_marks(code,k,st,at,t,by,src,sent,updated_at)
    values (c, left(e->>'k',80), left(e->>'st',8), left(e->>'at',8), left(e->>'t',80), left(e->>'by',60), left(e->>'src',8), left(e->>'sent',8), clock_timestamp())
    on conflict (code,k) do update set st=excluded.st, at=excluded.at, t=excluded.t, by=excluded.by, src=excluded.src, sent=excluded.sent, updated_at=excluded.updated_at;
  end loop;
  return jsonb_build_object('ok', true, 'now', clock_timestamp());
end $$;

-- تفعيل كود اشتراك لمدرسة (المدير فقط)
create or replace function public.lite_activate(p_code text, p_key text, p_license text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r text; c text := upper(replace(p_code,'-','')); l public.lite_licenses; s public.lite_schools; base date;
begin
  r := public.lite_role(p_code,p_key);
  if r <> 'mgr' then return jsonb_build_object('err', case when r='fol' then 'mgr_only' else r end); end if;
  select * into l from public.lite_licenses where code = upper(trim(p_license)) for update;
  if not found then return jsonb_build_object('err','license'); end if;
  if l.used_by is not null then return jsonb_build_object('err','used'); end if;
  select * into s from public.lite_schools where code = c;
  base := greatest(current_date, case when s.plan in ('basic','pro') then s.plan_until else current_date end);
  update public.lite_schools set
    plan = case when s.plan = 'pro' and s.plan_until >= current_date and l.plan = 'basic' then 'pro' else l.plan end,
    plan_until = base + l.days
  where code = c returning * into s;
  update public.lite_licenses set used_by = c, used_at = now() where code = l.code;
  return jsonb_build_object('ok', true, 'plan', s.plan, 'plan_until', s.plan_until);
end $$;

-- الإدارة (لك فقط بكلمة المرور)
create or replace function public.lite_admin_ok(p_pass text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists(select 1 from public.lite_admin where pass_hash = encode(extensions.digest(coalesce(p_pass,'') || ':admin','sha256'),'hex'))
$$;
create or replace function public.lite_admin_create(p_pass text, p_plan text, p_count int, p_days int, p_note text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare out jsonb := '[]'::jsonb; c text; abc text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; i int; j int;
begin
  if not public.lite_admin_ok(p_pass) then return jsonb_build_object('err','admin'); end if;
  if p_plan not in ('basic','pro') or p_count < 1 or p_count > 50 then return jsonb_build_object('err','args'); end if;
  for j in 1..p_count loop
    loop
      c := 'RSD-';
      for i in 1..8 loop c := c || substr(abc, 1 + (get_byte(extensions.gen_random_bytes(1),0) % length(abc)), 1); if i = 4 then c := c || '-'; end if; end loop;
      exit when not exists(select 1 from public.lite_licenses where code = c);
    end loop;
    insert into public.lite_licenses(code,plan,days,note) values (c, p_plan, coalesce(p_days,150), coalesce(p_note,''));
    out := out || to_jsonb(c);
  end loop;
  return jsonb_build_object('ok', true, 'codes', out);
end $$;
create or replace function public.lite_admin_list(p_pass text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.lite_admin_ok(p_pass) then return jsonb_build_object('err','admin'); end if;
  return jsonb_build_object('ok', true,
    'licenses', (select coalesce(jsonb_agg(jsonb_build_object('code',code,'plan',plan,'days',days,'note',note,'created_at',created_at,'used_by',used_by,'used_at',used_at) order by created_at desc),'[]'::jsonb) from public.lite_licenses),
    'schools', (select coalesce(jsonb_agg(jsonb_build_object('code',code,'name',name,'plan',plan,'plan_until',plan_until,'created_at',created_at,
        'marks',(select count(*) from public.lite_marks m where m.code = s.code)) order by created_at desc),'[]'::jsonb) from public.lite_schools s));
end $$;

revoke all on function public.lite_active(public.lite_schools) from public, anon, authenticated;
revoke all on function public.lite_admin_ok(text) from public, anon, authenticated;
grant execute on function public.lite_pull(text,text,timestamptz) to anon, authenticated;
grant execute on function public.lite_push(text,text,jsonb) to anon, authenticated;
grant execute on function public.lite_activate(text,text,text) to anon, authenticated;
grant execute on function public.lite_admin_create(text,text,int,int,text) to anon, authenticated;
grant execute on function public.lite_admin_list(text) to anon, authenticated;

-- كلمة مرور الإدارة: غيّر CHANGE-ME-ADMIN إلى كلمتك قبل التنفيذ
insert into public.lite_admin(id, pass_hash) values (1, encode(extensions.digest('CHANGE-ME-ADMIN' || ':admin','sha256'),'hex'))
on conflict (id) do update set pass_hash = excluded.pass_hash;
