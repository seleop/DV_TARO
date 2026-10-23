import { handler, json } from "@/lib/api";
import { deleteAllUserRecords } from "@/lib/repo/records";

/** 출생 정보·사주 계산·운세 기록 전체 삭제 (계정은 유지). 캐시는 DB에만 있으므로 함께 사라진다. */
export const DELETE = handler({ auth: "user" }, async ({ user }) => {
  const r = await deleteAllUserRecords(user.id);
  return json({ ok: true, deleted: r });
});
