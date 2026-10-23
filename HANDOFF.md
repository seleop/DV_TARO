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
- **로그인·회원가입 개선 완료(2026-10-23 main 반영)**: 브랜치 `claude/youthful-shamir-aa9bf7`
  - `/login`·`/signup` 분리(요청 시점 렌더링, `SIGNUP_MODE`만 읽음 → 환경변수 없이도 빌드 통과). 화면은 `src/components/auth/*`
  - 로그인 필요 시 `/login?next=<경로>` → 로그인 후 복귀 (`lib/auth/next-path.ts`, 같은 사이트 경로만). 경로는 `proxy.ts`가 `x-dv-path` 요청 헤더로 넘김
  - 비밀번호 보기/숨기기, Caps Lock 경고, 엔터로 다음 칸, 실시간·칸별 오류(서버 issues/오류 코드 매핑), 중복 제출 방지, 320px 대응, 로그아웃 확인
  - 가입 시 [필수] 개인정보 수집·이용 동의(`src/config/privacy.ts`) → `profiles.privacy_agreed_at`·`privacy_version` 기록 (마이그레이션 `20261023231500_privacy_consent.sql` — **운영 Supabase 적용 완료 2026-10-23**, 사용자가 SQL Editor에서 실행)
  - 생년월일 필수: 내 사주가 없으면 MY·프로필·관리자 외 화면에서 `/me/profile?required=1`로 이동(`requirePageUser`). 가입 직후 `/me/profile?welcome=1` 환영 문구
  - 비밀번호 재설정은 사용자 결정으로 제외(로그인 화면에 "운영자에게 문의" 안내)
- **배포 완료**: https://dvtarocard.vercel.app (Vercel 프로젝트 `dvtarocard`). Supabase 프로젝트 URL `https://umkqgreogwujvsrjngqv.supabase.co` (공개 값)
- **해결됨**: 회원가입 "계정을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." 오류
  - 원인: Vercel 환경변수 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`가 Type=Secret으로 저장돼 있었음 (Vercel이 공개 접두사 경고 표시)
  - 조치: 두 값을 지우고 Type=Config로 다시 만든 뒤 Redeploy → 가입·로그인 정상 동작을 사용자가 확인 (`docs/OPERATIONS.md` 5단계·문제 해결)
  - e6c86a6: 가입 실패 시 Supabase 오류 status/code/message를 서버 로그에 남김 → 재발 시 Vercel Logs에서 `[auth-admin createUser]`, `[signup createUser]` 검색
- 1ea80a2: `npm run typecheck` = `next typegen && tsc --noEmit` (새 체크아웃에서 `.next` 타입 누락 해결)
- `npm audit` high 5건은 eslint-config-next 하위 개발 의존성(micromatch/fast-glob)이라 배포물과 무관. `audit fix --force`는 하지 않음

## 다음 단계
**1차 완성 기준** (2026-10-23 사용자 결정): 아래 1 + 로그인·회원가입 UI 개선(`claude/youthful-shamir-aa9bf7`)과 대표 캐릭터 반영(`claude/lucid-solomon-5113d2`)이 main에 들어간 시점. 그전까지는 원래 폴더에서 main 직접 작업 허용 (CLAUDE.md "병렬 작업" 예외). 사용자가 1차 완성을 확인하면 CLAUDE.md에서 예외를 지운다.

0. 로그인·회원가입 개선 배포 후 확인: https://dvtarocard.vercel.app/signup 가입(동의 체크)·생년월일 입력 이동·`/login?next=` 복귀
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
- 생년월일 필수 이동은 페이지의 `requirePageUser`와 `(app)/layout`에서 검사한다. `tarot/page.tsx`는 클라이언트 컴포넌트라 MY에서 하단 탭으로 타로에 들어가는 클라이언트 이동은 막지 못함(새로고침·직접 접속은 막힘)
- 배경 별 효과(`globals.css`의 `.stars::after` 애니메이션)가 루트 컨테이너 폭을 넘겨(375px 화면에서 scrollWidth 570) 프로그램으로 스크롤하면 화면이 가로로 밀릴 수 있음. 손가락 조작에서는 재현 안 됨. globals.css 담당 세션에서 `overflow-x: clip` 등 검토
