import { z } from "zod";
import { handler, HttpError, json } from "@/lib/api";
import { generateDailyReading } from "@/lib/ai/interpret";
import { hrumAllowedFor } from "@/lib/privacy-consent";
import { getCalculation } from "@/lib/repo/records";

const Body = z.object({ regenerate: z.boolean().default(false) }).strict();

export const maxDuration = 120;

export const POST = handler({ auth: "user" }, async ({ user, params, body }) => {
  const b = Body.parse(body);
  const calc = await getCalculation(user.id, params.id);
  if (!calc) throw new HttpError(404, "NOT_FOUND", "기록을 찾을 수 없습니다.");
  return json(await generateDailyReading(user.id, calc, { regenerate: b.regenerate, useHrum: hrumAllowedFor(user) }));
});
