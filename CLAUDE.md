# DV_TARO

## 프로젝트 개요
- 형태: 모바일 웹앱 (PWA — 홈 화면 설치. 오프라인 지원은 예정)
- 기술 스택: Next.js 16 (App Router, React) + TypeScript + Tailwind CSS 4
  - 서버 기능(AI 호출, 비밀 키, 사주 엔진 교차검증)이 필요해 React + Vite 대신 Next.js를 쓴다 (2026-10-23 사용자 결정)
- 로그인·데이터: Supabase (Auth + Postgres RLS) / 배포: Vercel
- 진행 내역·미해결 사항: [HANDOFF.md](HANDOFF.md) 참고
- 배포 절차: [docs/OPERATIONS.md](docs/OPERATIONS.md)

## 지침
- 모든 답변은 한국어로 통일한다.
- 모든 작업 중 궁금한 부분이나 질문이 필요한 부분이 있으면 적극적으로 질문한다.
- 안드로이드와 iOS 모두 문제없이 구동이 되어야 한다.
- 모든 DOM과 UX/UI는 모바일 이용자 기준으로 개발한다.
- Next.js 16은 이전 버전과 API가 다르다. 코드를 쓰기 전에 `node_modules/next/dist/docs/`의 해당 문서를 확인한다 ([AGENTS.md](AGENTS.md)).
- 테스트(`npm test`)·타입 체크(`npm run typecheck`)·린트(`npx eslint .`)를 통과한 뒤 커밋한다. 실패한 테스트를 숨기지 않는다.
- DB 스키마 변경은 `supabase/migrations/`에 새 파일로 추가한다 (첫 배포 이후 기존 파일 수정 금지).
