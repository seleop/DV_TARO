import { z } from "zod";
import { handler, HttpError, json } from "@/lib/api";
import { getProfile, setUserRole, setUserStatus } from "@/lib/repo/users";
import { getAuthAdmin } from "@/lib/supabase/admin";

const Body = z.object({ status: z.enum(["active", "disabled"]).optional(), role: z.enum(["user", "admin"]).optional() }).strict();

export const PATCH = handler({ auth: "admin" }, async ({ user, params, body }) => {
  const b = Body.parse(body);
  if (!(await getProfile(params.id))) throw new HttpError(404, "NOT_FOUND", "사용자를 찾을 수 없습니다.");
  try {
    if (b.status) await setUserStatus(getAuthAdmin(), user.id, params.id, b.status);
    if (b.role) await setUserRole(user.id, params.id, b.role);
  } catch (e) {
    throw new HttpError(400, "INVALID_OPERATION", (e as Error).message);
  }
  return json({ ok: true });
});
