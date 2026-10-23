import { pillarToString } from "./ganji";
import type { LunarConversionStatus } from "./lunar";
import { CORE_FIELDS, type CoreField, type NormalizedSaju, type VerificationStatus } from "./types";

/**
 * 교차검증 판정 규칙. 순수 함수이며 규칙이 바뀌면 버전을 올린다.
 *
 * 필드 판정
 *  - MATCH       : 비교 가능한 엔진이 2개 이상이고 값이 모두 같음
 *  - MISMATCH    : 비교 가능한 엔진 사이에 값이 하나라도 다름 (다수결로 덮지 않음)
 *  - CONDITIONAL : 비교 가능한 엔진이 1개뿐이고, 나머지는 모두 "설정 미지원"으로 빠짐
 *  - UNVERIFIED  : 그 외 (엔진 실패·누락·시간 미상 경계 모호 등으로 근거 부족)
 *  - NOT_APPLICABLE : 시간 미상일 때 시주
 *
 * 전체 판정 (위에서부터 먼저 걸리는 것)
 *  1. 사용 가능한 엔진 < 2                                   → UNVERIFIABLE
 *  2. 핵심 필드 MISMATCH / 대운 방향·간지 불일치 / 천간 십신 불일치 → MISMATCH
 *  3. 음력 변환 미확정 / 핵심 필드 UNVERIFIED                 → UNVERIFIABLE
 *  4. 핵심 필드 CONDITIONAL / 대운 시작 시점이 관법 허용 범위 내에서 다름 /
 *     음력 변환이 한·중 차이로 독립 출처에 의해 확정됨          → CONDITIONAL_MATCH
 *  5. 그 외                                                  → MATCH
 *
 * 신강·신약, 용신 같은 해석 값의 차이는 판정에 쓰지 않고 interpretiveDifferences에만 남긴다.
 * 오행 개수 차이는 집계 방식(지장간 포함 여부 등)이 다를 수 있어 경고로만 남긴다.
 */
export const VERIFY_RULES_VERSION = "2026-10-23.1";

export type FieldStatus = "MATCH" | "MISMATCH" | "CONDITIONAL" | "UNVERIFIED" | "NOT_APPLICABLE";

export type ReasonCode =
  | "INSUFFICIENT_ENGINES"
  | "CORE_MISMATCH"
  | "DAEWOON_MISMATCH"
  | "TEN_GOD_MISMATCH"
  | "CORE_UNVERIFIED"
  | "LUNAR_CONVERSION_UNVERIFIED"
  | "SETTING_DIFFERENCE"
  | "DAEWOON_START_CONVENTION"
  | "LUNAR_CALENDAR_SYSTEM_DIFFERENCE"
  | "BIRTH_TIME_REQUIRED_FOR_BOUNDARY";

export interface EngineOutcome {
  engine: string;
  engineVersion: string;
  ok: boolean;
  errorCode?: string;
  validationErrors?: string[];
  result?: NormalizedSaju;
  durationMs: number;
}

export interface FieldVerdict {
  status: FieldStatus;
  agreedValue: string | null;
  values: Record<string, string | null>;
  compared: string[];
  excluded: Array<{ engine: string; reason: string }>;
}

export interface DaewoonVerdict {
  status: FieldStatus;
  forward: boolean | null;
  pillars: string[] | null;
  start: { years: number; months: number; days: number } | null;
  startRange: { minMonths: number; maxMonths: number } | null;
  compared: string[];
  note?: string;
}

export interface VerificationReport {
  rulesVersion: string;
  status: VerificationStatus;
  reasons: ReasonCode[];
  fields: Record<CoreField, FieldVerdict>;
  daewoon: DaewoonVerdict;
  tenGods: { status: FieldStatus; agreed: { year: string; month: string; hour: string | null } | null };
  warnings: string[];
  interpretiveDifferences: Array<{ engine: string; strength?: string; yongsin?: string }>;
  engines: Array<{ engine: string; engineVersion: string; ok: boolean; errorCode?: string; durationMs: number }>;
}

export interface VerifyOptions {
  timeKnown: boolean;
  hasGender: boolean;
  lunarStatus: LunarConversionStatus | null;
  /** 시간 미상일 때 하루 안에서 값이 바뀌는(절입·자시 경계) 필드 */
  ambiguousFields?: CoreField[];
  /** 대운 시작 시점 허용 차이(개월). 이 범위 안의 차이는 관법 차이로 본다. */
  daewoonStartToleranceMonths?: number;
}

