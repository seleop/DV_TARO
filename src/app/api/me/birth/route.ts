import { z } from "zod";
import { handler, json } from "@/lib/api";
import { deleteCalculation } from "@/lib/repo/records";
import { setPrimaryCalculation } from "@/lib/repo/users";
import { computeAndSaveSaju } from "@/lib/saju-flow";
import { parseBirthInput } from "@/lib/saju/input";

const Body = z.object({ birth: z.unknown() }).strict();

export const maxDuration = 30;

/**
 * 프로필 설정의 "내 출생 정보" 저장.
 * 내 사주(대표 사주)로 지정해 오늘의 운세 등에 쓰고, 출생 정보를 바꾸면 이전 내 사주 기록과 그 해석은 지운다
 * (더 이상 쓰지 않는 출생 정보를 남기지 않기 위함).
 */
export const PUT = handler({ auth: "user" }, async ({ user, body }) => {
  const b = Body.parse(body);
  const id = await computeAndSaveSaju(user, parseBirthInput(b.birth), null);
  await setPrimaryCalculation(user.id, id);
  const previous = user.primaryCalculationId;
  if (previous && previous !== id) await deleteCalculation(user.id, previous);
  return json({ ok: true, calculationId: id });
});
