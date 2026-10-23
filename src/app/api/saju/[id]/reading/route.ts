import { z } from "zod";
import { handler, HttpError, json } from "@/lib/api";
import { FOCUS_OPTIONS, generateSajuReading } from "@/lib/ai/interpret";
import { getCalculation } from "@/lib/repo/records";

const Body = z
  .object({
    focus: z.array(z.enum(FOCUS_OPTIONS)).max(FOCUS_OPTIONS.length).default([]),
    targetYear: z.number().int().min(2000).max(2100).optional(),
  })
  .strict();

export const maxDuration = 120;

/** AI 해석 생성. 다시 호출하면 새 해석을 만든다(재생성). */
export const POST = handler({ auth: "user" }, async ({ user, params, body }) => {
  const b = Body.parse(body);
  const calc = await getCalculation(user.id, params.id);
  if (!calc) throw new HttpError(404, "NOT_FOUND", "기록을 찾을 수 없습니다.");
  const year = b.targetYear ?? new Date(Date.now() + 9 * 3600_000).getUTCFullYear();
  const reading = await generateSajuReading(user.id, calc, { focus: b.focus, targetYear: year });
  return json({ reading }, 201);
});
