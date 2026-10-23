# DV_TARO

## 프로젝트 개요
- 형태: 모바일 웹앱 (PWA — 홈 화면 설치. 오프라인 지원은 예정)
- 기술 스택: Next.js 16 (App Router, React) + TypeScript + Tailwind CSS 4
  - 서버 기능(AI 호출, 비밀 키, 사주 엔진 교차검증)이 필요해 React + Vite 대신 Next.js를 쓴다 (2026-10-23 사용자 결정)
- 로그인·데이터: Supabase (Auth + Postgres RLS) / 배포: Vercel
- 서비스 주소: https://dvtarocard.vercel.app (Vercel 프로젝트 `dvtarocard`, main push 시 자동 배포). `dvtarocard-<해시>-...vercel.app`은 배포마다 바뀌는 주소라 공유하지 않는다.
- 진행 내역·미해결 사항: [HANDOFF.md](HANDOFF.md) 참고
- 배포 절차: [docs/OPERATIONS.md](docs/OPERATIONS.md)

## 지침
- 모든 답변은 한국어로 통일한다.
- 모든 작업 중 궁금한 부분이나 질문이 필요한 부분이 있으면 적극적으로 질문한다.
- 안드로이드와 iOS 모두 문제없이 구동이 되어야 한다.
- 모든 DOM과 UX/UI는 모바일 이용자 기준으로 개발한다.
- Next.js 16은 이전 버전과 API가 다르다. 코드를 쓰기 전에 `node_modules/next/dist/docs/`의 해당 문서를 확인한다 ([AGENTS.md](AGENTS.md)).
- 테스트(`npm test`)·타입 체크(`npm run typecheck`)·린트(`npx eslint .`)를 통과한 뒤 커밋한다. 실패한 테스트를 숨기지 않는다.
  - `npm run typecheck`는 `next typegen && tsc --noEmit`이다. 새 체크아웃에서 `tsc`만 돌리면 PageProps 등 `.next` 타입이 없어 실패한다.
- DB 스키마 변경은 `supabase/migrations/`에 새 파일로 추가한다 (첫 배포 이후 기존 파일 수정 금지).
- `npm audit fix --force`는 하지 않는다 (high 경고는 eslint-config-next 하위 개발 의존성으로 배포물과 무관).

## Git 작업 흐름
- 세션은 보통 `.claude/worktrees/<이름>` 작업 트리의 `claude/<이름>` 브랜치에서 작업한다. 시작 전 `git fetch origin`으로 최신 `origin/main`을 기준 삼는다.
- 커밋 메시지는 한국어로 쓰고 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`를 붙인다.
- 비밀값(`.env.local`, API 키, DB 비밀번호 등)은 절대 커밋하지 않는다.
- push는 사용자가 요청할 때만 한다. "main에 머지해서 push" 요청 시:
  1. `git fetch origin`
  2. `git merge-base --is-ancestor origin/main HEAD`로 fast-forward 가능한지 확인 (불가하면 먼저 origin/main을 병합하고 다시 검증)
  3. `git push origin HEAD:main`
- 원래 체크아웃(`C:\Users\seleo\Documents\DV_TARO`)의 로컬 main은 자동으로 갱신되지 않으므로 필요하면 그곳에서 `git pull`을 안내한다.
