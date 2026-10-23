import { timingSafeEqual } from "node:crypto";
import { getConfig } from "@/lib/config";
import { purgeOldData } from "@/lib/repo/usage";

/**
 * 보존 기간이 지난 데이터 정리. Vercel Cron이 호출한다 (vercel.json).
 * Vercel은 CRON_SECRET이 설정되어 있으면 `Authorization: Bearer <CRON_SECRET>` 헤더를 붙여 호출한다.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
    return Response.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  const r = await purgeOldData(getConfig().USAGE_LOG_RETENTION_DAYS);
  return Response.json({ ok: true, deleted: r });
}
