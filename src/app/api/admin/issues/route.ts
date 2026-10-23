import { handler, json } from "@/lib/api";
import { recentVerificationIssues } from "@/lib/repo/usage";

/** 최근 검증 실패 목록 (사용자·출생 정보·간지 값 없이 상태·사유·엔진 오류만) */
export const GET = handler({ auth: "admin" }, async () => json({ items: await recentVerificationIssues(50) }));
