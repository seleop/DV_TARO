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
4. `supabase/migrations/` 의 나머지 파일도 **파일 이름 순서대로** 같은 방법으로 실행한다. 이미 운영 중인 DB에는 새로 추가된 파일만 실행한다.
   - `20261023231500_privacy_consent.sql`: 가입 시 개인정보 동의 기록 칸(`profiles.privacy_agreed_at`, `privacy_version`). **이 파일을 실행하지 않고 새 코드를 배포하면 회원가입이 실패한다** → 배포(push) 전에 먼저 실행

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

| 이름 | 값 | Type |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 4단계 | **Config** |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 4단계 | **Config** |
| `SUPABASE_SECRET_KEY` | 4단계 | Secret |
| `DATABASE_URL` | 4단계 (6543 포트) | Secret |
| `DATA_ENCRYPTION_KEY` | 4단계에서 만든 값 | Secret |
| `CRON_SECRET` | 4단계에서 만든 값 | Secret |
| `ADMIN_EMAILS` | 관리자로 쓸 내 이메일 (예: `me@gmail.com`) | Secret |
| `SIGNUP_MODE` | `open` (모두 가입한 뒤 `closed`로 바꾼다) | Config 또는 Secret |
| `AI_PROVIDER` | 지금은 `mock` (Claude 키가 생기면 `anthropic` + `ANTHROPIC_API_KEY`) | Config 또는 Secret |
| `ANTHROPIC_API_KEY` | (선택) Claude 키 — 타로·별자리 풀이용 | Secret |
| `HRUM_API_KEY` | (선택) 흐름(HRUM) 키 — 사주 계산·사주·오늘의 운세 풀이 (8단계) | Secret |

> **Type 주의**: `NEXT_PUBLIC_`로 시작하는 두 값은 브라우저에 공개되는 값이라 반드시 **Type=Config**로 만든다. Secret으로 저장하면 Vercel이 "공개 접두사" 경고를 띄우고 회원가입이 "계정을 만들지 못했습니다"로 실패한다 (2026-10-23 실제 운영에서 확인된 원인). 이미 Secret으로 만들었다면 **삭제 → Type=Config로 다시 추가 → Redeploy**. 나머지 값(`SUPABASE_SECRET_KEY`, `DATABASE_URL`, `DATA_ENCRYPTION_KEY`, `CRON_SECRET`, `ANTHROPIC_API_KEY` 등)은 Secret으로 둔다.

`LOCAL_DEV_MODE`는 **넣지 않는다** (켜져 있으면 서버가 시작을 거부한다).

4. **Deploy** → 1~3분 뒤 `https://<프로젝트>.vercel.app` 주소가 생긴다. 현재 운영 주소는 **https://dvtarocard.vercel.app** (프로젝트 `dvtarocard`). `dvtarocard-<해시>-...vercel.app` 형태는 배포마다 바뀌는 주소라 공유용이 아니다.

> `NEXT_PUBLIC_`로 시작하는 값은 빌드할 때 코드에 들어간다. 이 값을 바꾸면 **Deployments → … → Redeploy**를 해야 반영된다. 다른 환경변수도 바꾼 뒤에는 재배포하는 것이 안전하다.

## 6단계. 접속 확인 (PC → Android → iOS)

| 순서 | 확인할 것 |
|---|---|
| 1 | PC 브라우저로 주소 접속 → 로그인 화면(`/login`)이 뜬다 |
| 2 | **회원가입**(`/signup`, 로그인 화면의 "회원가입" 링크): `ADMIN_EMAILS`에 넣은 이메일, 비밀번호, 비밀번호 확인, 닉네임, [필수] 개인정보 동의 → 가입 후 "시작하기"(생년월일 입력) 화면으로 이동. 생년월일을 넣기 전에는 MY·프로필·관리자 외 화면으로 가도 이 화면으로 돌아온다 |
| 3 | 프로필에서 생년월일·시각 저장 → 오늘의 운세가 나온다 (AI는 모의 응답) |
| 4 | MY 화면에 **관리자 화면** 메뉴가 보인다 |
| 5 | **Android Chrome**: 같은 주소 접속 → 다른 계정으로 가입·로그인, 사주·타로·별자리 화면 확인 |
| 6 | **iOS Safari**: 같은 주소 접속 → 로그인, 하단 버튼이 홈 인디케이터에 가리지 않는지 확인 |
| 7 | (선택) 홈 화면 설치 — Android: 메뉴 ⋮ → **홈 화면에 추가 / 앱 설치**, iOS: 공유 버튼 → **홈 화면에 추가** |

## 7단계. 운영 시작 후

