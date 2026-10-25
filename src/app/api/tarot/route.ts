import { z } from "zod";
import { handler, json } from "@/lib/api";
import { generateTarotReading } from "@/lib/ai/interpret";
import { listReadings } from "@/lib/repo/records";
import { drawCards, validPicks } from "@/lib/tarot/deck";

const Body = z
  .object({
    question: z.string().trim().min(2, "질문을 2자 이상 입력하세요.").max(300, "질문은 300자 이내로 입력하세요."),
    spread: z.enum(["one", "three", "choice"]),
    /** 사용자가 펼친 카드(뒷면) 중 고른 자리, 위치 순서대로. 없으면 서버가 바로 뽑는다 */
    picks: z.array(z.number().int()).max(5).optional(),
  })
  .strict()
  .refine((b) => !b.picks || validPicks(b.spread, b.picks), { message: "고른 카드 수나 자리가 올바르지 않습니다.", path: ["picks"] });

export const GET = handler({ auth: "user" }, async ({ user }) => json({ items: await listReadings(user.id, ["tarot"]) }));

export const maxDuration = 120;

export const POST = handler({ auth: "user", maxBodyBytes: 4096 }, async ({ user, body }) => {
  const b = Body.parse(body);
  return json(await generateTarotReading(user.id, b.question, b.spread, () => drawCards(b.spread, undefined, b.picks)), 201);
});
