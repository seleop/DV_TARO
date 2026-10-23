# DV_TARO — 운세 노트

사내·지인 20~30명이 쓰는 사주·오늘의 운세·타로·별자리 모바일 웹앱. Android·iOS·PC 어디서든 웹 주소로 접속한다. 모바일 앱처럼 보이도록 만든 웹앱이다 (PC에서는 가운데 폰 폭 화면).
사주는 **여러 계산 엔진의 결과를 교차검증**한 뒤, 검증을 통과한 값만 AI가 자연어로 해석한다.

## 기능

- 회원가입(`/signup`: 이메일·비밀번호·비밀번호 확인·닉네임·개인정보 동의)·로그인(`/login`, 로그인 후 원래 화면으로 복귀) (Supabase Auth). 가입 방식은 `SIGNUP_MODE`(open/invite/closed). 가입 직후 생년월일 입력은 필수 단계
- 프로필 설정: 닉네임, 내 출생 정보(사주·오늘의 운세·별자리 기준)
- 홈 화면 설치(PWA manifest·아이콘)
- 홈: 대표 캐릭터 + 오늘 운세·사주·타로·별자리 바로가기
- 오늘의 운세: 대표 사주 기준 일진 풀이, 요약 3줄, 연애운·직업운·행운 기운·추천 음식, 이미지 저장·공유
- 사주(가족·친구 포함): 양력·음력·윤달, 출생 시간 미상, 자시 관법, 진태양시 보정, 원국·오행·십신·대운, 검증 상태와 엔진별 비교, AI 해석·재생성
- 타로(원 카드·쓰리 카드·선택, 카드 뒤집기 연출), 별자리(12궁 선택)
- MY: 기록 조회·삭제, 전체 기록 삭제, 계정 삭제
- 관리자: 초대·계정 관리, AI 호출량·추정 비용·예산, 엔진별 성공률·불일치율, 검증 실패 원인, 엔진 진단, 버전 정보

## 기술 스택

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Auth + Postgres/RLS) · Vercel · Zod 4 · Anthropic SDK · Vitest + PGlite

계산 엔진: [manseryeok](https://www.npmjs.com/package/manseryeok) (MIT) · [lunar-javascript](https://www.npmjs.com/package/lunar-javascript) (MIT) · [점봄 만세력 API](https://jeombom.kr/manse-api) (CC BY 4.0, 선택)

## 빠른 시작 (Supabase 없이 로컬 체험)

Node.js 22.13 이상(권장 24).

```bash
npm install
```

```bash
npm run setup
```

```bash
npm run dev
```

http://localhost:3000/signup 에서 `admin@example.test`로 가입하면 관리자가 된다(`.env.local`의 `ADMIN_EMAILS`). 로컬 체험 모드는 내장 Postgres(PGlite)와 간이 로그인을 쓰며, 마이그레이션·RLS는 운영과 같다.

## 운영 배포

GitHub → Supabase(프로젝트·마이그레이션·Auth 설정) → Vercel(환경변수·배포) → Android·iOS 접속 확인. 단계별 안내: [docs/OPERATIONS.md](docs/OPERATIONS.md)

## 대표 캐릭터 넣기

1. 배경이 투명한 PNG/WebP(정사각형 1024px 이상 권장)를 `public/character/`에 넣는다.
2. `src/config/brand.ts`의 `character.images.default`에 경로(예: `"/character/main.png"`)를 넣는다. 결과·로딩·타로·별자리 화면에 다른 포즈를 쓰려면 `happy`, `thinking`, `tarot`, `star`도 채운다.
3. 캐릭터 이름(`characterName`)을 바꾸면 "○○가 ○○님의 운세를 점쳐봤대요" 문구에 반영된다 (조사 자동 처리).

## 테스트

```bash
npm test
```

단위·통합 테스트. PGlite(인메모리 Postgres)에서 **실제 마이그레이션 SQL과 RLS 정책**을 실행해 검증하고, 외부 API는 기록된 실제 응답 픽스처로 모의한다.

```bash
npm run test:live
```

점봄 API 실제 호출 테스트(네트워크 필요).

## 문서

- [docs/OPERATIONS.md](docs/OPERATIONS.md) — Supabase·Vercel 설정, 첫 관리자, 정기 작업, 장애 대응
- [docs/DATA_POLICY.md](docs/DATA_POLICY.md) — 암호화, RLS, 보존 기간, 삭제 범위
- [docs/VERIFICATION.md](docs/VERIFICATION.md) — 교차검증 판정 규칙
- [docs/ENGINE_RESEARCH.md](docs/ENGINE_RESEARCH.md) — 엔진 후보 조사와 실측 결과
- [docs/LIMITATIONS.md](docs/LIMITATIONS.md) — 알려진 한계와 미완료 항목

## 폴더 구조

```
src/
  app/(app)/          로그인 후 화면 (홈, 오늘, 사주, 타로, 별자리, MY·프로필, 관리)
  app/login/, signup/ 로그인·가입 (components/auth/)
  app/api/            API 라우트 (인증·출처·본문 크기 검사는 lib/api.ts)
  components/         화면 컴포넌트 (Character, ShareBar, ui …)
  config/brand.ts     앱 이름·대표 캐릭터 설정
  lib/saju/           입력 검증, 시각 정규화, 엔진 어댑터, 음력 검증, 교차검증
  lib/ai/             출력 스키마, 프롬프트, 공급자(Claude/모의), 비용, 해석 생성
  lib/repo/           DB 접근 (사용자 데이터는 RLS 적용 트랜잭션)
  lib/supabase/       Supabase 인증 클라이언트·관리자 API
  lib/local-dev/      로컬 체험 모드 (PGlite, 간이 로그인)
  proxy.ts            Supabase 세션 쿠키 갱신
supabase/migrations/  DB 스키마·RLS
scripts/              setup, invite
tests/                단위·통합·RLS 테스트, live/ 실연동 테스트
```

운세는 오락과 자기 성찰을 위한 참고 정보이며, 건강·법률·투자 판단을 대신하지 않는다.
