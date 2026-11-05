-- راصد المبسّط: مزامنة المدير والمتابعين بين الأجهزة
-- الجداول مغلقة بـ RLS دون سياسات؛ كل الوصول عبر دوال security definer تتحقق من رمز المدرسة والرمز السري.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.lite_schools(
  code text primary key,
  name text not null default '',
  mgr_hash text not null,
  fol_hash text,
  cfg jsonb not null default '{}'::jsonb,
  rows jsonb not null default '[]'::jsonb,
  cfg_at timestamptz not null default clock_timestamp(),
  fails int not null default 0,
  fail_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.lite_marks(
  code text not null references public.lite_schools(code) on delete cascade,
  k text not null,
  st text, at text, t text, by text, src text, sent text,
  updated_at timestamptz not null default clock_timestamp(),
  primary key(code,k)
);
create index if not exists lite_marks_code_upd on public.lite_marks(code,updated_at);

alter table public.lite_schools enable row level security;
alter table public.lite_marks enable row level security;
grant select on public.lite_schools, public.lite_marks to anon;
grant select, insert, update, delete on public.lite_schools, public.lite_marks to authenticated, service_role;

create or replace function public.lite_hash(p_key text, p_code text) returns text
language sql immutable set search_path = public, extensions as $$
  select encode(extensions.digest(coalesce(p_key,'') || ':' || p_code, 'sha256'), 'hex')
$$;

create or replace function public.lite_role(p_code text, p_key text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare s public.lite_schools; h text;
begin
  select * into s from public.lite_schools where code = upper(replace(p_code,'-',''));
  if not found then return 'none'; end if;
  if s.fails >= 30 and s.fail_at > now() - interval '1 hour' then return 'locked'; end if;
  h := public.lite_hash(p_key, s.code);
  if h = s.mgr_hash then return 'mgr'; end if;
  if s.fol_hash is not null and h = s.fol_hash then return 'fol'; end if;
  update public.lite_schools
     set fails = case when fail_at > now() - interval '1 hour' then fails + 1 else 1 end, fail_at = now()
   where code = s.code;
  return 'bad';
end $$;

create or replace function public.lite_create(p_name text, p_mgr_key text, p_fol_key text, p_cfg jsonb, p_rows jsonb)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare c text; abc text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; i int;
begin
  if length(coalesce(p_mgr_key,'')) < 4 then raise exception 'رمز المدير قصير'; end if;
  if pg_column_size(p_rows) > 2000000 then raise exception 'الجدول كبير جدًا'; end if;
  loop
    c := '';
    for i in 1..8 loop c := c || substr(abc, 1 + (get_byte(extensions.gen_random_bytes(1),0) % length(abc)), 1); end loop;
    exit when not exists(select 1 from public.lite_schools where code = c);
  end loop;
  insert into public.lite_schools(code,name,mgr_hash,fol_hash,cfg,rows)
  values (c, coalesce(p_name,''), public.lite_hash(p_mgr_key,c),
          case when coalesce(p_fol_key,'') = '' then null else public.lite_hash(p_fol_key,c) end,
          coalesce(p_cfg,'{}'::jsonb), coalesce(p_rows,'[]'::jsonb));
  return c;
end $$;

create or replace function public.lite_pull(p_code text, p_key text, p_since timestamptz)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r text; s public.lite_schools; m jsonb;
begin
  r := public.lite_role(p_code,p_key);
  if r not in ('mgr','fol') then return jsonb_build_object('err', r); end if;
  select * into s from public.lite_schools where code = upper(replace(p_code,'-',''));
  select coalesce(jsonb_agg(jsonb_build_object('k',k,'st',st,'at',at,'t',t,'by',by,'src',src,'sent',sent)),'[]'::jsonb) into m
    from public.lite_marks
   where code = s.code and updated_at > coalesce(p_since, now() - interval '150 days');
  return jsonb_build_object('role', r, 'name', s.name, 'now', clock_timestamp(), 'marks', m,
    'cfg', case when p_since is null or s.cfg_at > p_since then s.cfg else null end,
    'rows', case when p_since is null or s.cfg_at > p_since then s.rows else null end);
end $$;

create or replace function public.lite_push(p_code text, p_key text, p_marks jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r text; c text := upper(replace(p_code,'-','')); e jsonb;
begin
  r := public.lite_role(p_code,p_key);
  if r not in ('mgr','fol') then return jsonb_build_object('err', r); end if;
  if jsonb_array_length(p_marks) > 2000 then return jsonb_build_object('err','too_many'); end if;
  for e in select * from jsonb_array_elements(p_marks) loop
    insert into public.lite_marks(code,k,st,at,t,by,src,sent,updated_at)
    values (c, left(e->>'k',80), left(e->>'st',8), left(e->>'at',8), left(e->>'t',80), left(e->>'by',60), left(e->>'src',8), left(e->>'sent',8), clock_timestamp())
    on conflict (code,k) do update set st=excluded.st, at=excluded.at, t=excluded.t, by=excluded.by, src=excluded.src, sent=excluded.sent, updated_at=excluded.updated_at;
  end loop;
  return jsonb_build_object('ok', true, 'now', clock_timestamp());
end $$;

create or replace function public.lite_set_cfg(p_code text, p_key text, p_name text, p_cfg jsonb, p_rows jsonb, p_fol_key text, p_new_key text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r text; c text := upper(replace(p_code,'-',''));
begin
  r := public.lite_role(p_code,p_key);
  if r <> 'mgr' then return jsonb_build_object('err', r); end if;
  if pg_column_size(p_rows) > 2000000 then return jsonb_build_object('err','too_big'); end if;
  update public.lite_schools set
    name = coalesce(p_name, name), cfg = coalesce(p_cfg, cfg), rows = coalesce(p_rows, rows), cfg_at = clock_timestamp(),
    fol_hash = case when p_fol_key is null then fol_hash when p_fol_key = '' then null else public.lite_hash(p_fol_key, c) end,
    mgr_hash = case when coalesce(p_new_key,'') = '' then mgr_hash when length(p_new_key) >= 4 then public.lite_hash(p_new_key, c) else mgr_hash end
  where code = c;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.lite_role(text,text) from public, anon, authenticated;
revoke all on function public.lite_hash(text,text) from public, anon, authenticated;
grant execute on function public.lite_create(text,text,text,jsonb,jsonb) to anon, authenticated;
grant execute on function public.lite_pull(text,text,timestamptz) to anon, authenticated;
grant execute on function public.lite_push(text,text,jsonb) to anon, authenticated;
grant execute on function public.lite_set_cfg(text,text,text,jsonb,jsonb,text,text) to anon, authenticated;
