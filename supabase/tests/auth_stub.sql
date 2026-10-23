-- 로컬 테스트(PGlite) 전용: Supabase가 기본 제공하는 auth 스키마·역할을 최소한으로 흉내 낸다.
-- 실제 Supabase에는 적용하지 않는다.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now()
);

-- Supabase의 auth.uid() 정의와 같은 방식으로 JWT claim에서 sub를 읽는다.
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- 로컬 체험 모드(LOCAL_DEV_MODE) 전용 간이 인증 정보
alter table auth.users add column banned boolean not null default false;
create table auth.local_passwords (
  user_id uuid primary key references auth.users (id) on delete cascade,
  password_hash text not null
);
