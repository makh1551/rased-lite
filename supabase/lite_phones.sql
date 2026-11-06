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
