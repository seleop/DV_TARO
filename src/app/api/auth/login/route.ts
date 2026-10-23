import { z } from "zod";
import { checkLoginAttempts, clearLoginFailures, clientIp, handler, json, recordLoginFailure } from "@/lib/api";
import { sha256 } from "@/lib/crypto";
import { AuthError, getProfile, promoteIfConfiguredAdmin } from "@/lib/repo/users";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const Body = z.object({ email: z.string().trim().toLowerCase().max(120), password: z.string().max(200) }).strict();

export const POST = handler({ auth: "none" }, async ({ req, body }) => {
  const b = Body.parse(body);
  const key = sha256(`${clientIp(req)}|${b.email}`);
  checkLoginAttempts(key);
  const supabase = await createSupabaseServerClient();
  const { userId } = await supabase.auth.signInWithPassword(b.email, b.password);
  if (!userId) {
    recordLoginFailure(key);
    // 계정 존재 여부를 드러내지 않도록 같은 메시지를 쓴다.
    throw new AuthError("INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다.");
  }
  const found = await getProfile(userId);
  if (!found || found.status !== "active") {
    await supabase.auth.signOut();
    throw new AuthError("DISABLED", "사용할 수 없는 계정입니다. 관리자에게 문의하세요.");
  }
  clearLoginFailures(key);
  const profile = await promoteIfConfiguredAdmin(found);
  return json({ user: { id: profile.id, displayName: profile.displayName, role: profile.role } });
});
