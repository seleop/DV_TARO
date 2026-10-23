-- 회원가입 시 개인정보 수집·이용 동의 기록 (동의 시각과 동의한 문구 버전)
-- 이 마이그레이션 이전에 가입한 계정은 NULL로 남는다.
alter table public.profiles
  add column privacy_agreed_at timestamptz,
  add column privacy_version text check (privacy_version is null or char_length(privacy_version) <= 20);
