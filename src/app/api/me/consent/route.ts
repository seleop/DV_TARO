import { z } from "zod";
import { PRIVACY_CONSENT } from "@/config/privacy";
import { handler, json } from "@/lib/api";
import { recordPrivacyConsent } from "@/lib/repo/users";

/** 바뀐 개인정보 수집·이용 고지에 다시 동의 (화면에 보여 준 버전과 지금 버전이 같아야 기록한다) */
const Body = z.object({ version: z.literal(PRIVACY_CONSENT.version, { error: "안내 내용이 바뀌었어요. 화면을 새로 고친 뒤 다시 확인해 주세요." }) }).strict();

export const POST = handler({ auth: "user" }, async ({ user, body }) => {
  const b = Body.parse(body);
  await recordPrivacyConsent(user.id, b.version);
  return json({ ok: true, version: b.version });
});