function verdictForField(field: CoreField, usable: EngineOutcome[], opts: VerifyOptions): FieldVerdict {
  const values: Record<string, string | null> = {};
  const compared: string[] = [];
  const excluded: FieldVerdict["excluded"] = [];
  for (const o of usable) {
    const r = o.result!;
    const v = pillarToString(r.pillars[field]);
    values[o.engine] = v;
    const c = r.comparability[field];
    if (c.comparable && v) compared.push(o.engine);
    else excluded.push({ engine: o.engine, reason: c.reason ?? "MISSING" });
  }
  if (field === "hour" && !opts.timeKnown) return { status: "NOT_APPLICABLE", agreedValue: null, values, compared: [], excluded };
  if (opts.ambiguousFields?.includes(field)) return { status: "UNVERIFIED", agreedValue: null, values, compared, excluded };
  const distinct = new Set(compared.map((e) => values[e]));
  if (distinct.size > 1) return { status: "MISMATCH", agreedValue: null, values, compared, excluded };
  if (compared.length >= 2) return { status: "MATCH", agreedValue: values[compared[0]], values, compared, excluded };
  if (compared.length === 1 && excluded.length > 0 && excluded.every((x) => x.reason === "SETTING_UNSUPPORTED")) {
    return { status: "CONDITIONAL", agreedValue: values[compared[0]], values, compared, excluded };
  }
  return { status: "UNVERIFIED", agreedValue: null, values, compared, excluded };
}

const months = (s: { years: number; months: number }) => s.years * 12 + s.months;

function verdictForDaewoon(usable: EngineOutcome[], opts: VerifyOptions): DaewoonVerdict {
  const empty = { forward: null, pillars: null, start: null, startRange: null };
  if (!opts.hasGender) return { status: "NOT_APPLICABLE", ...empty, compared: [], note: "성별 미입력" };
  if (!opts.timeKnown) return { status: "NOT_APPLICABLE", ...empty, compared: [], note: "출생 시각 미상으로 대운 시작 시점을 정할 수 없음" };
  const providers = usable.filter((o) => o.result!.comparability.daewoon.comparable && o.result!.daewoon);
  const compared = providers.map((o) => o.engine);
  if (providers.length < 2) return { status: "UNVERIFIED", ...empty, compared, note: "대운을 제공한 엔진이 2개 미만" };
  const dws = providers.map((o) => o.result!.daewoon!);
  const sameDir = dws.every((d) => d.forward === dws[0].forward);
  const samePillars = dws.every((d) => d.pillars.join() === dws[0].pillars.join());
  if (!sameDir || !samePillars) return { status: "MISMATCH", ...empty, compared, note: !sameDir ? "순행·역행 불일치" : "대운 간지 불일치" };
  const starts = dws.map((d) => d.start).filter((s): s is NonNullable<typeof s> => !!s);
  if (starts.length < 2) {
    return { status: "MATCH", forward: dws[0].forward, pillars: dws[0].pillars, start: null, startRange: null, compared, note: "대운 시작 시점은 단일 출처" };
  }
  const ms = starts.map(months);
  const min = Math.min(...ms);
  const max = Math.max(...ms);
  const tol = opts.daewoonStartToleranceMonths ?? 12;
  const base = { forward: dws[0].forward, pillars: dws[0].pillars, compared };
  if (max - min === 0) return { status: "MATCH", ...base, start: starts[0], startRange: null };
  if (max - min <= tol) {
    return {
      status: "CONDITIONAL",
      ...base,
      start: null,
      startRange: { minMonths: min, maxMonths: max },
      note: "대운 시작 시점이 엔진별 절입일 계산 방식 차이로 다름",
    };
  }
  return { status: "MISMATCH", ...empty, compared, note: "대운 시작 시점 차이가 허용 범위를 넘음" };
}

