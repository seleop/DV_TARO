# DV_TARO 작업 인계 (2026-10-23 갱신)

다른 세션에서 이어서 작업할 때 참고하는 진행 내역 요약입니다.

## 기본 정보
- 원격 저장소: https://github.com/seleop/DV_TARO.git (`origin`, 브랜치 `main`)
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

## 다음 단계
1. `docs/OPERATIONS.md` 순서대로 Supabase 프로젝트 생성 → 마이그레이션 → Vercel 배포
2. PC·Android·iOS에서 웹 주소 접속·가입·로그인 확인 (확인되면 본격 개발 시작)
3. 대표 캐릭터 이미지 받기 → `public/character/` + `src/config/brand.ts`
4. Claude API 키 연결 (`AI_PROVIDER=anthropic`)

## 미해결 사항
- 실제 Supabase·Vercel·Claude API 연동은 아직 확인하지 않음 (`docs/LIMITATIONS.md`)
- PWA 오프라인 지원(서비스워커) 미구현 — 본격 개발 때 추가 예정
- 비밀번호 재설정, 이메일 소유 확인 없음