- 가입 링크는 `https://dvtarocard.vercel.app/signup` 을 그대로 공유하면 된다.
- 모두 가입했으면 `SIGNUP_MODE=closed`로 바꾸고 재배포 → 새 가입이 막힌다 (Vercel은 환경변수 변경을 새 배포부터 적용한다. 빌드를 다시 할 필요는 없어 Redeploy만 하면 된다).
- 초대 코드 방식이 필요하면 `SIGNUP_MODE=invite` → 관리 화면 "사용자·초대"에서 코드를 만들어 전달한다 (또는 `npm run invite`).
- Vercel Cron(`vercel.json`, 매일 03:00 KST)이 보존 기간 지난 사용량 로그·초대·감사 로그를 지운다.
- 흐름 연결: 아래 8단계. Claude 연결(타로·별자리): 9단계.

## 8단계. 흐름(HRUM) 연결 — 사주 계산과 사주·오늘의 운세 풀이

2026-10-27부터 사주 원국 계산과 사주·오늘의 운세 풀이는 흐름(플로트 주식회사) API가 맡는다. 키를 넣기 전에는 앱 내장 엔진 + 모의 응답으로 동작한다. 흐름 전송을 알린 개인정보 고지에 다시 동의한 사용자만 흐름을 쓴다(기존 가입자는 다음 접속 때 동의 화면이 나온다).

1. https://console.hrum.ai 가입 → **크레딧 충전**(선불, 부가세 10% 별도. 가입 무료 크레딧이 있을 수 있음)
   - 성공: 콘솔에 잔액이 보인다. 요금표 금액이 비어 있으면 콘솔에서 상품별 금액을 확인해 캡처로 공유
2. 콘솔에서 **API 키 발급** → 키는 발급 직후 **한 번만** 보인다. 바로 복사
3. Vercel → **dvtarocard** → Settings → Environment Variables → `HRUM_API_KEY` = 키, **Secret**, **Production만** → Deployments → … → **Redeploy**
4. 확인: 사이트에서 동의 화면(처음 한 번) → 사주 → 내 사주 → "풀이 듣기"(장마다 질문해 20~40초) → 오늘의 운세. MY → 관리자 화면 → 사용량·비용에 `hrum`이 보인다. 흐름 콘솔 사용 기록에도 같은 시각 호출이 잡힌다
5. 비용(문서 기준, 부가세 포함): 원국 계산 ₩55(같은 입력은 저장해 다시 쓰고, 보정을 켜면 2회), 오늘의 운세 ₩11 + 분야별 풀이 3건, 사주 풀이는 장별 8건(토큰 과금, 건당 수 원~수십 원 추정). 앱 월 예산(`BUDGET_MONTHLY_USD`)에는 `HRUM_KRW_PER_USD`(기본 1400) 환율로 들어간다
6. 문제: 흐름이 응답하지 않거나 잔액이 없으면 **원국은 앱 내장 엔진으로 계속 계산**되고, 풀이는 "풀이 서비스 잔액이 부족합니다"·"풀이 서비스 오류" 안내가 나온다. Vercel **Logs**에서 `[hrum` 검색(오류 종류·상태 코드만 남음)

## 9단계. Claude(AI) 연결 — 타로·별자리 풀이

사주·오늘의 운세는 8단계 흐름이 맡으므로, Claude는 타로·별자리 풀이에만 쓴다. 지금은 `AI_PROVIDER=mock`이라 타로·별자리 풀이가 "모의 응답"으로 나온다. 아래를 마치면 실제 Claude(기본 모델 Claude Opus 5.5)로 만들어진다. 단계마다 "성공 화면"을 확인하고, 막히면 그 화면을 캡처해 공유한다 (키는 앞부분 `sk-ant-`만 보이게 가린다).

### 9-1. Claude Console 가입·결제

