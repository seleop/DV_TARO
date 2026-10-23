import "server-only";
import type { User } from "../repo/users";
import { getCurrentUser } from "./session";

/**
 * 로그인·가입 화면용: 이미 로그인했는지 확인한다.
 * 서버 설정 문제로 확인하지 못해도 로그인 화면은 보여야 하므로 오류는 기록만 하고 null로 본다.
 */
export async function signedInUserOrNull(): Promise<User | null> {
  try {
    return await getCurrentUser();
  } catch (e) {
    console.error(`[auth-page] 로그인 상태 확인 실패: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
    return null;
  }
}
