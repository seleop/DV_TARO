import { z } from "zod";
import { handler, HttpError, json } from "@/lib/api";
import { latestSajuReading } from "@/lib/ai/interpret";
import { hrumAllowedFor } from "@/lib/privacy-consent";
import { deleteCalculation, getCalculation } from "@/lib/repo/records";
import { setPrimaryCalculation } from "@/lib/repo/users";
import { sajuView } from "@/lib/views";

export const GET = handler({ auth: "user" }, async ({ user, params }) => {
  const calc = await getCalculation(user.id, params.id);
  if (!calc) throw new HttpError(404, "NOT_FOUND", "기록을 찾을 수 없습니다.");
  return json({ calculation: sajuView(calc), reading: await latestSajuReading(user.id, calc, hrumAllowedFor(user)), isPrimary: user.primaryCalculationId === calc.id });
});

const Patch = z.object({ primary: z.literal(true) }).strict();

/** 대표 사주(오늘의 운세 기준)로 지정 */
export const PATCH = handler({ auth: "user" }, async ({ user, params, body }) => {
  Patch.parse(body);
  if (!(await setPrimaryCalculation(user.id, params.id))) throw new HttpError(404, "NOT_FOUND", "기록을 찾을 수 없습니다.");
  return json({ ok: true });
});

export const DELETE = handler({ auth: "user" }, async ({ user, params }) => {
  if (!(await deleteCalculation(user.id, params.id))) throw new HttpError(404, "NOT_FOUND", "기록을 찾을 수 없습니다.");
  return json({ ok: true });
});