1. https://platform.claude.com 접속 → 가입 또는 로그인
2. **Billing** 화면(https://platform.claude.com/settings/billing)에서 결제 수단 등록·크레딧 충전
   - 성공: Billing 화면에 잔액(크레딧)이 보인다
3. 같은 Billing 화면 **Spend limits** → **Set limit**(이미 있으면 **Adjust limit**) → 월 상한 입력 (예: 30달러)
   - 앱 안에도 월 예산 상한(`BUDGET_MONTHLY_USD`, 기본 20달러)이 따로 있다. 콘솔 상한은 앱 계산이 틀려도 막아 주는 두 번째 안전장치다
   - 상한에 닿으면 그달 남은 기간 동안 풀이가 실패한다 (화면에 "AI 서비스 오류")

### 9-2. API 키 만들기

1. **API keys** 화면(https://platform.claude.com/settings/keys) → **Create key**
2. 이름: `dvtarocard-production` / Expiration: 가장 긴 기간(만료일을 달력에 적어 두고 그 전에 새 키로 바꾼다) / Linked account: 본인
3. **Workspace를 꼭 고른다** (보통 `Default`). 워크스페이스를 고르지 않은 키는 요청마다 추가 정보가 필요해 이 앱에서는 인증 오류가 난다
4. 만들면 `sk-ant-`로 시작하는 키가 **한 번만** 보인다 → 바로 복사해 둔다 (잃어버리면 새로 만든다)
   - 성공: API keys 목록에 `dvtarocard-production`이 보인다

### 9-3. Vercel에 넣기

Vercel 대시보드 → 프로젝트 **dvtarocard** → **Settings → Environment Variables**

| 이름 | 값 | Type | 환경 |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | 9-2에서 복사한 키 | **Secret** | **Production만** (Preview에도 넣으면 미리보기 배포에서도 비용이 나간다) |
| `AI_PROVIDER` | `anthropic` (이미 `mock`으로 있으면 **Edit**로 값만 바꾼다) | Config 또는 Secret | Production |
| `BUDGET_MONTHLY_USD` | 앱의 월 예산 상한(달러). 없으면 기본 20 | Config 또는 Secret | Production |

- `AI_MODEL`은 넣지 않는다 (기본 `claude-opus-5-5`). 다른 모델로 바꿀 때만 넣는다
- 성공: 목록에 세 값이 보이고 `ANTHROPIC_API_KEY` 값은 가려져 있다

그다음 **Deployments** → 맨 위(Production) 배포의 **…** → **Redeploy** → 1~3분 뒤 **Ready**

### 9-4. 확인

1. https://dvtarocard.vercel.app 로그인 → 타로 → 질문하고 카드 뽑기. 성공: "모의 응답" 안내가 없다
2. 별자리: 별자리를 고르면 오늘의 별자리 운세가 나온다. 성공: "모의 응답" 안내가 없다
3. MY → **관리자 화면** → 사용량·비용: 방금 호출이 `anthropic`, 추정 비용과 함께 보인다
4. Claude Console → **Usage**에서도 같은 시각에 사용량이 잡힌다

### 비용 (추정, 실제 값은 연결 후 관리자 화면에서 확인)

Claude Opus 5.5 단가: 입력 100만 토큰당 4달러, 출력 100만 토큰당 20달러 (사고 과정도 출력으로 계산). 타로는 뽑을 때마다, 별자리는 사람·별자리마다 하루 1번(같은 날은 저장된 결과). 사주·오늘의 운세 비용은 8단계(흐름). 앱 월 예산(`BUDGET_MONTHLY_USD`)은 흐름·Claude 비용을 합쳐 본다. 사용자별 하루 호출 한도는 `LIMIT_AI_PER_USER_PER_DAY`(기본 20회).

### 문제가 생기면

| 화면 | 원인 | 조치 |
|---|---|---|
| "AI 서비스 인증 설정에 문제가 있습니다" | 키 오타, 워크스페이스를 고르지 않은 키, 삭제·만료된 키 | 9-2를 다시 해 새 키로 바꾸고 Redeploy |
| "AI 서비스 호출 한도에 걸렸습니다" | 분당 호출 한도 | 잠시 뒤 다시 시도 |
| "AI 서비스 오류가 발생했습니다" | 콘솔 월 상한 도달, 잔액 부족, 일시 장애 | Billing 잔액·Spend limits 확인. Vercel **Logs**에서 `[ai anthropic]` 검색(오류 종류·상태 코드만 남김) |
| "이번 달 서비스 전체 AI 예산을 모두 사용했습니다" | 앱 월 예산(`BUDGET_MONTHLY_USD`) 도달 | 값 올리고 Redeploy |
| "AI 응답 형식이 올바르지 않습니다" | 응답이 길이 제한에 잘림 등 | 다시 시도. 반복되면 Logs의 `[ai anthropic] 응답 해석 실패` 를 개발 세션에 전달 |
| 여전히 "모의 응답" | `AI_PROVIDER`가 `anthropic`이 아니거나 Redeploy 전 | 값 확인 후 Redeploy |

## 문제 해결

| 증상 | 확인 | 조치 |
|---|---|---|
| 빌드 실패 "LOCAL_DEV_MODE는 개발 환경에서만" | Vercel 환경변수 | `LOCAL_DEV_MODE` 삭제 후 재배포 |
| 회원가입 시 "계정을 만들지 못했습니다" | Vercel → 프로젝트 → **Logs**에서 `[auth-admin createUser]`, `[signup createUser]` 검색 (Supabase 오류 status·code·message가 남음), Supabase → Auth Logs | `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL` 값 확인. **확인된 원인**: `NEXT_PUBLIC_` 두 값이 Type=Secret → 아래 항목대로 조치 |
| Vercel 환경변수에 "공개 접두사(NEXT_PUBLIC_)" 경고 | Settings → Environment Variables에서 `NEXT_PUBLIC_` 값의 Type | 해당 변수 삭제 → **Type=Config**로 다시 추가 → Deployments → … → **Redeploy** |
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
