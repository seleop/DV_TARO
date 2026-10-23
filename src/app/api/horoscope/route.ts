import { z } from "zod";
import { handler, json } from "@/lib/api";
import { generateHoroscope } from "@/lib/ai/interpret";
import { SIGNS } from "@/lib/horoscope/zodiac";
import { listReadings } from "@/lib/repo/records";

const BySign = z.object({ signId: z.enum(SIGNS.map((s) => s.id) as [string, ...string[]]), regenerate: z.boolean().default(false) }).strict();
const ByDate = z
  .object({ month: z.number().int().min(1).max(12), day: z.number().int().min(1).max(31), regenerate: z.boolean().default(false) })
  .strict()
  .refine((v) => v.day <= new Date(Date.UTC(2024, v.month, 0)).getUTCDate(), { message: "존재하지 않는 날짜입니다.", path: ["day"] });

export const GET = handler({ auth: "user" }, async ({ user }) => json({ items: await listReadings(user.id, ["horoscope"]) }));

export const maxDuration = 120;

/** 별자리를 직접 고르거나({signId}), 생일 월·일({month, day})로 정한다. */
export const POST = handler({ auth: "user" }, async ({ user, body }) => {
  const b = (body as { signId?: unknown }).signId !== undefined ? BySign.parse(body) : ByDate.parse(body);
  const target = "signId" in b ? { signId: b.signId } : { month: b.month, day: b.day };
  return json(await generateHoroscope(user.id, target, { regenerate: b.regenerate }));
});
