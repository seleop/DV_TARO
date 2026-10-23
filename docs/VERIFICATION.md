# 교차검증 설계

코드: `src/lib/saju/` · 규칙 버전: `VERIFY_RULES_VERSION` (`src/lib/saju/verify.ts`)

## 흐름

```
입력 검증(Zod) ─► 음력 변환 검증 ─► 시각 정규화 ─► 엔진 병렬 실행 ─► 정규화·검증 ─► 교차검증 ─► (불일치 시 해소 절차) ─► 확정 원국
```

1. **음력 변환** (`lunar.ts`): KASI 정본(manseryeok)과 중국 음력(lunar-javascript) 변환을 비교한다.
   - 같음 → `VERIFIED`
   - 다름 → 점봄 API의 음력 입력 일주가 KASI 날짜의 일주와 같으면 `VERIFIED_BY_INDEPENDENT_SOURCE`, 아니면 `UNVERIFIED`
   - 윤달이면서 다름 → 점봄 윤달 결함 때문에 `UNVERIFIED`
   - 둘 다 변환 실패 → `INVALID_DATE` (입력 오류 400)
2. **시각 정규화** (`time.ts`): 기록된 현지 시각을 Intl(IANA tz)로 UTC로 바꾼다. 과거 UTC+8:30, 서머타임을 반영한다.
   - `termTime`: UTC+9 벽시계. 연·월주(절입)와 대운에 사용
   - `pillarTime`: 일·시주에 사용. 보정 없음이면 termTime과 같음. `lmt`=경도×4분, `tst`=경도+균시차(NOAA 근사식)
   - 모든 엔진에 같은 정규화 입력을 주고, 엔진 자체 보정은 끈다. 그래서 "같은 조건"에서 비교할 수 있다.
3. **시간 미상**: 하루의 시작(00:00)과 끝(23:59, 일·시주는 22:59)으로 두 번 계산해, 하루 안에서 바뀌는 기둥을 `ambiguousFields`로 표시한다.
4. **엔진 실행**: 각 엔진은 `calculate → normalize → validate`를 거친다. 실패는 오류 코드로 기록하고 다른 엔진은 계속 실행한다.

## 필드 판정 규칙

| 상태 | 조건 |
|---|---|
| `MATCH` | 비교 가능한 엔진 ≥ 2, 값이 모두 같음 |
| `MISMATCH` | 비교 가능한 엔진 사이에 값이 하나라도 다름 (2:1이어도 다수결로 확정하지 않음) |
| `CONDITIONAL` | 비교 가능한 엔진이 1개이고, 빠진 엔진의 사유가 모두 `SETTING_UNSUPPORTED` |
| `UNVERIFIED` | 그 외 (엔진 실패·누락·시간 미상 경계 모호) |
| `NOT_APPLICABLE` | 시간 미상일 때 시주 |

"비교 가능"은 엔진이 해당 필드를 요청한 설정 그대로 계산했다고 보고한 경우다. 예: lunar-javascript는 `midnight` 관법의 23시대 시주를 계산할 수 없어 `SETTING_UNSUPPORTED`로 빠진다.

## 전체 판정 (위에서부터 먼저 걸리는 것)

1. 사용 가능한 엔진 < 2 → `UNVERIFIABLE` (`INSUFFICIENT_ENGINES`)
2. 핵심 필드 `MISMATCH`, 대운 방향·간지 불일치, (원국 일치 상태에서) 천간 십신 불일치 → `MISMATCH`
3. 음력 변환 `UNVERIFIED`, 핵심 필드 `UNVERIFIED` → `UNVERIFIABLE`
4. 핵심 필드 `CONDITIONAL`, 대운 시작 시점이 허용 범위(12개월) 안에서 다름, 음력 변환 `VERIFIED_BY_INDEPENDENT_SOURCE` → `CONDITIONAL_MATCH`
5. 그 외 → `MATCH`

### 계산 오류와 해석 차이의 구분

| 구분 | 항목 | 처리 |
|---|---|---|
| 계산 값 (오류로 판정) | 4기둥, 대운 순역·간지, 천간 십신 | 불일치 시 `MISMATCH` |
| 관법 차이 (조건부) | 대운 시작 나이(절입일 계산 방식), 자시 처리 미지원 | `CONDITIONAL_MATCH` |
| 집계 방식 차이 (경고) | 오행 개수 | `warnings`에만 기록 |
| 해석 값 (판정 제외) | 신강·신약, 용신 | `interpretiveDifferences`에 출처와 함께 기록, AI에는 "참고값"으로만 전달 |

## 불일치 해소 절차 (`service.ts`)

1. 1차 판정이 `MISMATCH`/`UNVERIFIABLE`이면 기록: 정규화 입력(termTime·pillarTime), 관법, 보정 설정, 엔진 버전
2. 결정적인 로컬 라이브러리는 재계산해도 같으므로, **원격 엔진과 실패한 엔진만** 같은 조건으로 1회 재계산
3. 여전히 해소되지 않으면 해당 필드를 `null`(미확정)로 둔다. 확정 원국(`canonical`)에는 `MATCH`/`CONDITIONAL` 필드만 들어간다.
4. 기록은 `resolutionLog`로 사용자 화면 "교차검증 상세"에 표시된다.

## AI에 넘기는 범위

`prompts.ts`의 `buildSajuPayload`: 확정 4기둥(미확정은 "미확정"), 일간, 띠, 오행 단순 개수, 천간 십신, 검증된 대운, 세운 간지(두 로컬 엔진 일치 시), 검증 상태와 미확정 목록, 관법·보정 여부, 참고값. **생년월일·시각·출생지·이름은 넣지 않는다.**

AI 응답은 Zod 엄격 스키마를 통과해야 하고, 출력에 나온 간지(한자 간지 + "○○ 일주/대운" 형식)가 입력에 준 간지가 아니면 `AI_UNGROUNDED`로 버린다.
