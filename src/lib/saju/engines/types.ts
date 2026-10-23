import { isBranch, isStem, parsePillar } from "../ganji";
import type { CoreField, EngineInput, EngineMetadata, NormalizedSaju } from "../types";

export type EngineErrorCode =
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "HTTP_ERROR"
  | "RATE_LIMITED"
  | "INPUT_REJECTED"
  | "INVALID_RESPONSE"
  | "SETTINGS_MISMATCH"
  | "ENGINE_EXCEPTION"
  | "DISABLED";

/** 엔진 오류. message에는 출생 정보나 키를 넣지 않는다. */
export class EngineError extends Error {
  constructor(
    public readonly code: EngineErrorCode,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "EngineError";
  }
}

export interface EngineContext {
  fetchImpl: typeof fetch;
  timeoutMs: number;
  maxRetries: number;
  signal?: AbortSignal;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * 계산 엔진 어댑터.
 * calculate는 엔진 고유 원본 응답(JSON 직렬화 가능)을 반환하고,
 * normalize가 공통 스키마로 바꾸며, validate가 필수 필드와 형식을 검사한다.
 */
export interface SajuEngine<Raw = unknown> {
  getEngineMetadata(): EngineMetadata;
  calculate(input: EngineInput, ctx: EngineContext): Promise<Raw>;
  normalize(raw: Raw, input: EngineInput): NormalizedSaju;
  validate(result: NormalizedSaju, input: EngineInput): ValidationResult;
}

/** 모든 엔진에 공통으로 적용하는 정규화 결과 검증 */
export function validateNormalized(r: NormalizedSaju, input: EngineInput): ValidationResult {
  const errors: string[] = [];
  const required: CoreField[] = input.timeKnown ? ["year", "month", "day", "hour"] : ["year", "month", "day"];
  for (const f of required) {
    const p = r.pillars[f];
    if (!p) {
      if (r.comparability[f]?.comparable !== false) errors.push(`${f} 기둥 누락`);
      continue;
    }
    if (!isStem(p.stem) || !isBranch(p.branch) || !parsePillar(`${p.stem}${p.branch}`)) {
      errors.push(`${f} 기둥 형식 오류`);
    }
  }
  if (!input.timeKnown && r.pillars.hour) errors.push("시간 미상인데 시주가 있음");
  if (r.daewoon) {
    if (r.daewoon.pillars.length < 8) errors.push("대운 간지가 8개 미만");
    if (r.daewoon.pillars.some((p) => !parsePillar(p))) errors.push("대운 간지 형식 오류");
    if (r.daewoon.start && (r.daewoon.start.years < 0 || r.daewoon.start.years > 12)) errors.push("대운 시작 나이 범위 오류");
  }
  if (r.elements) {
    const total = Object.values(r.elements).reduce((a, b) => a + b, 0);
    const expected = input.timeKnown ? 8 : 6;
    if (total !== expected && total !== 8) errors.push(`오행 개수 합계 오류(${total})`);
  }
  return { ok: errors.length === 0, errors };
}

export function sameWallTime(a: EngineInput["termTime"], b: EngineInput["termTime"]): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day && a.hour === b.hour && a.minute === b.minute;
}
