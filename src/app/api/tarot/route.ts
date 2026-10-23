import { z } from "zod";
import { handler, json } from "@/lib/api";
import { generateTarotReading } from "@/lib/ai/interpret";
import { listReadings } from "@/lib/repo/records";

const Body = z
  .object({
    question: z.string().trim().min(2, "질문을 2자 이상 입력하세요.").max(300, "질문은 300자 이내로 입력하세요."),
    spread: z.enum(["one", "three", "choice"]),
  })
  .strict();

export const GET = handler({ auth: "user" }, async ({ user }) => json({ items: await listReadings(user.id, ["tarot"]) }));

export const maxDuration = 120;

export const POST = handler({ auth: "user", maxBodyBytes: 4096 }, async ({ user, body }) => {
  const b = Body.parse(body);
  return json(await generateTarotReading(user.id, b.question, b.spread), 201);
});
