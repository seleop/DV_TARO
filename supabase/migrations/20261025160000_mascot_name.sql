-- 사용자가 지어 준 마스코트(기본 "별이") 이름 (2026-10-25 사용자 결정: 가입 마무리에서 별이가 정체를 드러낼 때 짓고, 프로필 설정에서 바꾼다)
-- NULL = 아직 짓지 않음 (기존 사용자는 홈에서 한 번 물어본다). 이 마이그레이션 이전에 가입한 계정은 NULL로 남는다.
alter table public.profiles
  add column mascot_name text check (mascot_name is null or char_length(mascot_name) between 1 and 8);
