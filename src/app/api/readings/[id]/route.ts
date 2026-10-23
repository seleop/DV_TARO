import { handler, HttpError, json } from "@/lib/api";
import { deleteReading } from "@/lib/repo/records";

export const DELETE = handler({ auth: "user" }, async ({ user, params }) => {
  if (!(await deleteReading(user.id, params.id))) throw new HttpError(404, "NOT_FOUND", "기록을 찾을 수 없습니다.");
  return json({ ok: true });
});
