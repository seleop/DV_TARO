# 배포·운영 가이드 (GitHub → Supabase → Vercel)

목표: `https://<프로젝트>.vercel.app` 주소 하나로 Android·iOS·PC 어디서든 접속해 **이메일·비밀번호로 가입·로그인**하고, 프로필 설정에서 생년월일을 넣어 운세를 보는 상태까지 만든다.

```
GitHub(seleop/DV_TARO) ──자동 배포──▶ Vercel(앱 서버) ──▶ Supabase(Auth + Postgres)
                                          └──▶ 점봄 API(선택), Claude API(선택)
```

## 0. 준비물

| 항목 | 비고 |
|---|---|
| GitHub 저장소 | https://github.com/seleop/DV_TARO (main에 앱 코드가 올라가 있음) |
| Supabase 계정 | https://supabase.com (무료 플랜으로 시작 가능) |
| Vercel 계정 | https://vercel.com — GitHub 계정으로 가입하면 저장소 연결이 쉽다 |
| (선택) Anthropic API 키 | 없으면 AI 해석은 "모의 응답"으로 나온다. 접속 확인 단계에서는 없어도 된다 |

## 1단계. Supabase 프로젝트 만들기

1. Supabase 대시보드 → **New project**
2. 이름(예: `dv-taro`), **Database Password**(따로 안전하게 보관), Region은 **Northeast Asia (Seoul)** 권장
3. 생성이 끝날 때까지 1~2분 기다린다.

## 2단계. 데이터베이스 만들기 (마이그레이션)

1. 왼쪽 메뉴 **SQL Editor** → New query
2. 저장소의 `supabase/migrations/20261023000000_init.sql` 내용을 전부 붙여 넣고 **Run**
3. **Table Editor**에서 `profiles`, `invitations`, `saju_calculations`, `saju_engine_results`, `fortune_readings`, `usage_logs`, `admin_audit` 7개 테이블이 보이면 성공

## 3단계. 로그인(Auth) 설정

**Authentication → Sign In / Providers** (메뉴 이름은 대시보드 개편에 따라 조금 다를 수 있다)

| 설정 | 값 | 이유 |
|---|---|---|
| Email 공급자 | 켬 | 이메일·비밀번호 로그인 |
| **Allow new users to sign up** | **끔** | 브라우저에서 Supabase로 직접 가입하는 길을 막는다. 앱 서버가 secret key로 계정을 만들기 때문에 앱 회원가입은 정상 동작한다 |
| Confirm email | 상관없음 | 앱 서버가 계정을 "이메일 확인됨" 상태로 만든다 (확인 메일을 보내지 않음) |
| 최소 비밀번호 길이 | 8 이하 | 앱은 8자 이상을 요구한다 |

## 4단계. 키와 연결 문자열 복사

| 가져올 값 | 위치 | 환경변수 이름 |
|---|---|---|
| Project URL | Project Settings → API (또는 Data API) | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable key (`sb_publishable_...`) | Project Settings → API Keys | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Secret key (`sb_secret_...`) | Project Settings → API Keys | `SUPABASE_SECRET_KEY` (**절대 공개 금지**) |
| Transaction pooler 연결 문자열 (포트 **6543**) | 상단 **Connect** → Transaction pooler | `DATABASE_URL` (`[YOUR-PASSWORD]`를 1단계 비밀번호로 바꿈) |

비밀값 두 개를 만든다 (PC 터미널에서 각각 실행):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

→ `DATA_ENCRYPTION_KEY` (출생 정보 암호화 키. **잃어버리면 저장된 데이터를 못 읽는다** — 비밀번호 관리자 등에 보관)

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

→ `CRON_SECRET` (매일 데이터 정리 작업 인증용)

## 5단계. Vercel에 배포

1. Vercel 대시보드 → **Add New… → Project** → GitHub의 **DV_TARO** 저장소 **Import**
2. Framework Preset: **Next.js** (자동 인식), Root Directory: 기본값(`./`), Build/Install 명령: 기본값
3. **Environment Variables**에 아래를 입력 (Production·Preview 모두 체크)

| 이름 | 값 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 4단계 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 4단계 |
| `SUPABASE_SECRET_KEY` | 4단계 |
| `DATABASE_URL` | 4단계 (6543 포트) |
| `DATA_ENCRYPTION_KEY` | 4단계에서 만든 값 |
| `CRON_SECRET` | 4단계에서 만든 값 |
| `ADMIN_EMAILS` | 관리자로 쓸 내 이메일 (예: `me@gmail.com`) |
| `SIGNUP_MODE` | `open` (모두 가입한 뒤 `closed`로 바꾼다) |
| `AI_PROVIDER` | 지금은 `mock` (Claude 키가 생기면 `anthropic` + `ANTHROPIC_API_KEY`) |

