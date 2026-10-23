# DV_TARO 작업 인계 (2026-10-23 갱신)

다른 세션에서 이어서 작업할 때 참고하는 진행 내역 요약입니다.

## 기본 정보
- 원격 저장소: https://github.com/seleop/DV_TARO.git (`origin`, 브랜치 `main`)
- 서비스 주소: https://dvtarocard.vercel.app (main push 시 Vercel 자동 배포)
- 로컬 경로: `C:\Users\seleo\Documents\DV_TARO`
- 형태: 모바일 웹앱 (PWA 홈 화면 설치)
- 기술 스택: Next.js 16 + TypeScript + Tailwind 4, Supabase(Auth + Postgres RLS), Vercel
- 환경: Windows 11, Node v24.22.1, npm 11.19.1

## 지금까지 만든 것
- 사주: 세 계산 엔진(manseryeok, lunar-javascript, 점봄 API) 교차검증 → 검증된 값만 AI 해석 (`docs/VERIFICATION.md`, `docs/ENGINE_RESEARCH.md`)
- 오늘의 운세(내 사주 기준), 타로, 별자리, MY(기록·삭제·계정 삭제), 프로필 설정(닉네임·내 출생 정보), 관리자 화면
- 회원가입: 이메일·비밀번호·비밀번호 확인·닉네임. `SIGNUP_MODE`(open/invite/closed), `ADMIN_EMAILS`로 관리자 지정
- 모바일 앱형 UI(보라 밤하늘, 가운데 대표 캐릭터, 하단 CTA·탭바), 홈 화면 설치용 manifest·아이콘
- 보안·개인정보: 출생 정보·해석 암호화 저장, RLS(본인 행만), 사용자별 호출 제한·월 예산 (`docs/DATA_POLICY.md`)
- 테스트 143개: PGlite로 실제 마이그레이션·RLS 검증, 외부 API는 기록된 실제 응답으로 모의. `npm run test:live`는 점봄 API 실호출
- 로컬 체험 모드(`LOCAL_DEV_MODE=true`): Supabase 없이 실행

## 현재 상태 (2026-10-23)
- **진행 중**: 로그인·회원가입 개선 (브랜치 `claude/youthful-shamir-aa9bf7`). 범위: `src/app/login/**`, `src/app/signup/**`, `LoginForm`·`SafeForm`, `src/app/api/auth/**`, `repo/users.ts` 가입·로그인 함수, `lib/auth/session.ts`, `proxy.ts`(로그인 리다이렉트), `(app)/layout.tsx`(생년월일 미입력 시 프로필로), `ProfileClient` 환영 문구, 개인정보 동의 마이그레이션, 관련 테스트·문서
- **배포 완료**: https://dvtarocard.vercel.app (Vercel 프로젝트 `dvtarocard`). Supabase 프로젝트 URL `https://umkqgreogwujvsrjngqv.supabase.co` (공개 값)
- **해결됨**: 회원가입 "계정을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." 오류
  - 원인: Vercel 환경변수 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`가 Type=Secret으로 저장돼 있었음 (Vercel이 공개 접두사 경고 표시)
  - 조치: 두 값을 지우고 Type=Config로 다시 만든 뒤 Redeploy → 가입·로그인 정상 동작을 사용자가 확인 (`docs/OPERATIONS.md` 5단계·문제 해결)
  - e6c86a6: 가입 실패 시 Supabase 오류 status/code/message를 서버 로그에 남김 → 재발 시 Vercel Logs에서 `[auth-admin createUser]`, `[signup createUser]` 검색
- 1ea80a2: `npm run typecheck` = `next typegen && tsc --noEmit` (새 체크아웃에서 `.next` 타입 누락 해결)
- `npm audit` high 5건은 eslint-config-next 하위 개발 의존성(micromatch/fast-glob)이라 배포물과 무관. `audit fix --force`는 하지 않음

## 다음 단계
1. Android·iOS에서 접속·가입·로그인 확인 (`docs/OPERATIONS.md` 6단계)
2. 본격 개발 범위 결정
   - 대표 캐릭터 이미지 반영 → `public/character/` + `src/config/brand.ts`
   - PWA 오프라인 지원(서비스워커)
   - Claude API 연결 (`AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`)
   - 비밀번호 재설정·이메일 소유 확인

## 미해결 사항
- 실제 Supabase 첫 실행에서 확인할 것: `postgres` 역할의 `set local role authenticated` 허용 여부, Auth 관리자 API 오류 코드 처리, `proxy.ts` 세션 쿠키 갱신 (`docs/LIMITATIONS.md`)
- Vercel Cron 실제 실행, Claude API 실제 호출은 아직 확인하지 않음
- PWA 오프라인 지원(서비스워커) 미구현 — 본격 개발 때 추가 예정
- 비밀번호 재설정, 이메일 소유 확인 없음
