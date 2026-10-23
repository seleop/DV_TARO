import { handler, HttpError, json } from "@/lib/api";
import { revokeInvitation } from "@/lib/repo/users";

export const DELETE = handler({ auth: "admin" }, async ({ user, params }) => {
  if (!(await revokeInvitation(user.id, params.id))) throw new HttpError(404, "NOT_FOUND", "취소할 수 있는 초대가 없습니다.");
  return json({ ok: true });
});
