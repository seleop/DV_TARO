import { handler, json } from "@/lib/api";
import { parseBirthInput } from "@/lib/saju/input";
import { calculateSaju } from "@/lib/saju/service";

/**
 * 관리자 진단: 관리자가 직접 입력한 값(예: 테스트용 생년월일)으로 엔진별 결과를 비교한다.
 * 저장하지 않으며, 다른 사용자의 기록을 조회하는 기능이 아니다.
 */
export const POST = handler({ auth: "admin" }, async ({ user, body }) => {
  const input = parseBirthInput((body as { birth?: unknown }).birth);
  const c = await calculateSaju(`admin-check:${user.id}`, input);
  return json({
    status: c.status,
    reasons: c.report.reasons,
    fields: c.report.fields,
    daewoon: c.report.daewoon,
    tenGods: c.report.tenGods,
    warnings: c.report.warnings,
    interpretiveDifferences: c.report.interpretiveDifferences,
    engines: c.report.engines,
    engineMeta: c.engines,
    outcomes: c.outcomes.map((o) => ({
      engine: o.engine,
      ok: o.ok,
      errorCode: o.errorCode ?? null,
      validationErrors: o.validationErrors ?? [],
      applied: o.result?.applied ?? null,
      comparability: o.result?.comparability ?? null,
      daewoon: o.result?.daewoon ?? null,
    })),
    time: c.time,
    lunar: c.lunar,
    resolutionLog: c.resolutionLog,
  });
});