export function crossValidate(outcomes: EngineOutcome[], opts: VerifyOptions): VerificationReport {
  const usable = outcomes.filter((o) => o.ok && o.result && (o.validationErrors?.length ?? 0) === 0);
  const reasons = new Set<ReasonCode>();
  const warnings: string[] = [];

  const fields = Object.fromEntries(CORE_FIELDS.map((f) => [f, verdictForField(f, usable, opts)])) as Record<CoreField, FieldVerdict>;
  const daewoon = verdictForDaewoon(usable, opts);

  // 천간 십신: 일간과 각 천간으로 결정되는 값이라 원국이 같으면 반드시 같아야 한다.
  const tgProviders = usable.filter((o) => o.result!.comparability.tenGods.comparable && o.result!.stemTenGods);
  let tenGods: VerificationReport["tenGods"] = { status: "UNVERIFIED", agreed: null };
  if (tgProviders.length >= 2) {
    const tgs = tgProviders.map((o) => o.result!.stemTenGods!);
    const corePillarsAgree = fields.year.status === "MATCH" && fields.month.status === "MATCH" && fields.day.status === "MATCH";
    const ymSame = tgs.every((t) => t.year === tgs[0].year && t.month === tgs[0].month);
    // 시주 십신은 시주를 낸 엔진끼리만 비교한다 (설정 미지원으로 시주를 뺀 엔진 제외).
    const hourTgs = tgs.map((t) => t.hour).filter((h): h is NonNullable<typeof h> => !!h);
    const hourSame = new Set(hourTgs).size <= 1;
    const hourUsable = fields.hour.status === "MATCH" || fields.hour.status === "CONDITIONAL";
    if (ymSame && hourSame) {
      tenGods = { status: "MATCH", agreed: { year: tgs[0].year, month: tgs[0].month, hour: hourUsable ? (hourTgs[0] ?? null) : null } };
    } else if (corePillarsAgree && (!ymSame || hourUsable)) {
      tenGods = { status: "MISMATCH", agreed: null };
    }
  }

  // 오행 개수: 엔진이 직접 제공한 값끼리, 그리고 합의된 원국 기준 단순 개수와 비교 (경고만)
  for (const o of usable) {
    const el = o.result!.elements;
    if (!el || !o.result!.comparability.elements.comparable) continue;
    const allAgreed = CORE_FIELDS.every((f) => fields[f].status === "MATCH" || fields[f].status === "NOT_APPLICABLE");
    if (!allAgreed) continue;
    const pillarsText = CORE_FIELDS.map((f) => fields[f].agreedValue).filter(Boolean).join("");
    const total = Object.values(el).reduce((a, b) => a + b, 0);
    if (total !== [...pillarsText].length) warnings.push(`${o.engine}: 오행 개수 합계(${total})가 원국 글자 수와 다름`);
  }

  const interpretiveDifferences = usable
    .filter((o) => o.result!.interpretive && (o.result!.interpretive.strength || o.result!.interpretive.yongsin))
    .map((o) => ({ engine: o.engine, ...o.result!.interpretive! }));

  const applicable = CORE_FIELDS.filter((f) => fields[f].status !== "NOT_APPLICABLE");
  let status: VerificationStatus;
  if (usable.length < 2) {
    reasons.add("INSUFFICIENT_ENGINES");
    status = "UNVERIFIABLE";
  } else if (
    applicable.some((f) => fields[f].status === "MISMATCH") ||
    daewoon.status === "MISMATCH" ||
    tenGods.status === "MISMATCH"
  ) {
    if (applicable.some((f) => fields[f].status === "MISMATCH")) reasons.add("CORE_MISMATCH");
    if (daewoon.status === "MISMATCH") reasons.add("DAEWOON_MISMATCH");
    if (tenGods.status === "MISMATCH") reasons.add("TEN_GOD_MISMATCH");
    status = "MISMATCH";
  } else if (opts.lunarStatus === "UNVERIFIED" || applicable.some((f) => fields[f].status === "UNVERIFIED")) {
    if (opts.lunarStatus === "UNVERIFIED") reasons.add("LUNAR_CONVERSION_UNVERIFIED");
    if (applicable.some((f) => fields[f].status === "UNVERIFIED")) reasons.add("CORE_UNVERIFIED");
    if (opts.ambiguousFields?.length) reasons.add("BIRTH_TIME_REQUIRED_FOR_BOUNDARY");
    status = "UNVERIFIABLE";
  } else if (
    applicable.some((f) => fields[f].status === "CONDITIONAL") ||
    daewoon.status === "CONDITIONAL" ||
    opts.lunarStatus === "VERIFIED_BY_INDEPENDENT_SOURCE"
  ) {
    if (applicable.some((f) => fields[f].status === "CONDITIONAL")) reasons.add("SETTING_DIFFERENCE");
    if (daewoon.status === "CONDITIONAL") reasons.add("DAEWOON_START_CONVENTION");
    if (opts.lunarStatus === "VERIFIED_BY_INDEPENDENT_SOURCE") reasons.add("LUNAR_CALENDAR_SYSTEM_DIFFERENCE");
    status = "CONDITIONAL_MATCH";
  } else {
    status = "MATCH";
  }

  return {
    rulesVersion: VERIFY_RULES_VERSION,
    status,
    reasons: [...reasons],
    fields,
    daewoon,
    tenGods,
    warnings,
    interpretiveDifferences,
    engines: outcomes.map((o) => ({
      engine: o.engine,
      engineVersion: o.engineVersion,
      ok: o.ok && (o.validationErrors?.length ?? 0) === 0,
      errorCode: o.errorCode ?? (o.validationErrors?.length ? "VALIDATION_FAILED" : undefined),
      durationMs: o.durationMs,
    })),
  };
}
