import "server-only";
import { getConfig } from "./config";
import { countUserUsage, startOfDayKst, startOfMonthKst, totalCostSince } from "./repo/usage";

export class LimitError extends Error {
  constructor(
    public readonly code: "RATE_LIMIT_MINUTE" | "RATE_LIMIT_DAY" | "CALC_LIMIT_DAY" | "BUDGET_EXCEEDED",
    message: string,
  ) {
    super(message);
    this.name = "LimitError";
  }
}

/** AI 호출 전 사용자별 호출 제한과 전체 월 예산을 확인한다 (DB 기준이라 서버리스 인스턴스 간에도 공유됨). */
export async function assertAiAllowed(userId: string, worstCaseUsd: number, at = Date.now()) {
  const cfg = getConfig();
  if ((await countUserUsage(userId, "ai", at - 60_000)) >= cfg.LIMIT_AI_PER_USER_PER_MINUTE) {
    throw new LimitError("RATE_LIMIT_MINUTE", "요청이 너무 잦습니다. 1분 뒤에 다시 시도해 주세요.");
  }
  if ((await countUserUsage(userId, "ai", startOfDayKst(at))) >= cfg.LIMIT_AI_PER_USER_PER_DAY) {
    throw new LimitError("RATE_LIMIT_DAY", `오늘 AI 해석 한도(${cfg.LIMIT_AI_PER_USER_PER_DAY}회)를 모두 썼습니다. 내일 다시 이용해 주세요.`);
  }
  const spent = await totalCostSince(startOfMonthKst(at));
  if (spent + worstCaseUsd > cfg.BUDGET_MONTHLY_USD) {
    throw new LimitError("BUDGET_EXCEEDED", "이번 달 서비스 전체 AI 예산을 모두 사용했습니다. 관리자에게 문의해 주세요.");
  }
}

export async function assertCalcAllowed(userId: string, at = Date.now()) {
  const cfg = getConfig();
  if ((await countUserUsage(userId, "calc", startOfDayKst(at))) >= cfg.LIMIT_CALC_PER_USER_PER_DAY) {
    throw new LimitError("CALC_LIMIT_DAY", `오늘 사주 계산 한도(${cfg.LIMIT_CALC_PER_USER_PER_DAY}회)를 모두 썼습니다.`);
  }
}

export async function budgetStatus(at = Date.now()) {
  const cfg = getConfig();
  const spent = await totalCostSince(startOfMonthKst(at));
  return { monthlyBudgetUsd: cfg.BUDGET_MONTHLY_USD, spentUsdEst: spent, remainingUsdEst: Math.max(0, cfg.BUDGET_MONTHLY_USD - spent) };
}
