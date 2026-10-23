import { z } from "zod";
import { handler, json } from "@/lib/api";
import { getCalculation, listCalculations } from "@/lib/repo/records";
import { setPrimaryCalculation } from "@/lib/repo/users";
import { computeAndSaveSaju } from "@/lib/saju-flow";
import { parseBirthInput } from "@/lib/saju/input";
import { sajuView } from "@/lib/views";

const Body = z
  .object({ label: z.string().trim().max(30).nullable().default(null), makePrimary: z.boolean().default(false), birth: z.unknown() })
  .strict();

export const GET = handler({ auth: "user" }, async ({ user }) => json({ items: await listCalculations(user.id), primaryCalculationId: user.primaryCalculationId }));

export const maxDuration = 30;

/** 다른 사람(가족·친구 등)의 사주 계산. 내 사주는 프로필 설정(/api/me/birth)에서 관리한다. */
export const POST = handler({ auth: "user" }, async ({ user, body }) => {
  const b = Body.parse(body);
  const id = await computeAndSaveSaju(user.id, parseBirthInput(b.birth), b.label || null);
  if (b.makePrimary) await setPrimaryCalculation(user.id, id);
  return json({ calculation: sajuView((await getCalculation(user.id, id))!) }, 201);
});
