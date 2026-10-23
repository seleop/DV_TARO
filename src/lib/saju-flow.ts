import "server-only";
import { assertCalcAllowed } from "./limits";
import { findCalculationIdByCacheKey, saveCalculation, updateCalculationLabel } from "./repo/records";
import { logUsage } from "./repo/usage";
import { calculateSaju, computeCacheKey, defaultEngines } from "./saju/service";
import type { BirthInput } from "./saju/types";

/**
 * 사주 계산 후 저장. 같은 입력·설정·엔진 버전으로 이미 계산했다면 저장된 결과를 쓴다 (호출 한도도 소모하지 않음).
 * 반환: 계산 ID
 */
export async function computeAndSaveSaju(userId: string, input: BirthInput, label: string | null): Promise<string> {
  const key = computeCacheKey(userId, input, defaultEngines().map((e) => e.getEngineMetadata()));
  const existing = await findCalculationIdByCacheKey(userId, key);
  if (existing) {
    if (label) await updateCalculationLabel(userId, existing, label);
    return existing;
  }
  await assertCalcAllowed(userId);
  const started = performance.now();
  const c = await calculateSaju(userId, input);
  await logUsage({ userId, kind: "calc", ok: true, durationMs: performance.now() - started, errorCode: c.status === "MATCH" ? null : c.status });
  return saveCalculation(userId, input, c, label);
}
