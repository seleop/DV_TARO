-- 운세 노트 초기 스키마 (Supabase Postgres)
-- 적용: Supabase 대시보드 SQL Editor에 붙여 넣거나 `supabase db push`
--
-- 접근 모델
--  * 사용자 데이터(saju_calculations, saju_engine_results, fortune_readings, profiles)는 RLS로 본인 행만 접근
--  * 서버는 사용자 요청을 처리할 때 트랜잭션 안에서 `set local role authenticated` + JWT claim(sub)을 설정해 RLS를 그대로 적용받는다
--  * invitations, usage_logs, admin_audit 은 authenticated/anon 정책이 없어 클라이언트에서 접근 불가 (서버 관리 연결만)
--  * 출생 정보·결과·내용은 애플리케이션에서 AES-256-GCM으로 암호화한 *_enc 컬럼에만 저장 (DB 관리자도 평문 열람 불가)

-- ── 테이블 ───────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  primary_calculation_id uuid,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  role text not null check (role in ('user', 'admin')),
  memo text check (memo is null or char_length(memo) <= 40),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_by uuid references public.profiles (id) on delete set null,
  used_at timestamptz,
  revoked_at timestamptz
);

create table public.saju_calculations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  cache_key text not null,
  label_enc text,
  input_enc text not null,
  result_enc text not null,
  status text not null check (status in ('MATCH', 'CONDITIONAL_MATCH', 'MISMATCH', 'UNVERIFIABLE')),
  reasons jsonb not null default '[]',
  settings jsonb not null default '{}',
  engine_versions jsonb not null default '[]',
  rules_version text not null,
  created_at timestamptz not null default now(),
  unique (user_id, cache_key)
);
create index saju_calculations_user_idx on public.saju_calculations (user_id, created_at desc);

alter table public.profiles
  add constraint profiles_primary_calculation_fk
  foreign key (primary_calculation_id) references public.saju_calculations (id) on delete set null;

create table public.saju_engine_results (
  id uuid primary key default gen_random_uuid(),
  calculation_id uuid not null references public.saju_calculations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  engine text not null,
  engine_version text not null,
  ok boolean not null,
  error_code text,
  duration_ms integer not null,
  normalized_enc text,
  field_status jsonb not null,
  created_at timestamptz not null default now()
);
create index saju_engine_results_calc_idx on public.saju_engine_results (calculation_id);
create index saju_engine_results_time_idx on public.saju_engine_results (created_at);

create table public.fortune_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  calculation_id uuid references public.saju_calculations (id) on delete cascade,
  kind text not null check (kind in ('saju', 'daily', 'tarot', 'horoscope')),
  cache_key text,
  provider text not null,
  model text not null,
  prompt_version text not null,
  content_enc text not null,
  created_at timestamptz not null default now()
);
create index fortune_readings_user_idx on public.fortune_readings (user_id, created_at desc);
create index fortune_readings_cache_idx on public.fortune_readings (user_id, cache_key);

create table public.usage_logs (
  id bigint generated always as identity primary key,
  user_anon text not null,
  kind text not null,
  provider text,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd_est double precision not null default 0,
  duration_ms integer not null default 0,
  ok boolean not null,
  error_code text,
  prompt_version text,
  created_at timestamptz not null default now()
);
create index usage_logs_user_idx on public.usage_logs (user_anon, kind, created_at);
create index usage_logs_time_idx on public.usage_logs (created_at);

create table public.admin_audit (
  id bigint generated always as identity primary key,
  admin_id uuid,
  action text not null,
  target text,
  created_at timestamptz not null default now()
);

-- ── 권한 ────────────────────────────────────────────────
-- Supabase는 public 스키마 테이블에 anon/authenticated 권한을 기본 부여하므로 먼저 모두 회수한다.
revoke all on public.profiles, public.invitations, public.saju_calculations, public.saju_engine_results,
  public.fortune_readings, public.usage_logs, public.admin_audit from anon, authenticated;

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.saju_calculations to authenticated;
grant select, insert, delete on public.saju_engine_results to authenticated;
grant select, insert, delete on public.fortune_readings to authenticated;

-- ── RLS ────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.invitations enable row level security;
alter table public.saju_calculations enable row level security;
alter table public.saju_engine_results enable row level security;
alter table public.fortune_readings enable row level security;
alter table public.usage_logs enable row level security;
alter table public.admin_audit enable row level security;

-- 활성 사용자 여부 (RLS 정책 안에서 profiles RLS를 다시 타지 않도록 security definer)
create function public.is_active_user() returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active');
$$;
revoke all on function public.is_active_user() from public;
grant execute on function public.is_active_user() to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());

create policy calc_select_own on public.saju_calculations
  for select to authenticated using (user_id = auth.uid() and public.is_active_user());
create policy calc_insert_own on public.saju_calculations
  for insert to authenticated with check (user_id = auth.uid() and public.is_active_user());
create policy calc_update_own on public.saju_calculations
  for update to authenticated using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid());
create policy calc_delete_own on public.saju_calculations
  for delete to authenticated using (user_id = auth.uid() and public.is_active_user());

create policy engine_select_own on public.saju_engine_results
  for select to authenticated using (user_id = auth.uid() and public.is_active_user());
create policy engine_insert_own on public.saju_engine_results
  for insert to authenticated with check (
    user_id = auth.uid() and public.is_active_user()
    and exists (select 1 from public.saju_calculations c where c.id = calculation_id and c.user_id = auth.uid())
  );
create policy engine_delete_own on public.saju_engine_results
  for delete to authenticated using (user_id = auth.uid());

create policy reading_select_own on public.fortune_readings
  for select to authenticated using (user_id = auth.uid() and public.is_active_user());
create policy reading_insert_own on public.fortune_readings
  for insert to authenticated with check (
    user_id = auth.uid() and public.is_active_user()
    and (calculation_id is null or exists (select 1 from public.saju_calculations c where c.id = calculation_id and c.user_id = auth.uid()))
  );
create policy reading_delete_own on public.fortune_readings
  for delete to authenticated using (user_id = auth.uid() and public.is_active_user());

-- invitations / usage_logs / admin_audit: 정책 없음 = authenticated·anon 접근 불가
