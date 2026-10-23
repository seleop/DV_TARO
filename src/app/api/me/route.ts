import { z } from "zod";
import { handler, HttpError, json } from "@/lib/api";
import { getConfig } from "@/lib/config";
import { deleteAllUserRecords } from "@/lib/repo/records";
import { countUserUsage, startOfDayKst } from "@/lib/repo/usage";
import { deleteUser, updateDisplayName } from "@/lib/repo/users";
import { getAuthAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const GET = handler({ auth: "user" }, async ({ user }) => {
  const cfg = getConfig();
  return json({
    user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, primaryCalculationId: user.primaryCalculationId },
    limits: {
      aiPerDay: cfg.LIMIT_AI_PER_USER_PER_DAY,
      aiUsedToday: await countUserUsage(user.id, "ai", startOfDayKst()),
      calcPerDay: cfg.LIMIT_CALC_PER_USER_PER_DAY,
      calcUsedToday: await countUserUsage(user.id, "calc", startOfDayKst()),
    },
    aiProvider: cfg.AI_PROVIDER,
  });
});

const PatchBody = z.object({ displayName: z.string().trim().min(1, "닉네임을 입력하세요.").max(20, "닉네임은 20자 이하여야 해요.") }).strict();

/** 프로필 설정: 닉네임 변경 */
export const PATCH = handler({ auth: "user" }, async ({ user, body }) => {
  const b = PatchBody.parse(body);
  await updateDisplayName(user.id, b.displayName);
  return json({ ok: true });
});

const DeleteBody = z.object({ password: z.string().min(1).max(200), confirm: z.literal("계정 삭제") }).strict();

/** 계정 삭제: 비밀번호를 다시 확인한 뒤 계정과 모든 기록을 지운다. */
export const POST = handler({ auth: "user" }, async ({ user, body }) => {
  const b = DeleteBody.parse(body);
  const supabase = await createSupabaseServerClient();
  const { userId } = await supabase.auth.signInWithPassword(user.email, b.password);
  if (userId !== user.id) throw new HttpError(401, "INVALID_CREDENTIALS", "비밀번호가 올바르지 않습니다.");
  await deleteAllUserRecords(user.id);
  await deleteUser(getAuthAdmin(), user.id);
  await supabase.auth.signOut();
  return json({ ok: true });
});
