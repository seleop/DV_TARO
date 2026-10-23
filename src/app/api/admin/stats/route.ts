import { handler, json } from "@/lib/api";
import { MODEL_PRICING } from "@/lib/ai/cost";
import { PROMPT_VERSIONS } from "@/lib/ai/prompts";
import { getConfig } from "@/lib/config";
import { budgetStatus } from "@/lib/limits";
import { aiUsageStats, engineStats, startOfMonthKst } from "@/lib/repo/usage";
import { defaultEngines } from "@/lib/saju/service";
import { VERIFY_RULES_VERSION } from "@/lib/saju/verify";

/** 관리자 통계: 집계 정보만 (개인 사주·질문·해석 내용 없음) */
export const GET = handler({ auth: "admin" }, async ({ req }) => {
  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get("days") ?? 30) || 30));
  const since = Date.now() - days * 86_400_000;
  const cfg = getConfig();
  const model = cfg.AI_PROVIDER === "mock" ? "mock" : cfg.AI_MODEL;
  return json({
    periodDays: days,
    ai: await aiUsageStats(since),
    aiThisMonth: (await aiUsageStats(startOfMonthKst())).totals,
    budget: await budgetStatus(),
    engines: await engineStats(since),
    versions: {
      engines: defaultEngines().map((e) => e.getEngineMetadata()),
      prompts: PROMPT_VERSIONS,
      verifyRules: VERIFY_RULES_VERSION,
      aiProvider: cfg.AI_PROVIDER,
      aiModel: model,
      aiEffort: cfg.AI_EFFORT,
      pricing: MODEL_PRICING[model] ?? null,
    },
    limits: {
      aiPerUserPerDay: cfg.LIMIT_AI_PER_USER_PER_DAY,
      aiPerUserPerMinute: cfg.LIMIT_AI_PER_USER_PER_MINUTE,
      calcPerUserPerDay: cfg.LIMIT_CALC_PER_USER_PER_DAY,
    },
  });
});