`LOCAL_DEV_MODE`는 **넣지 않는다** (켜져 있으면 서버가 시작을 거부한다).

4. **Deploy** → 1~3분 뒤 `https://<프로젝트>.vercel.app` 주소가 생긴다.

> `NEXT_PUBLIC_`로 시작하는 값은 빌드할 때 코드에 들어간다. 이 값을 바꾸면 **Deployments → … → Redeploy**를 해야 반영된다. 다른 환경변수도 바꾼 뒤에는 재배포하는 것이 안전하다.

## 6단계. 접속 확인 (PC → Android → iOS)

| 순서 | 확인할 것 |
|---|---|
| 1 | PC 브라우저로 주소 접속 → 로그인 화면이 뜬다 |
| 2 | **회원가입**: `ADMIN_EMAILS`에 넣은 이메일, 비밀번호, 비밀번호 확인, 닉네임 → 가입 후 프로필 설정 화면으로 이동 |
| 3 | 프로필에서 생년월일·시각 저장 → 오늘의 운세가 나온다 (AI는 모의 응답) |
| 4 | MY 화면에 **관리자 화면** 메뉴가 보인다 |
| 5 | **Android Chrome**: 같은 주소 접속 → 다른 계정으로 가입·로그인, 사주·타로·별자리 화면 확인 |
| 6 | **iOS Safari**: 같은 주소 접속 → 로그인, 하단 버튼이 홈 인디케이터에 가리지 않는지 확인 |
| 7 | (선택) 홈 화면 설치 — Android: 메뉴 ⋮ → **홈 화면에 추가 / 앱 설치**, iOS: 공유 버튼 → **홈 화면에 추가** |

## 7단계. 운영 시작 후

- 모두 가입했으면 `SIGNUP_MODE=closed`로 바꾸고 재배포 → 새 가입이 막힌다.
- 초대 코드 방식이 필요하면 `SIGNUP_MODE=invite` → 관리 화면 "사용자·초대"에서 코드를 만들어 전달한다 (또는 `npm run invite`).
- Vercel Cron(`vercel.json`, 매일 03:00 KST)이 보존 기간 지난 사용량 로그·초대·감사 로그를 지운다.
- Claude 연결: `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY` 추가 후 재배포. 관리 화면 "사용량·비용"에서 토큰·추정 비용 확인. 월 예산 상한은 `BUDGET_MONTHLY_USD`.

## 문제 해결

| 증상 | 확인 | 조치 |
|---|---|---|
| 빌드 실패 "LOCAL_DEV_MODE는 개발 환경에서만" | Vercel 환경변수 | `LOCAL_DEV_MODE` 삭제 후 재배포 |
| 회원가입 시 "계정을 만들지 못했습니다" | Vercel → Logs, Supabase → Auth Logs | `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL` 확인 |
| "사용할 수 없는 이메일 주소예요" | Supabase가 테스트용 도메인(example.com 등)을 거부 | 실제 이메일 주소 사용 |
| 가입 직후 다시 로그인 화면 | `profiles` 테이블에 행이 생겼는지 | 2단계 마이그레이션 실행 여부, `DATABASE_URL` 확인 |
| 500 + "DATABASE_URL" | 환경변수 | transaction pooler(6543) 문자열·비밀번호 확인 |
| AI 해석이 중간에 끊김 | Vercel 함수 실행 시간 | 플랜의 최대 실행 시간 확인 (AI 라우트는 120초로 설정됨) |
| 서버 500 | Vercel Logs의 `[api-error 참조ID]` | 화면에 나온 참조 ID로 검색 |

## 로컬 개발

```bash
npm install
```

```bash
npm run setup
```

```bash
npm run dev
```

`npm run setup`은 **로컬 체험 모드**(`LOCAL_DEV_MODE=true`)로 `.env.local`을 만든다. Supabase 없이 내장 Postgres(PGlite, `./.local-db`)와 간이 로그인으로 돌아가며, `admin@example.test`로 가입하면 관리자가 된다. 마이그레이션·RLS는 운영과 같은 SQL이다. 로컬에서 실제 Supabase에 붙이려면 `LOCAL_DEV_MODE=false`로 바꾸고 Supabase 값을 채운다.

## 버전 변경 시

- 계산 엔진 업데이트: `npm i manseryeok@x.y.z` → `npm test`. 엔진 버전이 캐시 키에 들어가 기존 결과와 자동 분리된다.
- 판정 규칙 변경: `VERIFY_RULES_VERSION` 올리기 / 프롬프트 변경: `PROMPT_VERSIONS` 올리기
- DB 변경: `supabase/migrations/`에 **새 파일**을 추가하고 Supabase SQL Editor에서 그 파일만 실행 (기존 파일 수정 금지 — 첫 배포 이후부터)
