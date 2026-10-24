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
- **진행 중**: 로그인·가입 세션/`claude/youthful-shamir-aa9bf7` — 독립 3D 우주 배경(은하수·별똥별 유람·3인칭 카메라) 컴포넌트. 회원가입은 건드리지 않음. 범위: 신규 `src/components/cosmos/**`, 신규 관리자 미리보기 `src/app/(app)/admin/cosmos/page.tsx`, `tests/cosmic-journey.test.ts`
- **회원가입 3D 우주 연출 완료(2026-10-24 main 반영)**: 브랜치 `claude/youthful-shamir-aa9bf7`. 패키지 `three`·`@react-three/fiber`·`@types/three` 추가(사용자 승인)
  - 가입 중에만 위쪽 무대가 별빛 정원 → 3D 우주로 전환(정원이 가라앉고 우주가 내려옴). 진입·로그인은 그대로. `AuthFlow.tsx`는 연결부만 수정
  - `src/components/auth/SignupCosmos.tsx`: 3D를 지연 로딩(`next/dynamic` ssr:false, 압축 약 245KB, 가입에 들어갈 때만). WebGL 미지원·동작 줄이기·그래픽 끊김(context lost)·오류·로딩 중에는 기존 SVG 별자리(`Constellation`)
  - `src/components/auth/cosmos/CosmosScene.tsx`: 셰이더 성운(보라·남색·자주), 반짝이는 별, 나선 은하, 단계별 별자리(켜질 때 빛 고리, 선이 그려짐), 별똥별, 손가락·마우스를 따라 기우는 카메라, 단계마다 카메라 상승, 완료 시 물러남. 해상도 배율 최대 1.5, 작은 화면·4코어 이하 기기는 입자 감소(`cosmos/layout.ts`, `tests/cosmos-layout.test.ts`), 가입 화면이 아니거나 탭이 숨겨지면 그리기 멈춤
  - 별이 원본 3D 모델은 재배포 불가 라이선스라 3D에 넣지 않고 기존처럼 그림(스프라이트)으로 겹침
  - 확인: 배포 빌드에서 375×812·360×600·키보드 높이(375×430) 화면, 단계 진행(별 점등·선·카메라 상승). 데스크톱 앱 브라우저 창이 숨겨져 있으면 그리기가 멈춰(0프레임) 3D 대신 SVG가 보임 — 앱 문제 아님. 실기기(iOS Safari·Android Chrome) 성능·발열·완료 연출은 아직 확인 안 함
