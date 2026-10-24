import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getProfile, touchLastSeen, type User } from "../repo/users";
import { createSupabaseServerClient } from "../supabase/server";
import { isBirthOptionalPath, loginHref, PATH_HEADER } from "./next-path";

/**
 * 현재 사용자. Supabase JWT를 getClaims()로 검증하고, 프로필이 활성 상태일 때만 반환한다.
 * (관리자가 비활성화하면 JWT가 남아 있어도 즉시 차단된다.)
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const { sub } = await supabase.auth.getClaims();
  if (!sub) return null;
  const user = await getProfile(sub);
  if (!user || user.status !== "active") return null;
  void touchLastSeen(user.id).catch(() => undefined);
  return user;
}

/**
 * 서버 컴포넌트용: 로그인하지 않았으면 /login?next=<지금 경로>로 보낸다.
 * 생년월일을 아직 입력하지 않았으면 /start(우주 배경의 출생 정보 단계)로 보낸다(가입에 이어지는 필수 단계).
 * 경로는 proxy.ts가 넣는 요청 헤더에서 읽고, 없으면(프록시 미적용) 생년월일 검사를 건너뛴다.
 */
export async function requirePageUser(): Promise<User> {
  const path = (await headers()).get(PATH_HEADER);
  const u = await getCurrentUser();
  if (!u) redirect(loginHref(path ?? "/"));
  if (!u.primaryCalculationId && path && !isBirthOptionalPath(path)) redirect("/start");
  return u;
}

export async function requirePageAdmin(): Promise<User> {
  const u = await requirePageUser();
  if (u.role !== "admin") redirect("/");
  return u;
}
