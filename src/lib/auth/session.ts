import "server-only";
import { redirect } from "next/navigation";
import { getProfile, touchLastSeen, type User } from "../repo/users";
import { createSupabaseServerClient } from "../supabase/server";

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

/** 서버 컴포넌트용: 로그인하지 않았으면 /login으로 보낸다. */
export async function requirePageUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requirePageAdmin(): Promise<User> {
  const u = await requirePageUser();
  if (u.role !== "admin") redirect("/");
  return u;
}
