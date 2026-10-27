import "server-only";
import { assertCalcAllowed } from "./limits";
import { findCalculationIdByCacheKey, saveCalculation, updateCalculationLabel } from "./repo/records";
import { logUsage } from "./repo/usage";
import { hrumAllowedFor } from "./privacy-consent";
import { calculateSaju, computeCacheKey, defaultEngines } from "./saju/service";
import type { BirthInput } from "./saju/types";

/**
 * 사주 계산 후 저장. 같은 입력·설정·엔진 버전으로 이미 계산했다면 저장된 결과를 쓴다 (호출 한도도 소모하지 않음).
 * 원국은 흐름(HRUM) 단일 출처 — 흐름 전송을 알린 개인정보 고지에 동의한 사용자만, 아니면 앱 내장 엔진.
 * 반환: 계산 ID
 */
export async function computeAndSaveSaju(user: { id: string; privacyVersion: string | null }, input: BirthInput, label: string | null): Promise<string> {
  const userId = user.id;
  const useHrum = hrumAllowedFor(user);
  const key = computeCacheKey(userId, input, defaultEngines(useHrum).map((e) => e.getEngineMetadata()));
  const existing = await findCalculationIdByCacheKey(userId, key);
  if (existing) {
    if (label) await updateCalculationLabel(userId, existing, label);
    return existing;
  }
  await assertCalcAllowed(userId);
  const started = performance.now();
  const c = await calculateSaju(userId, input, { useHrum });
  await logUsage({ userId, kind: "calc", ok: true, durationMs: performance.now() - started, errorCode: c.status === "MATCH" ? null : c.status });
  return saveCalculation(userId, input, c, label);
}