- **마스코트 교체: 별이 (main 미반영, 2026-10-24)**: 복이 대신 BlenderKit 무료 모델 Aurora Fox(Rigged)를 "별이"로 앱 전체에 사용(사용자 결정). `scripts/mascot/build_fox.py`(네 발 동물 동작·모자+옆 소품 의상), 모델은 저장소 제외(`fetch_fox.mjs`로 받음), 텍스처의 눈 자국 자동 정리(`docs/MASCOT.md` 15절)
- **복이 소프트 2.5D·천막 배경 (main 반영, 2026-10-24)**: `claude/lucid-solomon-5113d2`. 복이를 소프트 2.5D(툰 셰이딩·직교 카메라)로 다시 렌더·시트 경량화(약 30%↓, 미리 불러오기는 디코딩 안 함). 우주 배경(`CosmicBackdrop`)을 지우고 장면 일러스트로: 홈·오늘의 운세=천막 입구, 사주 목록·타로=천막 안, 별자리·로그인/가입=별빛 정원, 나머지=크림색(`SceneArt`, `lib/scene.ts`). 테마 토큰을 밝은 크림색으로, 장면 위 글자는 `.scene-light/.scene-dark`. `Screen` 의 `scene` 으로 장면 + 시트 화면(`docs/MASCOT.md` 14절)
- **진입 화면·복이 연출·스크롤 없는 화면 완료(2026-10-24 main 반영)**: 브랜치 `claude/youthful-shamir-aa9bf7`
- **우주 배경·로그인 화면 다듬기(main 반영, 2026-10-24 — 이후 우주 배경은 장면 일러스트로 대체됨)**: 앱 전체 배경을 은하수(성운·반짝이는 별·십자 빛 별·SVG 별똥별)로 교체(`src/components/app/CosmicBackdrop.tsx`, 루트 `layout.tsx`의 `.stars` 대체). 진입 화면 복이 400px(작은 화면은 무대에 맞춤), 로그인 복이 약 500px(키보드가 올라와도 유지, 사용자 요청). 키보드는 줌인 연출(0.7초) 뒤 올라오고 화면 높이는 부드럽게 변함, iOS에서 자동으로 안 뜨면 입력칸이 반짝이며 눌러 달라고 안내
  - `/login` 진입 화면 = 작은 복이 + 로그인·회원가입 두 버튼(손 흔들기). 누르면 한 칸씩 순차 입력(`src/components/auth/AuthFlow.tsx`), 입력칸 하나를 재사용해 단계가 바뀌어도 키보드 유지
  - 로그인 = 복이 얼굴 줌인(384px 원본으로 그리고 배율), 가입 = 카메라가 밤하늘로 올라가며 단계마다 별이 이어지는 별자리(`Constellation.tsx`), 완료 시 celebrate. 단계마다 끄덕임, 오류 때 놀람
  - 화면 높이를 `visualViewport`에 맞춰 키보드가 올라와도 스크롤 없이 입력칸·버튼 표시(`useVisualViewport.ts`). `/signup` 링크는 바로 가입 입력으로
  - **앱 전체 스크롤 없는 화면**(사주 결과 `/saju/[id]`만 예외): `(app)/layout`을 화면 높이에 고정, 하단 탭바를 흐름 안에. 공통 틀 `src/components/app/Screen.tsx` — `Screen`(머리·본문·하단), `FitCharacter`/`FitSize`(남는 높이에 맞춘 복이), `Pager`(긴 내용을 장으로 좌우 넘김), `Paged`(카드 안 목록·표 ‹ 1/3 ›)
  - 적용: 홈, 오늘의 운세(요약·분야별·행운 3장), 타로(입력/요약·카드별·조언), 별자리(12칸 4열/요약·분야별·팁), 사주 목록(4개씩), 출생 정보 입력 3단계(사주 새로 보기·프로필 공용), 프로필, MY(탭+목록 장), 관리자(탭별 카드 장, 표 쪽 넘김, 가로 스크롤 표 제거), 캐릭터 갤러리
  - 루트 컨테이너(`src/app/layout.tsx`)가 배경 별 효과 때문에 세로로 스크롤되던 문제 → `overflow-hidden` + 지원 브라우저는 `overflow-clip`
  - 확인: 375×812·375×640·360×600에서 모든 화면 본문 넘침 없음, 키보드 높이(375×430)에서 로그인 입력 화면 확인. 실기기(iOS Safari·Android Chrome) 확인은 아직
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
- **대표 캐릭터 반영 (main 반영, `claude/lucid-solomon-5113d2`)**: 3D 마스코트 "복이"(가칭)가 기본 캐릭터 (`docs/MASCOT.md`)
  - Blender 5.2.3(포터블, `%LOCALAPPDATA%\Programs\Blender`)·FFmpeg(winget)로 `scripts/mascot/`에서 모델·idle/walk/happy/surprised 렌더 → `public/mascot/*.webp` 스프라이트 시트
  - `FortuneMascot`(스프라이트 재생·크로스페이드) + `CharacterStage`(말풍선·터치·대기 반응·장면/결과→동작). 동작 10종: 반복 idle·walk·think·happy, 한 번 wave·nod·surprised·reveal·celebrate·yawn (한 번 재생 동작은 휴식 자세로 시작·끝, `encode.mjs`가 이음새 검사)
  - 몸통·다리는 메타볼로 녹여 붙여 관절 주름 없음 (2026-10-24 사용자 요청 반영)
  - **의상 3종** (장면에 따라 자동, `resolveSheet`): 사주(갓·안경·사주책, read) · 타로(마법사 모자·망토·카드, draw) · 별자리(베레모·목도리·망원경, stargaze). 의상마다 idle·wave·nod·surprised + 대표 동작, 의상별 포스터. 시트 이름 `<의상>-<동작>`
  - 화질: 640px 렌더 → 좌우 여백 자르기 → 칸 318×512, WebP 90. 시트 260~710KB (`docs/MASCOT.md` 13절)
  - 동작 전환 시 이전 층은 불투명 유지·새 층만 페이드인 (끝날 때 흐려지던 문제 수정). 크기는 사용자 결정으로 그대로(`mascotZoom: 1`)
  - 오늘의 운세·별자리 AI 응답에 `mood`(great/good/calm/careful) 추가(이전 저장분 호환), 타로는 카드 방향으로 분위기 결정
  - SVG 별토끼(장면별 소품)는 대체용으로 유지: `src/config/brand.ts` `renderer: "svg"`. 관리자 화면 → "캐릭터"에서 갤러리 확인
  - 남은 일: Android·iOS 실기기 재생 확인(의상·화질 포함), 이름 확정, 동작 줄이기 화면 확인

## 다음 단계
**1차 완성 기준** (2026-10-23 사용자 결정): 아래 1 + 로그인·회원가입 UI 개선(`claude/youthful-shamir-aa9bf7`)과 대표 캐릭터 반영(`claude/lucid-solomon-5113d2`)이 main에 들어간 시점. 그전까지는 원래 폴더에서 main 직접 작업 허용 (CLAUDE.md "병렬 작업" 예외). 사용자가 1차 완성을 확인하면 CLAUDE.md에서 예외를 지운다.

0. 진입 화면·스크롤 없는 화면 push 후 실기기 확인(iOS 키보드가 올라올 때 입력칸·버튼 위치, 좌우 넘김 제스처, 복이 줌인 화질). 로그인·회원가입 개선 배포 후 확인: https://dvtarocard.vercel.app/signup 가입(동의 체크)·생년월일 입력 이동·`/login?next=` 복귀
1. Android·iOS에서 접속·가입·로그인 확인 (`docs/OPERATIONS.md` 6단계)
2. 본격 개발 범위 결정
   - 대표 캐릭터: 3D 마스코트 복이 반영됨 — 실기기 확인·추가 동작은 `docs/MASCOT.md` 11절
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
