import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { signedInUserOrNull } from "@/lib/auth/auth-page";
import { safeNextPath } from "@/lib/auth/next-path";
import { getSignupMode } from "@/lib/auth/signup-mode";

export const metadata: Metadata = { title: "로그인" };

/**
 * 요청 시점에 렌더링한다(searchParams 사용). 빌드 때 전체 환경변수를 요구하지 않고,
 * SIGNUP_MODE를 바꾸면 재배포 없이 바로 반영된다.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNextPath((await searchParams).next);
  if (await signedInUserOrNull()) redirect(next);
  return <LoginForm next={next} canSignup={getSignupMode() !== "closed"} />;
}
